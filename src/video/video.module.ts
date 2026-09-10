import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { GenresVideoSeedService } from './genres-video-seed.service';
import { GenresController } from './genres.controller';
import { GenresService } from './genres.service';
import { VideoSharedModule } from './video-shared.module';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';


@Module({
  providers: [VideoService, GenresService, GenresVideoSeedService],
  controllers: [VideoController, GenresController],
  imports: [
    VideoSharedModule,
    BullModule.registerQueue({ name: 'video-queue' })
  ],
})
export class VideoModule { }
