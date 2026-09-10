import { CreateMultipartUploadCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { createWriteStream } from "fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { config } from "../config";
import { contentTypeFor } from "./utils/upload-directory.util";


@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly signingClient: S3Client;
  private static readonly UPLOAD_CONCURRENCY = 8;

  constructor() {
    this.client = new S3Client({
      region: config.aws.s3.region,
      credentials: {
        accessKeyId: config.aws.s3.accessKeyId!,
        secretAccessKey: config.aws.s3.secretAccessKey!,
      },
      ...(config.aws.s3.endpoint
        ? { endpoint: config.aws.s3.endpoint, forcePathStyle: true }
        : {}),
    });

    const signingEndpoint = config.aws.s3.publicEndpoint ?? config.aws.s3.endpoint;
    this.signingClient = new S3Client({
      region: config.aws.s3.region,
      credentials: {
        accessKeyId: config.aws.s3.accessKeyId!,
        secretAccessKey: config.aws.s3.secretAccessKey!,
      },
      ...(signingEndpoint
        ? { endpoint: signingEndpoint, forcePathStyle: true }
        : {}),
    });
  }

  async uploadDirectory(localDir: string, keyPrefix: string): Promise<number> {
    const files = await readdir(localDir)
    let totalBytes = 0; 1

    for (let i = 0; i < files.length; i += StorageService.UPLOAD_CONCURRENCY) {
      const batch = files.slice(i, i + StorageService.UPLOAD_CONCURRENCY);

      const sizes = await Promise.all(batch.map(async (file) => {
        const body = await readFile(join(localDir, file))
        await this.putObject(
          `${keyPrefix}/${file}`,
          body,
          contentTypeFor(file),
          file.endsWith('.m3u8')
            ? 'public, max-age=300'
            : 'public, max-age=31536000, immutable',
        )
        return body.byteLength;
      }))
      totalBytes += sizes.reduce((a, b) => a + b, 0);
    }
    return totalBytes;
  }

  async getPresignedPutUrl(key: string, contentType: string, contentLength: number) {
    try {
      return await getSignedUrl(
        this.signingClient,
        new PutObjectCommand({
          Bucket: config.aws.s3.bucket,
          Key: key,
          ContentType: contentType,
          ContentLength: contentLength,
        }),
        { expiresIn: 600 },
      );
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to get presigned put url');
    }
  }

  async headObject(key: string) {
    try {
      return await this.client.send(
        new HeadObjectCommand({ Bucket: config.aws.s3.bucket, Key: key })
      );
    } catch (error: unknown) {
      const name = error && typeof error === 'object' && 'name' in error
        ? String(error.name)
        : '';
      if (name === 'NotFound' || name === 'NotFoundError' || name === 'NoSuchKey') {
        return null;
      }
      console.error(error);
      throw new InternalServerErrorException('Failed to head object');
    }
  }

  async getInternalPresignedGetUrl(key: string, expiresIn = 900) {
    return await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: config.aws.s3.bucket,
        Key: key,
      }),
      { expiresIn }
    );
  }

  async getPublicPresignedGetUrl(key: string, expiresIn = 3600) {
    return await getSignedUrl(
      this.signingClient,
      new GetObjectCommand({
        Bucket: config.aws.s3.bucket,
        Key: key,
      }),
      { expiresIn }
    )
  }

  getPublicUrl(key: string) {
    if (config.aws.s3.cdnUrl) {
      return `${config.aws.s3.cdnUrl}/${key}`;
    }

    const baseUrl = config.aws.s3.publicEndpoint ?? config.aws.s3.endpoint;
    return `${baseUrl}/${config.aws.s3.bucket}/${key}`;
  }

  async putObject(key: string, body: Buffer, contentType: string, cacheControl?: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: config.aws.s3.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...(cacheControl ? { CacheControl: cacheControl } : {}),
      })
    )
  }

  async createMultipartUpload(key: string, contentType: string) {
    try {
      const res = await this.client.send(
        new CreateMultipartUploadCommand({
          Bucket: config.aws.s3.bucket,
          Key: key,
          ContentType: contentType,
        })
      );

      return res.UploadId!;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to create multipart upload');
    }
  }

  async presignUploadParts(key: string, uploadId: string, partNumbers: number[]) {
    try {
      return await Promise.all(partNumbers.map(async (partNumber) => ({
        partNumber,
        url: await getSignedUrl(
          this.signingClient,
          new UploadPartCommand({
            Bucket: config.aws.s3.bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
          }),
          { expiresIn: 3600 },
        )
      })))
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to presign upload parts');
    }
  }

  async downloadToFile(key: string, destPath: string) {
    const res = await this.client.send(
      new GetObjectCommand({
        Bucket: config.aws.s3.bucket,
        Key: key,
      })
    )

    if (!res.Body) {
      throw new InternalServerErrorException('Empty object body');
    }

    await pipeline(res.Body as Readable, createWriteStream(destPath))
  }
}
