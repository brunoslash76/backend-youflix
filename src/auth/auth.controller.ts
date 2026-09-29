import { Body, Controller, Post, Res } from "@nestjs/common";
import { type FastifyReply } from 'fastify';
import { CurrentUser } from "../decorators/current-user.decorator.js";
import { ExtractRefreshToken } from "../decorators/extract-refresh-token.decorator.js";
import { PublicRoute } from "../decorators/public-route.decorator.js";
import { User } from "../user/entities/user.entity.js";
import { AuthService } from "./auth.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterDto } from "./dto/register.dto.js";

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  @PublicRoute()
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @PublicRoute()
  async login(@Body() loginDto: LoginDto, @Res() reply: FastifyReply) {
    return this.authService.login(loginDto, reply);
  }

  @Post('logout')
  async logout(
    @CurrentUser() user: Omit<User, 'password' | 'refreshToken'>,
    @ExtractRefreshToken() token: string, 
    @Res() reply: FastifyReply
  ) {
    return this.authService.logout(user, token, reply);
  }

  @Post('refresh')
  @PublicRoute()
  async refresh(@ExtractRefreshToken() token: string, @Res({ passthrough: true }) reply: FastifyReply) {
    return this.authService.rotateRefreshToken(token, reply);
  }
}
