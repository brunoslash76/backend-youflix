import { Injectable } from "@nestjs/common";
import { ProbeResult } from "./types/probe-result.type";
import { execFileAsync } from "./utils/exec-file-async.util";
import { ffmpegInputArgs, LOCAL_INPUT_PROTOCOLS, type SupportedMimeType } from "./utils/ffmpeg-input-args.util";

@Injectable()
export class MediaProbeService {
  async probe(inputPath: string, contentType: SupportedMimeType, protocols = LOCAL_INPUT_PROTOCOLS): Promise<ProbeResult> {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      ...ffmpegInputArgs(contentType, protocols),
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      inputPath,
    ],
      { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 }
    );

    const probe = JSON.parse(stdout);
    const video = probe.streams?.find((stream: any) => stream.codec_type === 'video')

    if (!video) throw new Error('File contains no video stream')

    const [num, den] = String(video.r_frame_rate ?? '0/1').split('/').map(Number);
    const rotation = Number(
      video.side_data_list?.find((data: any) => data.rotation !== undefined)?.rotation
      ?? video.tags?.rotate
      ?? 0,
    )

    const rotated = Math.abs(rotation) % 180 === 90
    return {
      durationSeconds: Number(probe.format?.duration ?? 0),
      width: Number(rotated ? video.height : video.width),
      height: Number(rotated ? video.width : video.height),
      fps: den ? num / den : num,
      hasAudio: Boolean(probe.streams?.some((s: any) => s.codec_type === 'audio')),
    }
  }
}
