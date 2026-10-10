import { ApiProperty } from "@nestjs/swagger";
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from "class-validator";
import { MAX_STORED_TERMS } from "../constants/search-history.constants";
import { SearchHistoryEntryDto } from "./search-history-entry.dto";

export class ImportSearchHistoryDto {
  @ApiProperty({ type: [SearchHistoryEntryDto] })
  @IsArray()
  @ArrayMaxSize(MAX_STORED_TERMS)
  @ValidateNested({ each: true })
  @Type(() => SearchHistoryEntryDto)
  entries: SearchHistoryEntryDto[];
}
