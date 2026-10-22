import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Job, UnrecoverableError } from "bullmq";
import { Repository } from "typeorm";
import { QUEUES } from "../constants/transcode.constants";
import { Video } from "../entities/video.entity";
import { HlsPublisherService } from "../hls-publisher.service";
import { isBlockedStatus } from "../moderation/util/moderation.policy.util";
import { StoryboardService } from "../storyboard.service";
import { FinalizeJobData } from "../types/finalize-job-data.type";
import { VideoStatus } from "../types/video-status.type";

@Processor(QUEUES.FINALIZE)
export class VideoFinalizeProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoFinalizeProcessor.name)

  constructor(
    private readonly hlsPublisherService: HlsPublisherService,
    private readonly storyboardService: StoryboardService,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>
  ) {
    super()
  }

  async process(job: Job<FinalizeJobData>) {
    const video = await this.videoRepository.findOneBy({ publicId: job.data.publicId })
    if (!video) throw new UnrecoverableError(`VIDEO NOT FOUND: ${job.data.publicId}`)
    if (isBlockedStatus(video.moderationStatus)) return

    const failures = await job.getIgnoredChildrenFailures()
    if (Object.keys(failures).length) {
      this.logger.warn(`Some renditions failed for ${video.publicId}: ${JSON.stringify(failures)}`);
    }

    const ready = await this.hlsPublisherService.publish(video, job.data.hasAudio)

    if (!ready.length) {
      await this.videoRepository.update(video.id, { status: VideoStatus.FAILED })
      throw new UnrecoverableError(`No rendition succeeded for ${video.publicId}`);
    }

    try {
      await this.storyboardService.generate(video, ready[0])
    } catch (error) {
      this.logger.warn(`Storyboard failed for ${video.publicId}`, error);
    }

    this.logger.log(`Finalized ${video.publicId}`);
  }
}