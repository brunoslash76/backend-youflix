import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { masterKey } from "./constants/transcode.constants";
import { VideoRendition } from "./entities/video-rendition.entity";
import { Video } from "./entities/video.entity";
import { StorageService } from "./storage.service";
import { RenditionStatus } from "./types/rendition-status.type";
import { VideoStatus } from "./types/video-status.type";
import { buildMasterPlaylist } from "./utils/master-playlist.util";

@Injectable()
export class HlsPublisherService {
  constructor(
    private readonly storageService: StorageService,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(VideoRendition)
    private readonly videoRenditionRepository: Repository<VideoRendition>
  ) { }

  async publish(video: Video, hasAudio: boolean): Promise<VideoRendition[]> {
    const renditions = await this.videoRenditionRepository.find({
      where: { videoId: video.id, status: RenditionStatus.READY },
      order: { height: 'ASC' },
    })

    if (!renditions.length) return renditions

    const key = masterKey(video.publicId)
    await this.storageService.putObject(
      key,
      Buffer.from(buildMasterPlaylist(renditions, hasAudio)),
      'application/vnd.apple.mpegurl',
      'public, max-age=30'
    )
    await this.videoRepository.update(video.id, { hlsMasterKey: key, status: VideoStatus.READY })

    return renditions
  }
}