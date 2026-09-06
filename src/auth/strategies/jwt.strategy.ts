import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import type { FastifyRequest } from 'fastify';
import { type JwtPayload } from 'jsonwebtoken';
import { ExtractJwt, Strategy } from "passport-jwt";
import { Repository } from "typeorm";
import { User } from "../../user/entities/user.entity";

const JWT_SECRET = process.env.JWT_SECRET!;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    if (!JWT_SECRET) throw new Error('JWT_SECRET is not set');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: FastifyRequest) => {
          return request?.cookies?.access_token || null
        }
      ]),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    })
  }

  async validate(payload: JwtPayload) {
    if (!payload) throw new UnauthorizedException()

    try {
      const user = await this.userRepository.findOneBy({ id: payload.sub });
      if (!user) throw new UnauthorizedException();

      const { password: _password, refreshToken: _refreshToken, ...safeUser } = user;
      return safeUser;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      console.error(error);
      throw new UnauthorizedException();
    }

  }
}
