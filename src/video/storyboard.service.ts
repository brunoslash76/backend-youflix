import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { readdir } from "fs/promises"
import { join } from "path"
import { Repository } from "typeorm"
import { storyboardPrefix } from "./constants/transcode.constants"
import { VideoRendition } from "./entities/video-rendition.entity"
import { Video } from "./entities/video.entity"
import { SourceFileService } from "./source-file.service"
import { StorageService } from "./storage.service"
import { VideoStoryboard } from "./types/video-storyboard.types"
import { execFileAsync } from "./utils/exec-file-async.util"

const TILE_LONG_SIDE = 160
const COLUMNS = 10
const ROWS = 10
const MIN_INTERVAL_SECONDS = 5
const MAX_TILES = 600

const even = (value: number) => Math.max(2, Math.round(value / 2) * 2)

@Injectable()
export class StoryboardService {
  constructor(
    private readonly storageService: StorageService,
    private readonly sourceFileService: SourceFileService,
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
  ) { }

  async generate(video: Video, lowest: VideoRendition): Promise<VideoStoryboard> {
    const duration = video.durationSeconds ?? 0
    const width = video.sourceWidth ?? lowest.width
    const height = video.sourceHeight ?? lowest.height
    const intervalSeconds = Math.max(MIN_INTERVAL_SECONDS, Math.ceil(duration / MAX_TILES))
    const scale = TILE_LONG_SIDE / Math.max(width, height)
    const tileWidth = even(width * scale)
    const tileHeight = even(height * scale)

    const sheetCount = await this.sourceFileService.withWorkDir(`${video.publicId}-storyboard`, async (dir: string) => {
      await execFileAsync('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
        '-i', this.storageService.getInternalUrl(lowest.playlistKey),
        '-an',
        '-vf', `fps=1/${intervalSeconds},scale=${tileWidth}:${tileHeight},tile=${COLUMNS}x${ROWS}`,
        '-fps_mode', 'vfr',
        '-q:v', '5',
        join(dir, 'sprite-%03d.jpg'),
      ], { timeout: 10 * 60_000 })
      await this.storageService.uploadDirectory(dir, storyboardPrefix(video.publicId))
      return (await readdir(dir)).length
    })

    const storyboard: VideoStoryboard = {
      sheetCount,
      tileCount: Math.max(1, Math.ceil(duration / intervalSeconds)),
      tileWidth,
      tileHeight,
      columns: COLUMNS,
      rows: ROWS,
      intervalSeconds,
    }

    await this.videoRepository.update(video.id, { storyboard })
    return storyboard
  }
}