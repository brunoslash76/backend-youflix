import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { type FastifyRequest } from 'fastify';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>()
    if (!request.user?.isAdmin) throw new ForbiddenException('Admin access required')
    return true
  }
}
