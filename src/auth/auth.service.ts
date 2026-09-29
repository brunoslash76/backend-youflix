import { BadRequestException, HttpException, Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from 'bcrypt';
import { FastifyReply } from 'fastify';
import { randomUUID } from "node:crypto";
import { Repository } from "typeorm";
import { config } from "../config/index.js";
import { MailerService } from "../mailer/mailer.service.js";
import { User } from "../user/entities/user.entity.js";
import { RegisterDto } from "./dto/register.dto.js";
import { Tokens } from "./entities/tokens.entity.js";
import { clearAuthCookies, setAuthCookies } from "./utils/auth-cookies.util.js";

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Tokens)
    private tokensRepository: Repository<Tokens>,
    private mailerService: MailerService,
  ) { }

  async register(registerDto: RegisterDto): Promise<{ success: boolean }> {
    try {
      if (registerDto.password !== registerDto.passwordConfirmation) throw new BadRequestException('Password does not match the password confirmation');
      const existingUser = await this.usersRepository.findOneBy({ email: registerDto.email, phone: registerDto.phone });

      if (existingUser) throw new BadRequestException('User already exists')

      if (registerDto.password !== registerDto.passwordConfirmation) throw new Error('Passwords do not match');

      const encryptedPassword = await bcrypt.hash(registerDto.password, 10);
      const newUser = this.usersRepository.create({
        ...registerDto,
        password: encryptedPassword,
        isActive: false
      });
      // TODO: Add email verification here or SMS verification
      const savedUser = await this.usersRepository.save(newUser);
      await this.mailerService.sendAccountActivationEmail(savedUser);
      return { success: true }
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error
      console.error(String(error));
      throw new InternalServerErrorException('An error occurred while registering the user');
    }
  }

  async login(credentials: { email: string, password: string }, reply: FastifyReply): Promise<Omit<User, 'password' | 'refreshToken'>> {
    try {
      const user = await this.usersRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.email = :email', { email: credentials.email })
        .getOne()

      const message = 'User credentials are incorrect';

      if (!user) throw new UnauthorizedException(message);

      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

      if (!isPasswordValid) throw new UnauthorizedException(message);

      const payload = { email: user.email, sub: user.id };

      const accessToken = this.jwtService.sign(payload, { expiresIn: config.jwt.accessTokenExpiresIn })
      const refreshToken = this.jwtService.sign(payload, { expiresIn: config.jwt.refreshTokenExpiresIn })

      setAuthCookies(reply, { accessToken, refreshToken })

      const { password: _password, refreshToken: _refreshToken, ...u } = user

      const tokenRecord = this.tokensRepository.create({
        refreshToken: refreshToken,
        userId: user.id,
        tokenFamily: randomUUID(),
        isUsed: false,
        isRevoked: false,
      });

      await this.tokensRepository.save(tokenRecord);

      return reply.send({ success: true, data: { ...u } });
    } catch (error) {
      console.error(String(error));
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('An error occurred while logging in');
    }
  }

  async logout(user: Omit<User, 'password' | 'refreshToken'>, oldToken: string, reply: FastifyReply) {
    let success: boolean = false;

    try {
      const tokenRecord = await this.tokensRepository.findOneBy({ refreshToken: oldToken });

      if (!tokenRecord || tokenRecord.userId !== user.id)
        throw new UnauthorizedException('Invalid refresh token');
      await this.tokensRepository.update({ tokenFamily: tokenRecord.tokenFamily }, { isRevoked: true, isUsed: true });
      success = true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      success = false;
      throw new InternalServerErrorException('An error occurred while logging out');
    } finally {
      clearAuthCookies(reply);
    }
    return reply.send({ success })
  }

  async logoutEverywhere(user: Omit<User, 'password' | 'refreshToken'>, reply: FastifyReply) {
    try {
      await this.tokensRepository.update(
        { userId: user.id },
        { isRevoked: true, isUsed: true }
      );
      clearAuthCookies(reply);
      return reply.send({ success: true });
    } catch (error) {
      throw new InternalServerErrorException('An error occurred while logging out everywhe');
    } finally {
      clearAuthCookies(reply);
    }
  }

  async rotateRefreshToken(oldTokenString: string, reply: FastifyReply) {
    try {
      const payload = this.jwtService.verify(oldTokenString, { secret: config.jwt.secret });
      const tokenRecord = await this.tokensRepository.findOneByOrFail({ refreshToken: oldTokenString });

      if (!tokenRecord || tokenRecord.isRevoked) throw new UnauthorizedException('Acess Denied');

      if (tokenRecord.isUsed) {
        await this.tokensRepository.update(
          { tokenFamily: tokenRecord.tokenFamily },
          {
            tokenFamily: tokenRecord.tokenFamily,
            isRevoked: true
          },
        );
        // TODO: Add sentry here or something similar
        throw new UnauthorizedException('Security breach detected. Full session revoked.');
      }

      await this.tokensRepository.update(tokenRecord.id, { isUsed: true });

      const newAccessToken = this.jwtService.sign({ sub: payload.sub }, { expiresIn: config.jwt.accessTokenExpiresIn })
      const newRefreshToken = this.jwtService.sign(
        {
          sub: payload.sub,
          family: tokenRecord.tokenFamily
        },
        {
          expiresIn: config.jwt.refreshTokenExpiresIn
        }
      )

      const newTokenRecord = this.tokensRepository.create({
        refreshToken: newRefreshToken,
        userId: payload.sub,
        tokenFamily: tokenRecord.tokenFamily,
        isUsed: false,
        isRevoked: false,
      });

      await this.tokensRepository.save(newTokenRecord);

      setAuthCookies(reply, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });

      return { success: true };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

  }
}
