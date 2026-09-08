import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile)

@Injectable()
export class ThumbnailService {
  async probeDurationSeconds(inputUrl: string): Promise<number | null> {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:noKey=1',
        inputUrl,
      ],
      { timeout: 30_000 }
    );

    const duration = Number.parseFloat(stdout.trim());
    return Number.isFinite(duration) ? duration : null;
  }

  async extractFrames(inputUrl: string, atSeconds: number[]): Promise<Buffer[]> {
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