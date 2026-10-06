import { Body, Controller, Post, Res, UseGuards } from "@nestjs/common";
import { ApiBadRequestResponse, ApiConflictResponse, ApiCookieAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { type FastifyReply } from 'fastify';
import { ErrorResponseDto, LoginResponseDto, SuccessResponseDto } from "../common/dtos/api-response.dto.js";
import { CurrentUser } from "../decorators/current-user.decorator.js";
import { ExtractRefreshToken } from "../decorators/extract-refresh-token.decorator.js";
import { PublicRoute } from "../decorators/public-route.decorator.js";
import { User } from "../user/entities/user.entity.js";
import { AuthService } from "./auth.service.js";
import { ActivateAccountDto } from "./dto/activate-account.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterDto } from "./dto/register.dto.js";
import { ResendActivationDto } from "./dto/resend-activation.dto.js";

@ApiTags('auth')
@ApiTooManyRequestsResponse({ description: 'Rate limit exceeded (10 requests per 15 minutes)', type: ErrorResponseDto })
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  @ApiOperation({
    summary: 'Register a new account',
    description: 'Creates an inactive user and enqueues an activation email. Always returns success, even if the email fails to send.',
  })
  @ApiCreatedResponse({ type: SuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or passwords do not match', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Email or phone already registered', type: ErrorResponseDto })
  @PublicRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @Post('activate')
  @ApiOperation({ summary: 'Activate an account', description: 'Consumes the JWT sent in the activation email.' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid token, or expired with code ACTIVATION_TOKEN_EXPIRED',
    type: ErrorResponseDto,
  })
  @PublicRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async activate(@Body() body: ActivateAccountDto) {
    return await this.authService.activateAccount(body.token)
  }

  @Post('resend-activation')
  @ApiOperation({
    summary: 'Resend the activation email',
    description: 'Always returns success to avoid leaking whether an email is registered.',
  })
  @ApiOkResponse({ type: SuccessResponseDto })
  @PublicRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async resendActivation(@Body() body: ResendActivationDto) {
    return await this.authService.resendActivation(body.email)
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in', description: 'Sets access_token and refresh_token httpOnly cookies.' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Incorrect credentials', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Account not activated', type: ErrorResponseDto })
  @PublicRoute()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async login(@Body() loginDto: LoginDto, @Res() reply: FastifyReply) {
    return await this.authService.login(loginDto, reply);
  }

  @Post('logout')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Log out', description: 'Revokes the current token family and clears cookies.' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access_token', type: ErrorResponseDto })
  async logout(
    @CurrentUser() user: Omit<User, 'password' | 'refreshToken'>,
    @ExtractRefreshToken() token: string,
    @Res() reply: FastifyReply
  ) {
    return await this.authService.logout(user, token, reply);
  }

  @Post('refresh')
  @ApiCookieAuth('refresh')
  @ApiOperation({
    summary: 'Rotate the refresh token',
    description: 'Reads the refresh_token cookie, issues a new token pair, and revokes the whole family if a used token is replayed.',
  })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Invalid/expired token (code REFRESH_TOKEN_EXPIRED) or reuse detected',
    type: ErrorResponseDto,
  })
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
