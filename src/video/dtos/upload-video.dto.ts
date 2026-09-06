import { ArrayMinSize, IsInt, IsMimeType, IsNotEmpty, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";

export class UploadVideoDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  genreIds: string[];

  @IsMimeType()
  contentType: string;

  @IsInt()
  @Min(1)
  @Max(5 * 1024 * 1024 * 1024)
  sizeBytes: number;
}
