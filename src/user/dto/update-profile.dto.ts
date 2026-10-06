import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John', minLength: 2, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  firstName?: string;
  
  @ApiPropertyOptional({ example: 'Doe', minLength: 2, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  lastName?: string;

  @ApiPropertyOptional({ example: '+5511999999999', minLength: 8, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  phone?: string;
}