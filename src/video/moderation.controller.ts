import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { RejectVideoDto } from './dtos/reject-video.dto';
import { ModerationAdminService } from './moderation/moderation-admin.service';

@ApiTags('moderation')
@ApiCookieAuth()
@UseGuards(AdminGuard)
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationAdminService: ModerationAdminService) { }

  @Get('queue')
  @ApiOperation({ summary: 'Videos waiting for human review' })
  listQueue(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.moderationAdminService.listQueue(Number(page) || 1, Math.min(Number(limit) || 20, 100));
  }

  @Post(':publicId/approve')
  @ApiOperation({ summary: 'Approve a video after review' })
  approve(@CurrentUser() admin: User, @Param('publicId') publicId: string) {
    return this.moderationAdminService.approve(admin, publicId);
  }

  @Post(':publicId/reject')
  @ApiOperation({ summary: 'Reject a video after review' })
  reject(@CurrentUser() admin: User, @Param('publicId') publicId: string, @Body() body: RejectVideoDto) {
    return this.moderationAdminService.reject(admin, publicId, body.reason);
  }
}