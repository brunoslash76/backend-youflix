import { Injectable } from "@nestjs/common";
import { spawn } from "child_process";
import { mkdir } from "fs/promises";
import { join } from "path";
import { Rung, SEGMENT_SECONDS } from "./constants/transcode.constants";

interface TranscodeRenditionOptions {
  sourcePath: string;
  outDir: string;
  rung: Rung;
  hasAudio: boolean;
  durationSeconds: number;
  onProgress?: (pct: number) => void;
}

@Injectable()
export class TranscodeService {
  async transcodeRendition(opts: TranscodeRenditionOptions): Promise<void> {
    const {
      sourcePath,
      outDir,
      rung,
      hasAudio,
      durationSeconds,
      onProgress,
    } = opts

    await mkdir(outDir, { recursive: true });

    const args = [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-i', sourcePath,
      '-vf', `scale=-2:${rung.height}`,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '21',
      '-maxrate', `${rung.videoKbps}k`,
      '-bufsize', `${rung.videoKbps * 2}k`,
      '-profile:v', rung.profile,
      '-level', rung.level,
      '-pix_fmt', 'yuv420p',
      '-force_key_frames', `expr:gte(t,n_forced*${SEGMENT_SECONDS})`,
      ...(hasAudio
        ? ['-c:a', 'aac', '-b:a', `${rung.audioKbps}k`, '-ac', '2', '-ar', '48000']
        : ['-an']),
      '-f', 'hls',
      '-hls_time', String(SEGMENT_SECONDS),
      '-hls_playlist_type', 'vod',
      '-hls_segment_type', 'fmp4',
      '-hls_flags', 'independent_segments',
      '-hls_fmp4_init_filename', 'init.mp4',
      '-hls_segment_filename', join(outDir, 'seg-%05d.m4s'),
      '-progress', 'pipe:1', '-nostats',
      join(outDir, 'playlist.m3u8'),
    ]

    await this.run(args, durationSeconds, onProgress)
  }

  private run(args: string[], durationSeconds: number, onProgress?: (pct: number) => void) {
    return new Promise<void>((resolve, reject) => {
      const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
      let stderrTail = '';

      child.stdout.on('data', (chunk: Buffer) => {
        const matches = [...chunk.toString().matchAll(/out_time_us=(\d+)/g)]
        const last = matches.at(-1);

        if (last && durationSeconds > 0 && onProgress) {
          const seconds = Number(last[1]) / 1_000_000;
          onProgress(Math.min(99, Math.round(seconds / durationSeconds) * 100));
        }
      })

      child.stderr.on('data', (chunk: Buffer) => {
        stderrTail = (stderrTail + chunk.toString()).slice(-4000)
      })

      child.on('error', reject)
      child.on('close', (code) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderrTail}`)))
    })
  }
}
