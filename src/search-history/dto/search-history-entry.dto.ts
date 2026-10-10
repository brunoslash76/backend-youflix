import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from "class-validator";
import { MAX_TERM_LENGTH } from "../constants/search-history.constants";

export class SearchHistoryEntryDto {
  @ApiProperty({
    example: 'breaking bad',
    maxLength: MAX_TERM_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_TERM_LENGTH)
  term: string;

  @ApiProperty({
    description: 'Epoch milliseconds',
    example: 1791651600000,
  })
  @IsInt()
  @Min(0)
  searchedAt: number;
}
