import { Injectable } from "@nestjs/common";
import { ProbeResult } from "./types/probe-result.type";
import { execFileAsync } from "./utils/exec-file-async.util";




@Injectable()
export class MediaProbeService {
  async probe(inputPath: string): Promise<ProbeResult> {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      inputPath,
    ],
      { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 }
    );

    const probe = JSON.parse(stdout);
    const video = probe.streams?.find((stream: any) => stream.codec_type === 'video')

    if (!video) throw new Error('File contains no video stram')

    const [num, den] = String(video.r_frame_rate ?? '0/1').split('/').map(Number);

    return {
      durationSeconds: Number(probe.format?.duration ?? 0),
      width: Number(video.width),
      height: Number(video.height),
      fps: den ? num / den : num,
      hasAudio: Boolean(probe.streams?.some((s: any) => s.codec_type === 'audio')),
    }
  }
}
