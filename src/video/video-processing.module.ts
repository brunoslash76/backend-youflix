import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUES, VIDEO_FLOW } from "./constants/transcode.constants";

import { MediaProbeService } from "./media-probe.service";

import { SourceFileService } from "./source-file.service";

import { HlsPublisherService } from "./hls-publisher.service";
import { VideoAnalyzeProcessor } from "./processors/video-analyze.processor";
import { VideoFinalizeProcessor } from "./processors/video-finalize.processor";
import { VideoTranscodeProcessor } from "./processors/video-transcode.processor";
import { StoryboardService } from "./storyboard.service";
import { ThumbnailService } from "./thumbnail.service";
import { TranscodeService } from "./transcode.service";
import { VideoSharedModule } from "./video-shared.module";

@Module({
  imports: [
    VideoSharedModule,
    BullModule.registerQueue(
      { name: QUEUES.ANALYZE },
      { name: QUEUES.TRANSCODE },
      { name: QUEUES.FINALIZE },
    ),
    BullModule.registerFlowProducer({ name: VIDEO_FLOW }),
  ],
  providers: [
    VideoAnalyzeProcessor,
    VideoTranscodeProcessor,
    VideoFinalizeProcessor,
    ThumbnailService,
    TranscodeService,
    MediaProbeService,
    SourceFileService,
    HlsPublisherService,
    StoryboardService,
  ],
})
export class VideoProcessingModule { }