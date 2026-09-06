import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { PublicRoute } from '../decorators/public-route.decorator';
import { User } from '../user/entities/user.entity';
import { UploadVideoDto } from './dtos/upload-video.dto';
import { VideoService } from './video.service';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload')
  async uploadVideo(@CurrentUser() user: User, @Body() body: UploadVideoDto) {
    return this.videoService.createUpload(user, body);
  }

  @Post(':publicId/complete')
  completeUpload(@CurrentUser() user: User, @Param('publicId') publicId: string) {
    return this.videoService.completeUpload(user, publicId);
  }

  @Get(':publicId')
  @PublicRoute()
  getVideo(
    @Param('publicId') publicId: string,
    @CurrentUser() user?: User
  ) {
    return this.videoService.findByPublicId(publicId, user);
  }
}
