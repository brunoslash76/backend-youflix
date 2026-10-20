import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileAsync } from "./utils/exec-file-async.util";
import { ffmpegInputArgs, REMOTE_INPUT_PROTOCOLS, SupportedMimeType } from "./utils/ffmpeg-input-args.util";

const IMAGE_DEMUXER = {
  'image/jpeg': 'jpeg_pipe',
  'image/png': 'png_pipe',
  'image/webp': 'webp_pipe',
} as const

@Injectable()
export class ThumbnailService {
  async probeDurationSeconds(inputUrl: string, contentType: SupportedMimeType): Promise<number | null> {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v', 'error',
        ...ffmpegInputArgs(contentType, REMOTE_INPUT_PROTOCOLS),
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
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
            '-vf', 'thumbnail=60,scale=1280:-2',
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

  async imageToJpeg(inputUrl: string, contentType: string): Promise<Buffer> {
    const demuxer = IMAGE_DEMUXER[contentType as keyof typeof IMAGE_DEMUXER]

    if (!demuxer) throw new BadRequestException('Unsupported image type')

    const dir = await mkdtemp(join(tmpdir(), 'you-flix-'))
    const outPath = join(dir, 'custom.jpg')

    try {
      await execFileAsync('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-f', demuxer, '-protocol_whitelist', REMOTE_INPUT_PROTOCOLS,
        '-i', inputUrl,
        '-vf', "scale='min(1280,iw)':-2",
        '-frames:v', '1', '-q:v', '3',
        outPath,
      ], { timeout: 30_000 })
      return await readFile(outPath)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }
}