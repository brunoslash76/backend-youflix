import { InjectFlowProducer, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from '@nestjs/typeorm';
import { FlowProducer, Job, UnrecoverableError } from 'bullmq';
import { Repository } from 'typeorm';
import { ladderFor, QUEUES, renditionPrefix, Rung, VIDEO_FLOW } from "../constants/transcode.constants";
import { VideoRendition } from '../entities/video-rendition.entity';
import { Video } from '../entities/video.entity';
import { StorageService } from "../storage.service";
import { ThumbnailService } from '../thumbnail.service';
import { AnalyzeJobData } from '../types/analyze-job-data.type';
import { FinalizeJobData } from "../types/finalize-job-data.type";
import { ProbeResult } from "../types/probe-result.type";
import { RenditionStatus } from "../types/rendition-status.type";
import { TranscodeJobData } from "../types/transcode-job-data.type";
import { VideoStatus } from '../types/video-status.type';
import { isSupportedMimeType, REMOTE_INPUT_PROTOCOLS, SupportedMimeType } from '../utils/ffmpeg-input-args.util';
import { MediaProbeService } from './../media-probe.service';

const RETRY = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  }
}

@Processor(QUEUES.ANALYZE)
export class VideoAnalyzeProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoAnalyzeProcessor.name)

  constructor(
    private readonly storageService: StorageService,
    private readonly mediaProbeService: MediaProbeService,
    private readonly thumbnailService: ThumbnailService,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(VideoRendition)
    private readonly videoRenditionRepository: Repository<VideoRendition>,
    @InjectFlowProducer(VIDEO_FLOW)
    private readonly flowProducer: FlowProducer,
  ) {
    super()
  }

  async process(job: Job<AnalyzeJobData>) {
    const video = await this.videoRepository.findOneBy({ publicId: job.data.publicId })
    try {

      if (!video) throw new UnrecoverableError(`Video not found: ${job.data.publicId}`)

      if (!isSupportedMimeType(video.contentType)) {
        await this.videoRepository.update(video.id, { status: VideoStatus.FAILED })
        throw new UnrecoverableError(`Unsupported content type: ${video?.contentType}`)
      }

      const contentType: SupportedMimeType = video.contentType as SupportedMimeType

      await this.videoRepository.update(video.id, { status: VideoStatus.ANALYZING })

      const inputUrl = await this.storageService.getInternalPresignedGetUrl(video.storageKey)
      const probe = await this.mediaProbeService.probe(inputUrl, contentType, REMOTE_INPUT_PROTOCOLS)

      await this.videoRepository.update(video.id, {
        durationSeconds: probe.durationSeconds,
        sourceWidth: probe.width,
        sourceHeight: probe.height,
      })

      await this.generateThumbnails(video, inputUrl, contentType, probe.durationSeconds)

      const rungs = ladderFor(probe.height)

      for (const rung of rungs) {
        await this.ensureRendition(video, rung, probe)
      }

      await this.videoRepository.update(video.id, { status: VideoStatus.TRANSCODING })
      await this.enqueueFlow(video, rungs, probe.hasAudio)

      this.logger.log(`Analyzed ${video.publicId}: ${rungs.map(r => r.name).join(', ')}`);
    } catch (error) {
      if(!video) {
        throw new UnrecoverableError(`Video not found: ${job.data.publicId}`)
      }
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
        await this.videoRepository.update(video!.id, { status: VideoStatus.FAILED });
      }
      this.logger.error(`Analyze failed: ${video?.publicId}`, error);
      throw error;
    }
  }

  private async generateThumbnails(video: Video, inputUrl: string, contentType: SupportedMimeType, duration: number) {
    const offsets = duration > 4
      ? [0.01, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map(p => p * duration)
      : [0];

    const frames = await this.thumbnailService.extractFrames(inputUrl, contentType, offsets)
    const keys: string[] = []

    for (const [index, jpeg] of frames.entries()) {
      const key = `thumbnails/${video.publicId}/frame-${index + 1}.jpg`;
      await this.storageService.putObject(key, jpeg, 'image/jpeg', 'public, max-age=31536000, immutable');
      keys.push(key)
    }

    await this.videoRepository
      .createQueryBuilder()
      .update(Video)
      .set({
        thumbnailCandidateKeys: keys,
        thumbnailKey: () => `COALESCE("thumbnailKey", :firstKey)`,
      })
      .where('publicId = :publicId', { publicId: video.publicId })
      .setParameter('firstKey', keys[0])
      .execute();
  }

  private async ensureRendition(video: Video, rung: Rung, probe: ProbeResult) {
    const existing = await this.videoRenditionRepository.findOneBy({
      videoId: video.id,
      name: rung.name,
    })

    if (existing) {
      if (existing.status !== RenditionStatus.READY) {
        await this.videoRenditionRepository.update(existing.id, {
          status: RenditionStatus.PENDING,
          progress: 0,
          errorMessage: null
        });
      }
      return
    }

    const rendition: VideoRendition = this.videoRenditionRepository.create({
      videoId: video.id,
      name: rung.name,
      height: rung.height,
      width: Math.round((probe.width * rung.height) / probe.height / 2) * 2,
      bitrateKbps: rung.videoKbps,
      playlistKey: `${renditionPrefix(video.publicId, rung.name)}/playlist.m3u8`,
    })

    await this.videoRenditionRepository.save(rendition)
  }

  private async enqueueFlow(video: Video, rungs: Rung[], hasAudio: boolean) {
    const finalizeData: FinalizeJobData = { publicId: video.publicId, hasAudio }

    await this.flowProducer.add({
      name: 'finalize',
      queueName: QUEUES.FINALIZE,
      data: finalizeData,
      opts: {
        ...RETRY,
        jobId: `finalize-${video.publicId}`,
        removeOnComplete: true,
      },
      children: rungs.map((rung, index) => {
        const data: TranscodeJobData = { publicId: video.publicId, rung: rung.name, hasAudio };

        return {
          name: 'transcode',
          queueName: QUEUES.TRANSCODE,
          data,
          opts: {
            ...RETRY,
            jobId: `transcode-${video.publicId}-${rung.name}`,
            priority: index + 1,
            ignoreDependencyOnFailure: true,
            removeOnComplete: true,
          }
        }
      })
    })
  }
}
