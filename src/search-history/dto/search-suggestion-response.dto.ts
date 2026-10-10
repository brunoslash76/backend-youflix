import { ApiProperty } from "@nestjs/swagger";

export class SearchSuggestionResponseDto {
  @ApiProperty({
    type: [String],
    example: ['breaking bad', 'better call saul']
  })
  data: string[];
}
