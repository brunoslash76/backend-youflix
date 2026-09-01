import { Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from 'bcrypt';
import { FastifyReply } from 'fastify';
import { Repository } from "typeorm";
import { config } from "../config/index.js";
import { User } from "../user/entities/user.entity.js";
import { RegisterDto } from "./dto/register.dto.js";
import { Tokens } from "./entities/tokens.entity.js";

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Tokens)
    private tokensRepository: Repository<Tokens>
  ) { }

  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    try {
      const existingUser = await this.usersRepository.findOneBy({ email: registerDto.email, phone: registerDto.phone });

      if (existingUser) throw new Error('User already exists')

      const encryptedPassword = await bcrypt.hash(registerDto.password, 10);
      const newUser = this.usersRepository.create({ ...registerDto, password: encryptedPassword });
      // TODO: Add email verification here or SMS verification
      return await this.usersRepository.save(newUser);
    } catch (error: unknown) {
      if (error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException('An error occurred while registering the user');
    }
  }

  async login(credentials: { email: string, password: string }, reply: FastifyReply): Promise<Omit<User, 'password' | 'refreshToken'>> {
    try {
      const user = await this.usersRepository.findOneByOrFail({ email: credentials.email });

      const message = 'User credentials are incorrect';

      if (!user) throw new UnauthorizedException(message);

      if (!(await bcrypt.compare(credentials.password, user.password))) throw new UnauthorizedException(message);

      const payload = { email: user.email, sub: user.id };

      const accessToken = this.jwtService.sign(payload, { expiresIn: config.jwt.accessTokenExpiresIn })
      
      reply.cookie('access_token', accessToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(0),
        maxAge: config.jwt.accessTokenExpiresIn! * 60 * 1000,
        sameSite: 'lax',
      })

      const refreshToken = this.jwtService.sign(payload, { expiresIn: config.jwt.refreshTokenExpiresIn })

      reply.cookie('refresh_token', refreshToken, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(0),
        maxAge: config.jwt.accessTokenExpiresIn! * 60 * 1000,
        sameSite: 'lax',
      })

      const u: Omit<User, 'password' | 'refreshToken'> = user

      return reply.send({ success: true, data: { u } });
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('An error occurred while logging in');
    }
  }

  async logout(user: Partial<User>, reply: FastifyReply) {
    try {
      const tokenRecord = await this.tokensRepository.findOneByOrFail({ userId: user.id });

      if (!tokenRecord) throw new UnauthorizedException('Invalid refresh token');

      await this.tokensRepository.update(tokenRecord.id, { isRevoked: true, isUsed: true });
    } catch(error) {
      if(error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('An error occurred while logging out');
    } finally {
      reply.cookie('access_token', '', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      })
      reply.cookie('refresh_token', '', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      })
    }
  }

  async forgotPassword(email: string, reply: FastifyReply) {
    try {
      const user = await this.usersRepository.findOneByOrFail({ email });
      // TODO: Send reset password email here
      return reply.send({ success: true, message: 'Reset password email sent' })
    } catch(error) {
      throw new InternalServerErrorException('An error occurred while resetting password');
    }
  }

  async rotateRefreshToken(oldTokenString: string) {
    try {
      const payload = this.jwtService.verify(oldTokenString, { secret: config.jwt.refreshTokenSecret });
      const tokenRecord = await this.tokensRepository.findOneByOrFail({ refreshToken: oldTokenString });

      if (!tokenRecord || tokenRecord.isRevoked) throw new UnauthorizedException('Acess Denied');

      if(tokenRecord.isUsed) {
        await this.tokensRepository.update(tokenRecord.id, { isRevoked: true });
        // TODO: Add sentry here or something similar
        throw new UnauthorizedException('Security breach detected. Full session revoked.');
      }

      await this.tokensRepository.update(tokenRecord.id, { isUsed: true });

      const newAccessToken = this.jwtService.sign({ sub: payload.sub }, { expiresIn: config.jwt.accessTokenExpiresIn })
      const newRefreshToken = this.jwtService.sign({sub: payload.sub, family: tokenRecord.tokenFamily }, { expiresIn: config.jwt.refreshTokenExpiresIn })

      const newTokenRecord = this.tokensRepository.create({
        refreshToken: newRefreshToken,
        userId: payload.sub,
        tokenFamily: tokenRecord.tokenFamily,
        isUsed: false,
        isRevoked: false,
      });

      await this.tokensRepository.save(newTokenRecord);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    } catch(error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

  }
}
