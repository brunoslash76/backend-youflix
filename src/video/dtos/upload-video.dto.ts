import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsInt, IsMimeType, IsNotEmpty, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";

export class UploadVideoDto {
  @ApiProperty({
    example: 'My Fist Video',
    minLength: 7,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 'A short clip for testing upload',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    minItems: 1,
    isArray: true,
  })
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  genreIds: string[];

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
