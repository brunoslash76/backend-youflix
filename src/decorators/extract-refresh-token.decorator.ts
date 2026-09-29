import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { REFRESH_TOKEN_COOKIE } from "../auth/utils/auth-cookies.util.js";

export const ExtractRefreshToken = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.cookies?.[REFRESH_TOKEN_COOKIE] || null;
  }
)
