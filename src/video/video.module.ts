import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { SearchHistoryModule } from '../search-history/search-history.module';
import { QUEUES } from './constants/transcode.constants';
import { GenresVideoSeedService } from './genres-video-seed.service';
import { GenresController } from './genres.controller';
import { GenresService } from './genres.service';
import { ThumbnailService } from './thumbnail.service';
import { VideoSharedModule } from './video-shared.module';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';


@Module({
  providers: [
    VideoService,
    GenresService,
    GenresVideoSeedService,
    ThumbnailService,
  ],
  controllers: [VideoController, GenresController],
  imports: [
    VideoSharedModule,
    SearchHistoryModule,
    BullModule.registerQueue({ name: QUEUES.ANALYZE }),
  ],
})
export class VideoModule { }
