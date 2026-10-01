import { Body, Controller, Post, Res, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { type FastifyReply } from 'fastify';
import { CurrentUser } from "../decorators/current-user.decorator.js";
import { ExtractRefreshToken } from "../decorators/extract-refresh-token.decorator.js";
import { PublicRoute } from "../decorators/public-route.decorator.js";
import { User } from "../user/entities/user.entity.js";
import { AuthService } from "./auth.service.js";
import { ActivateAccountDto } from "./dto/activate-account.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterDto } from "./dto/register.dto.js";
import { ResendActivationDto } from "./dto/resend-activation.dto.js";

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  @PublicRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @Post('activate')
  @PublicRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async activate(@Body() body: ActivateAccountDto) {
    return await this.authService.activateAccount(body.token)
  }

  @Post('resend-activation')
  @PublicRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async resendActivation(@Body() body: ResendActivationDto) {
    return await this.authService.resendActivation(body.email)
  }

  @Post('login')
  @PublicRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async login(@Body() loginDto: LoginDto, @Res() reply: FastifyReply) {
    return await this.authService.login(loginDto, reply);
  }

  @Post('logout')
  async logout(
    @CurrentUser() user: Omit<User, 'password' | 'refreshToken'>,
    @ExtractRefreshToken() token: string,
    @Res() reply: FastifyReply
  ) {
    return await this.authService.logout(user, token, reply);
  }

  @Post('refresh')
  @PublicRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async refresh(@ExtractRefreshToken() token: string, @Res({ passthrough: true }) reply: FastifyReply) {
    return await this.authService.rotateRefreshToken(token, reply);
  }

  @Post('logout-everywhere')
  async logoutEverywhere(
    @CurrentUser() user: Omit<User, 'password' | 'refreshToken'>,
    @Res() reply: FastifyReply
  ) {
    return await this.authService.logoutEverywhere(user, reply);
  }
}
