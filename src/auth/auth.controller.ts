import { Body, Controller, Get, Post, Res } from "@nestjs/common";
import { type FastifyReply } from 'fastify';
import { CurrentUser } from "../decorators/current-user.decorator.js";
import { PublicRoute } from "../decorators/public-route.decorator.js";
import { User } from "../user/entities/user.entity.js";
import { AuthService } from "./auth.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterDto } from "./dto/register.dto.js";

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Get('health')
  @PublicRoute()
  async health() {
    return { status: 'ok' };
  }
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
  async logout(@CurrentUser() user: Omit<User, 'password' | 'refreshToken'>, @Res() reply: FastifyReply) {
    return this.authService.logout(user, reply);
  }
}
