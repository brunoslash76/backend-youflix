import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import type { FastifyRequest } from 'fastify';
import { type JwtPayload } from 'jsonwebtoken';
import { ExtractJwt, Strategy } from "passport-jwt";
import { Repository } from "typeorm";
import { config } from "../../config";
import { User } from "../../user/entities/user.entity";
import { ACCESS_TOKEN_COOKIE } from "../utils/auth-cookies.util.js";


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    if (!config.jwt.secret) throw new Error('JWT_SECRET is not set');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: FastifyRequest) => {
          return request?.cookies?.[ACCESS_TOKEN_COOKIE] || null
        }
      ]),
      ignoreExpiration: false,
      secretOrKey: config.jwt.secret,
    })
  }

  async validate(payload: JwtPayload) {
    if (typeof payload?.sub !== 'string' || payload?.type !== 'access') throw new UnauthorizedException()

    try {
      const user = await this.userRepository.findOneBy({ id: payload.sub });
      if (!user || !user.isActive) throw new UnauthorizedException();

      const { password: _password, refreshToken: _refreshToken, ...safeUser } = user;
      return safeUser;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      console.error(error);
      throw new UnauthorizedException();
    }

  }
}
