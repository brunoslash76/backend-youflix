import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { StorageService } from "./storage.service";

@Injectable()
export class SourceFileService {
  private readonly root = process.env.TRANSCODE_TMP ?? '/tmp/transcode';

  constructor(private readonly storage: StorageService) { }

  async withSource<T>(
    publicId: string,
    storageKey: string,
    fn: (ctx: { dir: string; sourcePath: string }) => Promise<T>
  ): Promise<T> {
    const dir = join(this.root, `${publicId}-${randomUUID()}`)
    await mkdir(dir, { recursive: true });
    const sourcePath = join(dir, 'source')
    try {
      await this.storage.downloadToFile(storageKey, sourcePath)
      return await fn({ dir, sourcePath })
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }
}