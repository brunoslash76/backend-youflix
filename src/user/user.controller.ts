import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCookieAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { type FastifyReply } from 'fastify';

import { clearAuthCookies } from '../auth/utils/auth-cookies.util.js';
import { AuthUserDto, ErrorResponseDto, LoginResponseDto, SuccessResponseDto } from '../common/dtos/api-response.dto.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { PublicRoute } from '../decorators/public-route.decorator.js';

import { AdminGuard } from '../auth/guards/admin.guard.js';
import { AdminUpdateUserDto } from './dto/admin-update.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { PublicUserDto, UserListResponseDto } from './dto/user-response.dto.js';
import { User } from './entities/user.entity.js';
import { UserService } from './user.service.js';
type SafeUser = Omit<User, 'password' | 'refreshToken'>;
@ApiTags('user')
@ApiUnauthorizedResponse({ description: 'Missing or invalid access_token', type: ErrorResponseDto })
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }
  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get the current profile' })
  @ApiOkResponse({ type: AuthUserDto })
  getMe(@CurrentUser() user: SafeUser) {
    return user;
  }
  @Patch('me')
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Update the current profile',
    description: 'Email changes are not handled here because they require re-activation.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiBadRequestResponse({ description: 'No fields to update, or validation failed', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Phone already in use', type: ErrorResponseDto })
  updateMe(@CurrentUser() user: SafeUser, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(user.id, dto);
  }
  @Patch('me/password')
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Change the current password',
    description: 'Revokes every session on success, so the client must log in again.',
  })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiBadRequestResponse({ description: 'New password matches the current one', type: ErrorResponseDto })
  async changePassword(
    @CurrentUser() user: SafeUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.userService.changePassword(user.id, dto);
    clearAuthCookies(reply);
    return result;
  }
  @Delete('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Delete the current account', description: 'Revokes all sessions and removes the user.' })
  @ApiOkResponse({ type: SuccessResponseDto })
  async deleteMe(@CurrentUser() user: SafeUser, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.userService.deleteAccount(user.id);
    clearAuthCookies(reply);
    return result;
  }
  @Get()
  @UseGuards(AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'List all users', description: 'Admin only.' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Defaults to 1' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20, description: 'Defaults to 20' })
  @ApiOkResponse({ type: UserListResponseDto })
  @ApiForbiddenResponse({ description: 'Admin access required', type: ErrorResponseDto })
  listUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.userService.listUsers(Number(page) || 1, Number(limit) || 20);
  }
  @Get(':id')
  @PublicRoute()
  @ApiOperation({ summary: 'Get a public profile', description: 'Limited fields, active users only.' })
  @ApiParam({ name: 'id', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiOkResponse({ type: PublicUserDto })
  @ApiNotFoundResponse({ description: 'User not found', type: ErrorResponseDto })
  getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findPublicById(id);
  }
  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Update a user',
    description: 'Admin only. Deactivating a user revokes all of their sessions.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiForbiddenResponse({ description: 'Admin access required', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'User not found', type: ErrorResponseDto })
  adminUpdateUser(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdminUpdateUserDto) {
    return this.userService.adminUpdateUser(id, dto);
  }
  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Delete a user', description: 'Admin only. Use DELETE /user/me for your own account.' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiForbiddenResponse({ description: 'Admin access required', type: ErrorResponseDto })
  adminDeleteUser(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SafeUser) {
    return this.userService.adminDeleteUser(id, user.id);
  }
}