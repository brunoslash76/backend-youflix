import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../decorators/current-user.decorator';
import { PublicRoute } from '../decorators/public-route.decorator';
import { User } from '../user/entities/user.entity';
import { CreateThumbnailUploadDto } from './dtos/create-thumbnail-upload.dto';
import { CreateUploadResponseDto } from './dtos/response-upload.dto';
import { UpdateVideoDetailsDto } from './dtos/update-video-details.dto';
import { UploadVideoDto } from './dtos/upload-video.dto';
import { VideoListResponseDto } from './dtos/video-list.dto';
import { Video } from './entities/video.entity';
import { VideoService } from './video.service';


@ApiTags('video')
@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) { }

  @Post(':publicId/thumbnail/upload-url')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get a presigned URL to upload a custom thumbnail' })
  createThumbnailUpload(
    @CurrentUser() user: User,
    @Param('publicId') publicId: string,
    @Body() body: CreateThumbnailUploadDto,
  ) {
    return this.videoService.createThumbnailUpload(user, publicId, body.contentType, body.sizeBytes);
  }

  @Post('upload')
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Start a video upload',
    description: 'Start a video upload',
  })
  @ApiCreatedResponse({ type: CreateUploadResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access_token' })
  @ApiBadRequestResponse({ description: 'Invalid metadata, content type, or genre ids' })
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60 * 60_000 } })
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

  @Patch(':publicId')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Save video details and publish' })
  @ApiParam({ name: 'publicId', example: 'V1StGXR8_Z5jdHi6B' })
  @ApiBadRequestResponse({ description: 'Invalid details, genres or thumbnail' })
  updateDetails(
    @CurrentUser() user: User,
    @Param('publicId') publicId: string,
    @Body() body: UpdateVideoDetailsDto,
  ) {
    return this.videoService.updateDetails(user, publicId, body);
  }

  @Get()
  @PublicRoute()
  @ApiOperation({ summary: 'List public videos', description: 'Paginated list of public, completed videos' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Defaults to 1' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20, description: 'Defaults to 20' })
  @ApiOkResponse({ type: VideoListResponseDto })
  async listVideos(
    @CurrentUser() user?: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.videoService.listVideos(user, Number(page) || 1, Number(limit) || 20);
  }

  @Get('feed')
  @PublicRoute()
  @ApiOperation({ summary: 'Home feed', description: 'Personalized when logged in, latest videos otherwise' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20, description: 'Defaults to 20' })
  @ApiOkResponse({ type: VideoListResponseDto })
  getFeed(@CurrentUser() user?: User, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.videoService.getFeed(user, Number(page) || 1, Number(limit) || 20);
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
