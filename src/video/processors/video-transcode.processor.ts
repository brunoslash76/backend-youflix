import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Job, UnrecoverableError } from "bullmq";
import { Repository } from "typeorm";
import { LADDER, QUEUES, renditionPrefix, SOURCE_URL_TTL_SECONDS } from "../constants/transcode.constants";
import { VideoRendition } from "../entities/video-rendition.entity";
import { Video } from "../entities/video.entity";
import { HlsPublisherService } from "../hls-publisher.service";
import { SourceFileService } from "../source-file.service";
import { StorageService } from "../storage.service";
import { TranscodeService } from "../transcode.service";
import { RenditionStatus } from "../types/rendition-status.type";
import { TranscodeJobData } from "../types/transcode-job-data.type";
import { REMOTE_INPUT_PROTOCOLS, SupportedMimeType } from "../utils/ffmpeg-input-args.util";

const PROGRESS_STEP = 5

@Processor(QUEUES.TRANSCODE, { concurrency: Number(process.env.TRANSCODE_CONCURRENCY ?? 1) })
export class VideoTranscodeProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoTranscodeProcessor.name)
  private readonly threads = Number(process.env.TRANSCODE_THREADS ?? 2)

  constructor(
    private readonly storageService: StorageService,
    private readonly sourceFileService: SourceFileService,
    private readonly transcodeService: TranscodeService,
    private readonly hlsPublisherService: HlsPublisherService,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(VideoRendition)
    private readonly videoRenditionRepository: Repository<VideoRendition>,
  ) {
    super();
  }

  async process(job: Job<TranscodeJobData>) {
    const { publicId, hasAudio } = job.data

    const rung = LADDER.find(r => r.name === job.data.rung)

    if (!rung) throw new UnrecoverableError(`Unknown rung: ${job.data.rung}`)

    const video = await this.videoRepository.findOneBy({ publicId })

    if (!video) throw new UnrecoverableError(`Video not found: ${publicId}`)

    const rendition = await this.videoRenditionRepository.findOneBy({ videoId: video.id, name: rung.name })
    if (!rendition) throw new UnrecoverableError(`Rendition not found: ${publicId} ${rung.name}`)
    if (rendition.status === RenditionStatus.READY) return {
      rung: rung.name,
      skipped: true,
    }

    await this.videoRenditionRepository.update(rendition.id, {
      status: RenditionStatus.ENCODING,
      progress: 0,
      errorMessage: null,
    })

    try {
      const source = await this.storageService.getInternalPresignedGetUrl(video.storageKey, SOURCE_URL_TTL_SECONDS)
      await this.sourceFileService.withWorkDir(`${publicId}-${rung.name}`, async (dir) => {
        let lastSaved = 0;

        await this.transcodeService.transcodeRendition({
          contentType: video.contentType as SupportedMimeType,
          source,
          protocols: REMOTE_INPUT_PROTOCOLS,
          outDir: dir,
          rung,
          hasAudio,
          durationSeconds: video.durationSeconds ?? 0,
          threads: this.threads,
          onProgress: (pct) => {
            if (pct - lastSaved < PROGRESS_STEP) return;
            lastSaved = pct;
            job.updateProgress(pct).catch(() => undefined);
            this.videoRenditionRepository.update(rendition.id, { progress: pct }).catch(() => undefined);
          },
        });

        const bytes = await this.storageService.uploadDirectory(dir, renditionPrefix(publicId, rung.name))
        await this.videoRenditionRepository.update(rendition.id, {
          status: RenditionStatus.READY,
          progress: 100,
          bytes,
        });
      });
      await this.hlsPublisherService.publish(video, hasAudio)
      this.logger.log(`Rendition ready: ${publicId} ${rung.name}`)
    } catch (error) {
      const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      const message = error instanceof Error ? error.message : String(error);
      await this.videoRenditionRepository.update(rendition.id, {
        status: lastAttempt ? RenditionStatus.FAILED : RenditionStatus.PENDING,
        errorMessage: message.slice(0, 2000),
      });
      this.logger.error(`Transcode failed: ${publicId} ${rung.name}`, error);
      throw error;
    }
  }
}