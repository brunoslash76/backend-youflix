import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { MAX_TERM_LENGTH } from "../constants/search-history.constants";

export class RecordSearchDto {
  @ApiProperty({
    example: 'breaking bad',
    maxLength: MAX_TERM_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_TERM_LENGTH)
  term: string;
}
