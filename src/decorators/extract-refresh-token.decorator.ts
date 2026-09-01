import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const ExtractRefreshToken = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.cookies?.refreshToken || null;
  } 
)
