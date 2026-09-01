import { UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import type { FastifyRequest } from 'fastify';
import { type JwtPayload } from 'jsonwebtoken';
import { ExtractJwt, Strategy } from "passport-jwt";

const JWT_SECRET = process.env.JWT_SECRET!;

export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
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

    return {
      userId: payload.sub,
      email: payload.email,
    }
  }
}
