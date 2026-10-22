import { Injectable } from "@nestjs/common"
import { readFile } from "fs/promises"
import { join } from "path"
import { MODERATION_SAMPLE_HEIGHT, MODERATION_SAMPLES_FPS } from "../constants/moderation.constant"
import { execFileAsync } from "../utils/exec-file-async.util"
import { ffmpegInputArgs, RECONNECT_ARGS, REMOTE_INPUT_PROTOCOLS, SupportedMimeType } from "../utils/ffmpeg-input-args.util"

export interface ModerationChunk {
  startSeconds: number
  video: Buffer
  audio: Buffer | null
}

interface ExtractChunckOptions {
  source: string
  contentType: SupportedMimeType
  startSeconds: number
  durationSeconds: number
  hasAudio: boolean
  dir: string
}

@Injectable()
export class ModerationSamplerService {
  async extractChunck({
    source,
    contentType,
    startSeconds,
    durationSeconds,
    hasAudio,
    dir
  }: ExtractChunckOptions): Promise<ModerationChunk> {
    const videoPath = join(dir, `chunk-${startSeconds}.mp4`)
    const audioPath = join(dir, `chunk-${startSeconds}.mp3`)

    await execFileAsync('ffmpeg',
      [
        '-hide_banner', '-loglevel', 'error', '-y',
        ...ffmpegInputArgs(contentType, REMOTE_INPUT_PROTOCOLS),
        ...RECONNECT_ARGS,
        '-ss', String(startSeconds),
        '-t', String(durationSeconds),
        '-i', source,
        '-map', '0:v:0', '-an',
        '-vf', `fps=${MODERATION_SAMPLES_FPS},scale=-2:'trunc(min(${MODERATION_SAMPLE_HEIGHT},ih)/2)*2'`,
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '32', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        videoPath,
        ...(hasAudio
          ? ['-map', '0:a:0', '-vn', '-c:a', 'libmp3lame', '-b:a', '32k', '-ac', '1', '-ar', '16000', audioPath]
          : []),
      ],
      { timeout: 5 * 60_000, maxBuffer: 10 * 1024 * 1024 }
    )

    const [video, audio] = await Promise.all([
      readFile(videoPath),
      hasAudio ? readFile(audioPath) : Promise.resolve(null),
    ])

    return { startSeconds, video, audio }
  }
}
