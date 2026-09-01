import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config } from '../config/index.js';
import { User } from '../user/entities/user.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { Tokens } from './entities/tokens.entity.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, PassportModule, JwtModule],
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: config.jwt.secret,
      signOptions: { expiresIn: config.jwt.accessTokenExpiresIn },
    }),
    TypeOrmModule.forFeature([User, Tokens]),
  ],
})
export class AuthModule { }
