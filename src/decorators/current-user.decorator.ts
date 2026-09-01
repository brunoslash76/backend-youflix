import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { type FastifyRequest } from 'fastify';

export const CurrentUser = createParamDecorator((_, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<FastifyRequest>()
  return request.user;
})