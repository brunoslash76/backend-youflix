import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from "@nestjs/typeorm";
import { type FastifyRequest } from 'fastify';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const token = request.cookies.access_token;

    if (!token) throw new UnauthorizedException('Access denied!');

    try {
      const decoded = this.jwtService.verify(token);
      const user: Omit<User, 'password' | 'refreshToken'> = await this.usersRepository.findOneByOrFail({ id: decoded.sub });
      request.user = user;
      return true;
    } catch(error) {
      console.error(String(error));
      return false
    }
  }
}
