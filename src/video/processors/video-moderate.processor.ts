import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Job, UnrecoverableError } from "bullmq";
import { Repository } from "typeorm";
import { MODERATION_CHUNK_SECONDS, MODERATION_JOBS, MODERATION_MAX_CHUNKS } from "../constants/moderation.constant";
import { QUEUES, SOURCE_URL_TTL_SECONDS } from "../constants/transcode.constants";
import { Video } from "../entities/video.entity";
import { ModerationActionsService } from "../moderation-actions.service";
import { combineResults, ModerationAnalyzerService, ModerationResult } from "../moderation/moderation-analyzer.service";
import { ModerationSamplerService } from "../moderation/moderation-sampler.service";
import { isBlockedStatus, mergeModeration } from "../moderation/util/moderation.policy.util";
import { SourceFileService } from "../source-file.service";
import { StorageService } from "../storage.service";
import { ModerateTextJobData, ModerateVideoJobData } from "../types/moderate-job-data.type";
import { ModerationStatus } from "../types/moderation-status.type";
import { SupportedMimeType } from "../utils/ffmpeg-input-args.util";

@Processor(QUEUES.MODERATE, { concurrency: Number(process.env.MODERATION_CONCURRENCY ?? 1) })
export class VideoModerateProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoModerateProcessor.name)

  constructor(
    private readonly storageService: StorageService,
    private readonly sourceFileService: SourceFileService,
    private readonly sampler: ModerationSamplerService,
    private readonly analyzer: ModerationAnalyzerService,
    private readonly actions: ModerationActionsService,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>
  ) {
    super()
  }

  async process(job: Job<ModerateVideoJobData | ModerateTextJobData>) {
    const video = await this.videoRepository.findOneBy({ publicId: job.data.publicId })

    if (!video) {
      throw new UnrecoverableError(`Video not found: ${job.data.publicId}`)
    }

    if (isBlockedStatus(video.moderationStatus)) {
      return { skipped: true }
    }

    const source = job.name === MODERATION_JOBS.TEXT ? 'ai_text' : 'ai_video'

    try {
      const result = job.name === MODERATION_JOBS.TEXT
        ? await this.analyzer.analyzeText(video)
        : await this.moderateVideo(job as Job<ModerateVideoJobData>, video)

      await this.finish(video, source, result)
    } catch (error) {
      if (job.attemptsMade + 1 < (job.opts.attempts ?? 1)) throw error
      this.logger.error(`Moderation failed for ${video.publicId}`, error)
      await this.finish(video, source, {
        decision: { status: ModerationStatus.NEEDS_REVIEW, reason: 'moderation_unavailable' },
        flags: [],
        summary: '',
        model: null,
        costUsd: null,
      })
    }
  }

  private async moderateVideo(job: Job<ModerateVideoJobData>, video: Video): Promise<ModerationResult> {
    const duration = video.durationSeconds ?? 0
    const chunkSeconds = Math.max(
      MODERATION_CHUNK_SECONDS,
      Math.ceil(duration / MODERATION_MAX_CHUNKS)
    )
    const starts = Array.from(
      { length: Math.max(1, Math.ceil(duration / chunkSeconds)) },
      (_, index) => index * chunkSeconds
    )
    const source = await this.storageService.getInternalPresignedGetUrl(video.storageKey, SOURCE_URL_TTL_SECONDS)
    const results: ModerationResult[] = []

    await this.sourceFileService.withWorkDir(`${video.publicId}-moderation`, async (dir) => {
      for (const startSeconds of starts) {
        const chunk = await this.sampler.extractChunck({
          source,
          contentType: video.contentType as SupportedMimeType,
          startSeconds,
          durationSeconds: chunkSeconds,
          hasAudio: job.data.hasAudio,
          dir
        })

        const result = await this.analyzer.analyzeChunk(video, chunk, chunkSeconds)
        results.push(result)
        await job.updateProgress(Math.round((results.length / starts.length) * 100))
        if (isBlockedStatus(result.decision.status)) break
      }
    })
    return combineResults(results)
  }

  private async finish(video: Video, source: 'ai_video' | 'ai_text', result: ModerationResult) {
    const latest = await this.videoRepository.findOneByOrFail({ id: video.id })
    const merged = mergeModeration(latest.moderationStatus, latest.moderationReason, result.decision)

    const awaitingVideo = source === 'ai_text'
      && latest.moderationStatus === ModerationStatus.PENDING
      && merged.status === ModerationStatus.APPROVED

    const decision = awaitingVideo ? { status: ModerationStatus.PENDING, reason: null } : merged

    await this.actions.apply(video, { ...result, source, decision })

    this.logger.log(`Moderation ${source} ${decision.status} for ${video.publicId}`)
  }
}
