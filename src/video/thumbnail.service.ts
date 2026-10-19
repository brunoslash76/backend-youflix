import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileAsync } from "./utils/exec-file-async.util";
import { ffmpegInputArgs, REMOTE_INPUT_PROTOCOLS, SupportedMimeType } from "./utils/ffmpeg-input-args.util";

@Injectable()
export class ThumbnailService {
  async probeDurationSeconds(inputUrl: string, contentType: SupportedMimeType): Promise<number | null> {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v', 'error',
        ...ffmpegInputArgs(contentType, REMOTE_INPUT_PROTOCOLS),
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:noKey=1',
        inputUrl,
      ],
      { timeout: 30_000 }
    );

    const duration = Number.parseFloat(stdout.trim());
    return Number.isFinite(duration) ? duration : null;
  }

  async extractFrames(inputUrl: string, contentType: SupportedMimeType, atSeconds: number[]): Promise<Buffer[]> {
    const dir = await mkdtemp(join(tmpdir(), 'you-flix-'));

    try {
      const frames: Buffer[] = [];
      for (const [index, at] of atSeconds.entries()) {
        const outPath = join(dir, `frame-${index}.jpg`);
        await execFileAsync(
          'ffmpeg',
          [
            '-hide_banner', '-loglevel', 'error', '-y',
            '-ss', at.toFixed(3),
            ...ffmpegInputArgs(contentType, REMOTE_INPUT_PROTOCOLS),
            '-i', inputUrl,
            '-frames:v', '1',
            '-vf', 'scale=1280:-2',
            '-q:v', '3',
            outPath,
          ],
          { timeout: 120_000 }
        );
        frames.push(await readFile(outPath))
      }
      return frames;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to extract frames');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}