import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Genre } from './entities/genre.entity';
import { Video } from './entities/video.entity';
import { GenresVideoSeedService } from './genres-video-seed.service';
import { GenresController } from './genres.controller';
import { GenresService } from './genres.service';
import { VideoProcessor } from './processors/video.processor';
import { StorageService } from './storage.service';
import { ThumbnailService } from './thumbnail.service';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';


@Module({
  providers: [
    VideoService,
    StorageService,
    GenresService,
    GenresVideoSeedService,
    VideoProcessor,
    ThumbnailService
  ],
  controllers: [VideoController, GenresController],
  imports: [
    TypeOrmModule.forFeature([Video, Genre]),
    BullModule.registerQueue({ name: 'video-queue' })
  ],
})
export class VideoModule { }
