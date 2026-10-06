import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';
import { PublicRoute } from '../decorators/public-route.decorator';
import { User } from '../user/entities/user.entity';
import { CreateUploadResponseDto } from './dtos/response-upload.dto';
import { UploadVideoDto } from './dtos/upload-video.dto';
import { VideoListResponseDto } from './dtos/video-list.dto';
import { Video } from './entities/video.entity';
import { VideoService } from './video.service';


@ApiTags('video')
@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) { }


  @Post('upload')
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Start a video upload',
    description: 'Start a video upload',
  })
  @ApiCreatedResponse({ type: CreateUploadResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access_token' })
  @ApiBadRequestResponse({ description: 'Invalid metadata, content type, or genre ids' })
  async uploadVideo(@CurrentUser() user: User, @Body() body: UploadVideoDto) {
    return this.videoService.createUpload(user, body);
  }


  @Post(':publicId/complete')
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Complete a video upload',
    description: 'Complete a video upload',
  })
  @ApiParam({ name: 'publicId', example: 'V1StGXR8_Z5jdHi6B' })
  @ApiOkResponse({ type: CreateUploadResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access_token' })
  @ApiBadRequestResponse({ description: 'Invalid publicId' })
  completeUpload(@CurrentUser() user: User, @Param('publicId') publicId: string) {
    return this.videoService.completeUpload(user, publicId);
  }

  @Get()
  @PublicRoute()
  @ApiOperation({ summary: 'List public videos', description: 'Paginated list of public, completed videos' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Defaults to 1' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20, description: 'Defaults to 20' })
  @ApiOkResponse({ type: VideoListResponseDto }) 
  async listVideos(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.videoService.listVideos(Number(page) || 1, Number(limit) || 20);
  }

  @Get(':publicId')
  @PublicRoute()
  @ApiOperation({
    summary: 'Get a video by publicId',
    description: 'Get a video by publicId',
  })
  @ApiParam({ name: 'publicId', example: 'V1StGXR8_Z5jdHi6B' })
  @ApiOkResponse({ type: Video })
  @ApiNotFoundResponse({ description: 'Video not found' })
  getVideo(
    @Param('publicId') publicId: string,
    @CurrentUser() user?: User
  ) {
    return this.videoService.findByPublicId(publicId, user);
  }
}
