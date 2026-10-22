import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bullmq";
import { In, Repository } from "typeorm";
import { User } from "../../user/entities/user.entity";
import { QUEUES } from "../constants/transcode.constants";
import { VideoModeration } from "../entities/video-moderation.entity";
import { VideoRendition } from "../entities/video-rendition.entity";
import { Video } from "../entities/video.entity";
import { ModerationActionsService } from "../moderation-actions.service";
import { StorageService } from "../storage.service";
import { AnalyzeJobData } from "../types/analyze-job-data.type";
import { ModerationStatus } from "../types/moderation-status.type";
import { RenditionStatus } from "../types/rendition-status.type";
import { VideoStatus } from "../types/video-status.type";
import { isBlockedStatus } from "./util/moderation.policy.util";

@Injectable()
export class ModerationAdminService {
  constructor(
    private readonly actions: ModerationActionsService,
    private readonly storageService: StorageService,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(VideoRendition)
    private readonly videoRenditionRepository: Repository<VideoRendition>,
    @InjectRepository(VideoModeration)
    private readonly videoModerationRepository: Repository<VideoModeration>,
    @InjectQueue(QUEUES.ANALYZE)
    private readonly analyzeQueue: Queue,
  ) { }

  async listQueue(page: number, limit: number) {
    const [videos, total] = await this.videoRepository.findAndCount({
      where: { moderationStatus: In([ModerationStatus.NEEDS_REVIEW, ModerationStatus.QUARANTINED]) },
      order: { moderatedAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit
    })

    const history = videos.length
      ? await this.videoModerationRepository.find({
        where: { videoId: In(videos.map(v => v.id)) },
        order: { createdAt: 'DESC' },
      })
      : []

    return {
      total,
      page,
      limit,
      items: videos.map(video => ({
        publicId: video.publicId,
        title: video.title,
        description: video.description,
        moderationStatus: video.moderationStatus,
        moderationReason: video.moderationReason,
        moderatedAt: video.moderatedAt,
        thumbnailUrl: video.thumbnailKey ? this.storageService.getPublicUrl(video.thumbnailKey) : null,
        history: history
          .filter(entry => entry.videoId === video.id)
          .map(({ source, status, reason, flags, summary, model, costUsd, createdAt }) => ({
            source, status, reason, flags, summary, model, costUsd, createdAt,
          })),
      })),
    }
  }

  async approve(admin: User, publicId: string) {
    const video = await this.findOrFail(publicId)
    const wasBlocked = isBlockedStatus(video.moderationStatus)

    await this.actions.apply(video, {
      source: 'admin',
      decision: { status: ModerationStatus.APPROVED, reason: null },
      reviewerId: admin.id,
    })

    if (wasBlocked) {
      await this.reprocess(video)
    }
    return {
      publicId,
      moderationStatus: ModerationStatus.APPROVED,
    }
  }

  async reject(admin: User, publicId: string, reason: string) {
    const video = await this.findOrFail(publicId)

    await this.actions.apply(video, {
      source: 'admin',
      decision: {
        status: ModerationStatus.REJECTED,
        reason,
      },
      reviewerId: admin.id,
    })

    return { publicId, moderationStatus: ModerationStatus.REJECTED }
  }

  private async findOrFail(publicId: string) {
    const video = await this.videoRepository.findOneBy({ publicId })
    if (!video) {
      throw new NotFoundException('Video not found')
    }
    return video
  }

  private async reprocess(video: Video) {
    await this.videoRenditionRepository.update({ videoId: video.id }, { status: RenditionStatus.PENDING, progress: 0 })
    await this.videoRepository.update(video.id, {
      status: VideoStatus.UPLOADED,
      hlsMasterKey: () => 'NULL',
      storyboard: () => 'NULL',
      thumbnailKey: () => 'NULL',
      thumbnailSmallKey: () => 'NULL',
      thumbnailMediumKey: () => 'NULL',
      thumbnailLargeKey: () => 'NULL',
    })

    const data: AnalyzeJobData = { publicId: video.publicId, skipModeration: true }
    
    await this.analyzeQueue.add('analyze', data, {
      jobId: `analyze-${video.publicId}-${Date.now()}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    })
  }
}
