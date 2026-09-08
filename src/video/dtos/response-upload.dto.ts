import { ApiProperty } from "@nestjs/swagger";
import { VideoStatus } from "../types/video-status.type";

export class CreateUploadResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  publicId: string;

  @ApiProperty({
    example: 'https://your-bucket.s3.amazonaws.com/123e4567-e89b-12d3-a456-426614174000',
    description: 'URL to upload the video to S3',
  })
  uploadUrl: string;

  @ApiProperty({
    enum: VideoStatus,
    example: VideoStatus.PROCESSING,
  })
  status: VideoStatus;

  @ApiProperty({ example: '2026-09-07T14:00:00.000Z' })
  createdAt: Date;
  
  @ApiProperty({ example: '2026-09-07T14:00:00.000Z' })
  updatedAt: Date;
}
