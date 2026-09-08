import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, ForbiddenException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { nanoid } from 'nanoid';
import { In, Repository } from 'typeorm';
import { config } from '../config';
import { User } from './../user/entities/user.entity';
import { UploadVideoDto } from './dtos/upload-video.dto';
import { Genre } from './entities/genre.entity';
import { Video } from './entities/video.entity';
import { StorageService } from './storage.service';
import { VideoStatus } from './types/video-status.type';

const ALLOWED_MIME_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

@Injectable()
export class VideoService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    private readonly storageService: StorageService,
    @InjectQueue('video-queue')
    private readonly videoQueue: Queue
  ) { }

  async createUpload(user: User, videoMetadata: UploadVideoDto) {
    try {
      if (!ALLOWED_MIME_TYPES.has(videoMetadata.contentType)) {
        throw new BadRequestException('Invalid video format');
      }

      const genres = await this.genreRepository.find({ where: { id: In(videoMetadata.genreIds) } });
      if (genres.length !== videoMetadata.genreIds.length) {
        throw new BadRequestException('One or more genres are invalid');
      }

      const publicId = nanoid(21);
      const storageKey = `videos/${user.id}/${publicId}/source.mp4`;

      const video = this.videoRepository.create({
        authorId: user.id,
        publicId,
        title: videoMetadata.title,
        genres,
        storageKey,
        isPublic: false,
        status: VideoStatus.IDLE,
        contentType: videoMetadata.contentType,
        sizeBytes: videoMetadata.sizeBytes,
        description: videoMetadata.description,
      });

      await this.videoRepository.save(video);

      const uploadUrl = await this.storageService.getPresignedPutUrl(
        storageKey,
        videoMetadata.contentType,
        videoMetadata.sizeBytes,
      );

      return {
        publicId,
        uploadUrl,
        status: video.status,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt,
      };
    } catch (error) {
      this.rethrowHttp(error, 'Failed to create upload');
    }
  }

  async completeUpload(user: User, publicId: string) {
    try {
      const video = await this.videoRepository.findOneBy({ publicId });

      if (!video) throw new NotFoundException('Video not found');
      if (video.authorId !== user.id) throw new ForbiddenException();
      if (!video.storageKey) throw new NotFoundException('Missing storage key');

      const object = await this.storageService.headObject(video.storageKey);

      if (!object) throw new NotFoundException('File not found in storage');

      if (object.ContentLength != null && Number(object.ContentLength) !== Number(video.sizeBytes)) {
        throw new BadRequestException('Uploaded file size does not match');
      }

      video.status = VideoStatus.PROCESSING;

      await this.videoRepository.save(video);

      await this.videoQueue.add(
        'process-video',
        { publicId: video.publicId },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true
        }
      )

      return {
        publicId: video.publicId,
        status: video.status,
      };
    } catch (error) {
      this.rethrowHttp(error, 'Failed to complete upload');
    }
  }

  async findByPublicId(publicId: string, user?: User) {
    try {
      const video = await this.videoRepository.findOne({
        where: { publicId },
        relations: {
          genres: true,
          author: true,
        }
      });

      if (!video) throw new NotFoundException('Video not found');

      const isOwner = user?.id === video.authorId;

      if (!video.isPublic && !isOwner) throw new NotFoundException('Video not found');

      return {
        publicId: video.publicId,
        title: video.title,
        description: video.description,
        status: video.status,
        isPublic: video.isPublic,
        genres: video.genres,
        watchUrl: `${config.frontendUrl}/watch?v=${publicId}`,
        thumbnailUrl: video.thumbnailKey
          ? await this.storageService.getPublicUrl(video.thumbnailKey)
          : null,
        author: {
          id: video.author.id,
          firstName: video.author.firstName,
          lastName: video.author.lastName,
        }
      };
    } catch (error) {
      this.rethrowHttp(error, 'Failed to find video by public id');
    }
  }

  async listVideos(page = 1, limit = 20) {
    try {
      const [videos, total] = await this.videoRepository.findAndCount({
        where: { isPublic: true, status: VideoStatus.COMPLETED },
        relations: {
          genres: true,
        },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      const items = await Promise.all(
        videos.map(async (video) => ({
          publicId: video.publicId,
          title: video.title,
          genres: video.genres,
          views: video.views,
          createdAt: video.createdAt,
          thumbnailUrl: video.thumbnailKey
            ? await this.storageService.getPublicUrl(video.thumbnailKey)
            : null,
        })),
      )

      return { items, total, page, limit }
    } catch (error) {
      this.rethrowHttp(error, 'Failed to list videos');
    }
  }

  private rethrowHttp(error: unknown, fallback: string): never {
    if (error instanceof HttpException) throw error;
    if (error instanceof Error) throw new InternalServerErrorException(error.message);
    throw new InternalServerErrorException(fallback);
  }
}
