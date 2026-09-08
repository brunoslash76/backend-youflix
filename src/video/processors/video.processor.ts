import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Job } from "bullmq";
import { Repository } from "typeorm";
import { Video } from "../entities/video.entity";
import { StorageService } from "../storage.service";
import { ThumbnailService } from "../thumbnail.service";
import { VideoStatus } from "../types/video-status.type";

@Processor('video-queue')
export class VideoProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoProcessor.name);

  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    private readonly storageService: StorageService,
    private readonly thumbnailService: ThumbnailService,
  ) {
    super();
  }

  async process(job: Job<{ publicId: string }>) {
    if (job.name !== 'process-video') return;

    let video: Video | null = null;

    try {
      video = await this.videoRepository.findOneBy({ publicId: job.data.publicId });

      if (!video) {
        this.logger.warn(`Video not found: ${job.data.publicId}`);
        return;
      }

      const inputUrl = await this.storageService.getInternalPresignedGetUrl(video.storageKey);
      const duration = await this.thumbnailService.probeDurationSeconds(inputUrl);

      const offsets = duration && duration > 4
        ? [duration * 0.1, duration * 0.35, duration * 0.6]
        : [0]

      const frames = await this.thumbnailService.extractFrames(inputUrl, offsets);
      const prefix = `thumbnails/${video.publicId}`;

      const keys: string[] = []

      for (const [index, jpeg] of frames.entries()) {
        const key = `${prefix}/frame-${index + 1}.jpg`;
        await this.storageService.putObject(key, jpeg, 'image/jpeg');
        await this.storageService.putObject(key, jpeg, 'image/jpeg', 'public, max-age=31536000, immutable');
        keys.push(key);
      }

      video.thumbnailKey = keys[0];
      video.status = VideoStatus.COMPLETED;
      video.isPublic = true;
      await this.videoRepository.save(video);
      this.logger.log(`Processed video: ${job.data.publicId}`);
    } catch (error) {
      if(job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) { 
        video!.status = VideoStatus.ERROR;
      }
      this.logger.error(`Error processing video: ${job.data.publicId}`, error);
      throw error;
    }
  }
}