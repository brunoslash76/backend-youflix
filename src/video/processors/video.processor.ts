import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Job } from "bullmq";
import { Repository } from "typeorm";
import { Video } from "../entities/video.entity";
import { StorageService } from "../storage.service";
import { ThumbnailService } from "../thumbnail.service";
import { VideoStatus } from "../types/video-status.type";
import { isSupportedMimeType, SupportedMimeType } from "../utils/ffmpeg-input-args.util";

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
      const contentType = video?.contentType as SupportedMimeType;

      if (!video) {
        this.logger.warn(`Video not found: ${job.data.publicId}`);
        return;
      }

      if (!isSupportedMimeType(contentType)) {
        this.logger.warn(`Unsupported MIME type: ${contentType}`);
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      const inputUrl = await this.storageService.getInternalPresignedGetUrl(video.storageKey);
      const duration = await this.thumbnailService.probeDurationSeconds(inputUrl, contentType);

      const offsets = duration && duration > 4
        ? [0.01, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map(p => duration * p)
        : [0]

      const frames = await this.thumbnailService.extractFrames(inputUrl, contentType, offsets);
      const prefix = `thumbnails/${video.publicId}`;

      const keys: string[] = []

      for (const [index, jpeg] of frames.entries()) {
        const key = `${prefix}/frame-${index + 1}.jpg`;
        await this.storageService.putObject(key, jpeg, 'image/jpeg', 'public, max-age=31536000, immutable')
        keys.push(key);
      }

      await this.videoRepository
        .createQueryBuilder()
        .update(Video)
        .set({
          status: VideoStatus.READY,
          thumbnailCandidateKeys: keys,
          thumbnailKey: () => `COALESCE("thumbnailKey", :firstKey)`,
        })
        .where('publicId = :publicId', { publicId: video.publicId })
        .setParameter('firstKey', keys[0])
        .execute();
      this.logger.log(`Processed video: ${job.data.publicId}`);
    } catch (error) {
      if (video && job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
        await this.videoRepository.update(
          { publicId: video.publicId },
          { status: VideoStatus.FAILED }
        );
      }
      this.logger.error(`Error processing video: ${job.data.publicId}`, error);
      throw error;
    }
  }
}