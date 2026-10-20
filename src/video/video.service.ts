import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { nanoid } from 'nanoid';
import { In, Repository } from 'typeorm';
import { config } from '../config';
import { SearchHistoryService } from '../search-history/search-history.service';
import { User } from './../user/entities/user.entity';
import { UpdateVideoDetailsDto } from './dtos/update-video-details.dto';
import { UploadVideoDto } from './dtos/upload-video.dto';
import { VideoListResponseDto } from './dtos/video-list.dto';
import { Genre } from './entities/genre.entity';
import { Video } from './entities/video.entity';
import { StorageService } from './storage.service';
import { ThumbnailService } from './thumbnail.service';
import { VideoStatus } from './types/video-status.type';

const ALLOWED_MIME_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);
  constructor(
    private readonly searchHistoryService: SearchHistoryService,
    private readonly storageService: StorageService,
    private readonly thumbnailService: ThumbnailService,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    @InjectQueue('video-queue')
    private readonly videoQueue: Queue,
  ) { }

  async createThumbnailUpload(user: User, publicId: string, contentType: string, sizeBytes: number) {
    try {
      const video = await this.findOwned(user, publicId)

      if (!IMAGE_TYPES.has(contentType) || sizeBytes > MAX_IMAGE_BYTES) {
        throw new BadRequestException('Use JPEG, PNG or WebP up to 5 MB')
      }
      const key = `thumbnails/${video.publicId}/uploads/${nanoid(12)}`
      const uploadUrl = await this.storageService.getPresignedPutUrl(key, contentType, sizeBytes)
      return {
        key,
        uploadUrl,
      }
    } catch (error) {
      this.rethrowHttp(error, 'Failed to create thumbnail upload');
    }
  }

  async createUpload(user: User, videoMetadata: UploadVideoDto) {
    try {
      if (!ALLOWED_MIME_TYPES.has(videoMetadata.contentType)) {
        throw new BadRequestException('Invalid video format');
      }

      const publicId = nanoid(21);
      const storageKey = `videos/${user.id}/${publicId}/source.mp4`;

      const video = this.videoRepository.create({
        authorId: user.id,
        publicId,
        storageKey,
        isPublic: false,
        status: VideoStatus.AWAITING_UPLOAD,
        contentType: videoMetadata.contentType,
        sizeBytes: videoMetadata.sizeBytes,
        title: videoMetadata.filename.replace(/\.[^.]+$/, '').slice(0, 255),
        description: '',
        genres: [],
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
      const video = await this.findOwned(user, publicId);
      if (video.status !== VideoStatus.AWAITING_UPLOAD) throw new ConflictException('Upload already completed');
      if (!video.storageKey) throw new NotFoundException('Missing storage key');

      const object = await this.storageService.headObject(video.storageKey);

      if (!object) throw new NotFoundException('File not found in storage');

      if (object.ContentLength != null && Number(object.ContentLength) !== Number(video.sizeBytes)) {
        throw new BadRequestException('Uploaded file size does not match');
      }

      video.status = VideoStatus.UPLOADED;

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
        thumbnailOptions: isOwner
          ? video.thumbnailCandidateKeys.map(key => this.storageService.getPublicUrl(key))
          : [],
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

  async listVideos(user?: User, page = 1, limit = 20): Promise<VideoListResponseDto> {
    try {
      const [videos, total] = await this.videoRepository.findAndCount({
        where: { isPublic: true, status: VideoStatus.READY },
        relations: {
          genres: true,
        },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      const items = await Promise.all(
        videos.map(async (video) => this.toListItem(video)),
      )

      return { personalized: !!user, items, total, page, limit }
    } catch (error) {
      this.rethrowHttp(error, 'Failed to list videos');
    }
  }

  async getFeed(user?: User, page = 1, limit = 20): Promise<VideoListResponseDto> {
    try {
      const total = await this.videoRepository.count({
        where: { isPublic: true, status: VideoStatus.READY },
      });

      if (page > 1) {
        const videos = await this.videoRepository.find({
          where: { isPublic: true, status: VideoStatus.READY },
          relations: { genres: true },
          order: { createdAt: 'DESC' },
          skip: (page - 1) * limit,
          take: limit,
        });

        return {
          personalized: false,
          items: await Promise.all(videos.map(video => this.toListItem(video))),
          total,
          page,
          limit,
        }
      }

      const terms = user ? await this.searchHistoryService.findRecent(user.id) : []
      const recommended = terms.length
        ? await this.videoRepository.createQueryBuilder('video')
          .leftJoinAndSelect('video.genres', 'genre')
          .where('video.isPublic = true AND video.status = :status', { status: VideoStatus.READY })
          .andWhere('video.title ILIKE ANY(ARRAY[:...patterns])', { patterns: terms.map(t => `%${t.replace(/[\\%_]/g, '\\$&')}%`) })
          .orderBy('video.createdAt', 'DESC')
          .take(limit)
          .getMany()
        : []

      const recommendedIds = new Set(recommended.map(v => v.id))
      const latest = await this.videoRepository.find({
        where: { isPublic: true, status: VideoStatus.READY },
        relations: { genres: true },
        order: { createdAt: 'DESC' },
        take: limit + recommended.length,
      })

      const videos = [
        ...recommended,
        ...latest.filter(v => !recommendedIds.has(v.id))
      ].slice(0, limit)

      return {
        personalized: recommended.length > 0,
        items: await Promise.all(videos.map(v => this.toListItem(v))),
        total,
        page,
        limit,
      }
    } catch (error) {
      this.rethrowHttp(error, 'Failed to get feed');
    }
  }

  async updateDetails(user: User, publicId: string, dto: UpdateVideoDetailsDto) {
    try {
      const video = await this.findOwned(user, publicId)

      const genres = await this.genreRepository.find({ where: { id: In(dto.genreIds) } })

      if (genres.length !== dto.genreIds.length) {
        throw new BadRequestException('One or more genres are invalid')
      }

      if (dto.customThumbnailKey) {
        if (!dto.customThumbnailKey.startsWith(`thumbnails/${publicId}/uploads/`)) {
          throw new BadRequestException('Invalid thumbnail key')
        }
        video.thumbnailKey = await this.normalizeCustomThumbnail(dto.customThumbnailKey, publicId)
      } else if (dto.thumbnailIndex !== undefined) {
        const key = video.thumbnailCandidateKeys[dto.thumbnailIndex]

        if (!key) throw new BadRequestException('Invalid thumbnail index')

        video.thumbnailKey = key
      }

      const { title, description } = dto

      Object.assign(video, { title, description, genres, isPublic: true })
      await this.videoRepository.save(video)
      return this.findByPublicId(publicId, user)
    } catch (error) {
      this.rethrowHttp(error, 'Failed to update video details');
    }
  }

  private async toListItem(video: Video) {
    return {
      publicId: video.publicId,
      title: video.title,
      genres: video.genres,
      views: video.views,
      createdAt: video.createdAt,
      thumbnailUrl: video.thumbnailKey
        ? await this.storageService.getPublicUrl(video.thumbnailKey)
        : null,
    }
  }

  private rethrowHttp(error: unknown, fallback: string): never {
    if (error instanceof HttpException) throw error;
    this.logger.error(fallback, error);
    throw new InternalServerErrorException(fallback);
  }

  private async findOwned(user: User, publicId: string) {
    try {
      const video = await this.videoRepository.findOneBy({ publicId })
      if (!video) throw new NotFoundException('Video not found');
      if (video.authorId !== user.id) throw new ForbiddenException();
      return video;
    } catch (error) {
      this.rethrowHttp(error, 'Failed to find owned video');
    }
  }

  private async normalizeCustomThumbnail(uploadKey: string, publicId: string) {
    const object = await this.storageService.headObject(uploadKey)

    if (!object?.ContentType)
      throw new BadRequestException('Thumbnail not uploaded')

    const url = await this.storageService.getInternalPresignedGetUrl(uploadKey)
    const jpeg = await this.thumbnailService.imageToJpeg(url, object.ContentType)

    const key = `thumbnails/${publicId}/custom-${nanoid(8)}.jpg`
    await this.storageService.putObject(key, jpeg, 'image/jpeg', 'public, max-age=31536000, immutable')
    return key
  }
}
