import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUES, VIDEO_FLOW } from "./constants/transcode.constants";
import { HlsPublisherService } from "./hls-publisher.service";
import { MediaProbeService } from "./media-probe.service";
import { ModerationAnalyzerService } from "./moderation/moderation-analyzer.service";
import { ModerationSamplerService } from "./moderation/moderation-sampler.service";
import { OpenRouterClient } from "./moderation/openrouter.client";
import { VideoAnalyzeProcessor } from "./processors/video-analyze.processor";
import { VideoFinalizeProcessor } from "./processors/video-finalize.processor";
import { VideoModerateProcessor } from "./processors/video-moderate.processor";
import { VideoTranscodeProcessor } from "./processors/video-transcode.processor";
import { SourceFileService } from "./source-file.service";
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
      { name: QUEUES.MODERATE },
    ),
    BullModule.registerFlowProducer({ name: VIDEO_FLOW }),
  ],
  providers: [
    VideoAnalyzeProcessor,
    VideoTranscodeProcessor,
    VideoFinalizeProcessor,
    VideoModerateProcessor,
    ThumbnailService,
    TranscodeService,
    MediaProbeService,
    SourceFileService,
    HlsPublisherService,
    StoryboardService,
    OpenRouterClient,
    ModerationSamplerService,
    ModerationAnalyzerService,
  ],
})
export class VideoProcessingModule { }