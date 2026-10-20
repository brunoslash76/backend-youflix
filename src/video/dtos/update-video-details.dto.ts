import { ArrayMinSize, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from "class-validator";

export class UpdateVideoDetailsDto {
  @IsString()
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

  @IsOptional()
  @IsInt()
  @Min(0)
  thumbnailIndex?: number;

  @IsOptional()
  @IsString()
  customThumbnailKey?: string;
}
