import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { VideoProcessor } from "./processors/video.processor";
import { ThumbnailService } from "./thumbnail.service";
import { VideoSharedModule } from "./video-shared.module";


@Module({
  imports: [
    VideoSharedModule,
    BullModule.registerQueue({ name: 'video-queue' }),
  ],
  providers: [VideoProcessor, ThumbnailService],
})
export class VideoProcessingModule { }
