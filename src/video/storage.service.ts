import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { config } from "../config";


@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly signingClient: S3Client;

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
}
