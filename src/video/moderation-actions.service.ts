import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { hlsPrefix } from "./constants/transcode.constants";
import { VideoModeration } from "./entities/video-moderation.entity";
import { Video } from "./entities/video.entity";
import { isBlockedStatus } from "./moderation/util/moderation.policy.util";
import { StorageService } from "./storage.service";
import { ModerationEntry } from "./types/moderation-entry.type";


@Injectable()
export class ModerationActionsService {
  constructor(
    private readonly storageService: StorageService,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(VideoModeration)
    private readonly videoModerationRepository: Repository<VideoModeration>
  ) { }
  

  async apply(video: Video, entry: ModerationEntry) {
    const moderation = this.videoModerationRepository.create({
      videoId: video.id,
      source: entry.source,
      status: entry.decision.status,
      reason: entry.decision.reason,
      flags: entry.flags ?? [],
      summary: entry.summary || null,
      model: entry.model ?? null,
      costUsd: entry.costUsd ?? null,
      reviewerId: entry.reviewerId ?? null,
    })

    await this.videoModerationRepository.save(moderation)
    await this.videoRepository.update(video.id, {
      moderationStatus: entry.decision.status,
      moderationReason: entry.decision.reason,
      moderatedAt: new Date(),
    })

    if (isBlockedStatus(entry.decision.status)) await this.removePublicMedia(video.publicId)
  }

  async removePublicMedia(publicId: string) {
    await this.storageService.deletePrefix(`${hlsPrefix(publicId)}/`)
    await this.storageService.deletePrefix(`thumbnails/${publicId}/`)
  }
}