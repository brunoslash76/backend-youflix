import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { SearchHistoryModule } from '../search-history/search-history.module';
import { QUEUES } from './constants/transcode.constants';
import { GenresVideoSeedService } from './genres-video-seed.service';
import { GenresController } from './genres.controller';
import { GenresService } from './genres.service';
import { ModerationController } from './moderation.controller';
import { ModerationAdminService } from './moderation/moderation-admin.service';
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
    ModerationAdminService,
  ],
  controllers: [VideoController, GenresController, ModerationController],
  imports: [
    VideoSharedModule,
    SearchHistoryModule,
    BullModule.registerQueue({ name: QUEUES.ANALYZE }, { name: QUEUES.MODERATE }),
  ],
})
export class VideoModule { }