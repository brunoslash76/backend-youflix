import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsMimeType, IsNotEmpty, IsString, Max, MaxLength, Min } from "class-validator";

export class UploadVideoDto {
  @ApiProperty({
    example: 'my-trip.mp4',
    description: 'Original file name, used as the draft title',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename: string;

  @ApiProperty({
    example: 'video/mp4',
    type: String,
    format: 'mime-type',
    examples: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  })
  @IsMimeType()
  contentType: string;

  @ApiProperty({
    example: 1024 * 1024 * 1024,
    type: Number,
    format: 'int32',
    minimum: 1,
    maximum: 5 * 1024 * 1024 * 1024,
    description: 'Exact file size in bytes. Must match the file you PUT to uploadUrl',
  })
  @IsInt()
  @Min(1)
  @Max(5 * 1024 * 1024 * 1024)
  sizeBytes: number;
}
