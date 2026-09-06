import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { firstValueFrom, isObservable } from "rxjs";
import { IS_PUBLIC_KEY } from "../../decorators/public-route.decorator.js";

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    try {
      const result = super.canActivate(context);
      const allowed = isObservable(result) ? await firstValueFrom(result) : await result;
      return Boolean(allowed) || Boolean(isPublic);
    } catch {
      if (isPublic) return true;
      throw new UnauthorizedException();
    }
  }
}
