import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { JwtService, TokenExpiredError } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from 'bcrypt';
import { FastifyReply } from 'fastify';
import { createHash, randomUUID } from "node:crypto";
import { Repository } from "typeorm";
import { config } from "../config/index.js";
import { MailerService } from "../mailer/mailer.service.js";
import { User } from "../user/entities/user.entity.js";
import { RegisterDto } from "./dto/register.dto.js";
import { Tokens } from "./entities/tokens.entity.js";
import { clearAuthCookies, setAuthCookies } from "./utils/auth-cookies.util.js";

const ACCOUNT_ACTIVATION_PURPOSE = 'account-activation';
const ACCESS_TOKEN_TYPE = 'access';
const REFRESH_TOKEN_TYPE = 'refresh';

const hashRefreshToken = (token: string) => 
  createHash('sha256').update(token).digest('hex');


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
      const { passwordConfirmation, ...userData } = registerDto;

      if (userData.password !== passwordConfirmation)
        throw new BadRequestException('Password does not match the password confirmation');

      const existingUser = await this.usersRepository.findOneBy([
        { email: userData.email },
        { phone: userData.phone },
      ]);

      if (existingUser) throw new ConflictException('User already exists')

      const encryptedPassword = await bcrypt.hash(userData.password, 10);
      const newUser = this.usersRepository.create({
        ...userData,
        password: encryptedPassword,
        isActive: false,
      });
      // TODO: Add email verification here or SMS verification
      const savedUser = await this.usersRepository.save(newUser);
      try {
        await this.sendActivationEmail(savedUser);
      } catch (mailError: unknown) {
        console.error('Failed to enqueue activation email', mailError);
      }
      return { success: true }
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error
      console.error(String(error));
      throw new InternalServerErrorException('An error occurred while registering the user');
    }
  }

  async activateAccount(token: string): Promise<{ success: boolean }> {
    try {
      const payload = this.jwtService.verify<{ sub?: string; purpose?: string }>(
        token,
        { secret: config.jwt.activationTokenSecret }
      );

      if (payload?.purpose !== ACCOUNT_ACTIVATION_PURPOSE || !payload?.sub) {
        throw new BadRequestException('Invalid activation token')
      }

      const user = await this.usersRepository.findOneBy({ id: payload.sub })

      if (!user) throw new BadRequestException('Invalid activation token')

      if (user.isActive) return { success: true }

      await this.usersRepository.update(user.id, { isActive: true })
      return { success: true }
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      if (error instanceof TokenExpiredError) {
        throw new BadRequestException({ message: 'Activation token expired', code: 'ACTIVATION_TOKEN_EXPIRED' });
      }
      throw new BadRequestException('Invalid activation token');
    }
  }

  async resendActivation(email: string): Promise<{ success: boolean }> {
    try {
      const user = await this.usersRepository.findOneBy({ email })
      if (user && !user.isActive) {
        await this.sendActivationEmail(user)
      }

      return { success: true }
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      console.error(String(error));
      throw new InternalServerErrorException('An error occurred while resending the activation email');
    }
  }

  private async sendActivationEmail(user: User) {
    const token = this.jwtService.sign(
      { sub: user.id, purpose: ACCOUNT_ACTIVATION_PURPOSE },
      { secret: config.jwt.activationTokenSecret, expiresIn: '24h' }
    )
    await this.mailerService.sendAccountActivationEmail(user, token)
  }

  async logout(user: Omit<User, 'password' | 'refreshToken'>, oldToken: string, reply: FastifyReply) {
    try {
      const tokenRecord = oldToken
        ? await this.tokensRepository.findOneBy({ refreshTokenHash: hashRefreshToken(oldToken) })
        : null;

      if (tokenRecord?.userId === user.id) {
        await this.tokensRepository.update(
          { tokenFamily: tokenRecord.tokenFamily },
          { isRevoked: true, isUsed: true },
        )
      }

    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      clearAuthCookies(reply);
    }
    return reply.send({ success: true })
  }

  async logoutEverywhere(user: Omit<User, 'password' | 'refreshToken'>, reply: FastifyReply) {
    try {
      await this.tokensRepository.update(
        { userId: user.id },
        { isRevoked: true, isUsed: true }
      );
      return reply.send({ success: true });
    } catch (error) {
      throw new InternalServerErrorException('An error occurred while logging out everywhe');
    } finally {
      clearAuthCookies(reply);
    }
  }

  async rotateRefreshToken(oldTokenString: string, reply: FastifyReply) {
    try {
      const payload = this.jwtService.verify(
        oldTokenString,
        { secret: config.jwt.refreshTokenSecret }
      );

      if (payload.type !== REFRESH_TOKEN_TYPE) throw new UnauthorizedException('Invalid refresh token');

      const tokenRecord = await this.tokensRepository.findOneBy({ 
        refreshTokenHash: hashRefreshToken(oldTokenString)
       });

      if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.tokenFamily !== payload.family) {
        throw new UnauthorizedException('Access Denied');
      }

      const claim = await this.tokensRepository.update(
        { id: tokenRecord.id, isUsed: false, isRevoked: false },
        { isUsed: true },
      );

      if (claim.affected !== 1) {
        await this.tokensRepository.update(
          { tokenFamily: tokenRecord.tokenFamily },
          { isRevoked: true, isUsed: true },
        );

        throw new UnauthorizedException('Security breach detected. Full session revoked.');
      }

      const user = await this.usersRepository.findOneBy({ id: payload.sub });

      if (!user || !user.isActive) {
        await this.tokensRepository.update(
          { tokenFamily: tokenRecord.tokenFamily },
          { isRevoked: true, isUsed: true },
        );
        throw new UnauthorizedException('Access Denied');
      }

      const newAccessToken = this.signAccessToken(payload.sub)
      const newRefreshToken = this.signRefreshToken(payload.sub, tokenRecord.tokenFamily)

      const newTokenRecord = this.tokensRepository.create({
        refreshTokenHash: hashRefreshToken(newRefreshToken),
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
      if (error instanceof HttpException) throw error;
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException({ message: 'Refresh token expired', code: 'REFRESH_TOKEN_EXPIRED' });
      }
      console.error('Refresh token rotation failed', error);
      throw new UnauthorizedException('Invalid refresh token');
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

      if (!user.isActive) throw new ForbiddenException('User is not active');

      const { password: _password, refreshToken: _refreshToken, ...u } = user

      const tokenFamily = randomUUID();
      const accessToken = this.signAccessToken(user.id)
      const refreshToken = this.signRefreshToken(user.id, tokenFamily)

      setAuthCookies(reply, { accessToken, refreshToken })

      const tokenRecord = this.tokensRepository.create({
        refreshTokenHash: hashRefreshToken(refreshToken),
        userId: user.id,
        tokenFamily,
        isUsed: false,
        isRevoked: false,
      });

      await this.tokensRepository.save(tokenRecord);

      return reply.send({ success: true, data: { ...u } });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error(String(error));
      throw new InternalServerErrorException('An error occurred while logging in');
    }
  }

  private signAccessToken(userId: string) {
    return this.jwtService.sign(
      { sub: userId, type: ACCESS_TOKEN_TYPE },
      { secret: config.jwt.secret, expiresIn: config.jwt.accessTokenExpiresIn },
    );
  }

  private signRefreshToken(userId: string, family: string) {
    return this.jwtService.sign(
      { sub: userId, family, type: REFRESH_TOKEN_TYPE, jti: randomUUID() },
      { secret: config.jwt.refreshTokenSecret, expiresIn: config.jwt.refreshTokenExpiresIn },
    )
  }
}
