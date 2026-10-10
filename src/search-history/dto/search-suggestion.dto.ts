import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { MAX_TERM_LENGTH } from "../constants/search-history.constants";

export class SearchSuggestionsQueryDto {
  @ApiPropertyOptional({
    description: 'Prefix to filter suggestions',
    example: 'brea'
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_TERM_LENGTH)
  q?: string;
}