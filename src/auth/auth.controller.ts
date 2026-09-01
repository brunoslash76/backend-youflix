import { Body, Controller, Get, Post } from "@nestjs/common";
import { PublicRoute } from "../decorators/public-route.decorator.js";
import { AuthService } from "./auth.service.js";
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
}