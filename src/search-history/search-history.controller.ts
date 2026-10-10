import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBadRequestResponse, ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { ErrorResponseDto, SuccessResponseDto } from "../common/dtos/api-response.dto";
import { CurrentUser } from "../decorators/current-user.decorator";
import { User } from "../user/entities/user.entity";
import { ImportSearchHistoryDto } from "./dto/import-search-history.dto";
import { RecordSearchDto } from "./dto/record-search.dto";
import { SearchSuggestionResponseDto } from "./dto/search-suggestion-response.dto";
import { SearchSuggestionsQueryDto } from "./dto/search-suggestion.dto";
import { SearchHistoryService } from "./search-history.service";

@ApiTags('search-history')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@Controller('search-history')
export class SearchHistoryController {
  constructor(private readonly searchHistoryService: SearchHistoryService) { }

  @Get()
  @ApiOperation({ summary: 'Get search suggestions', description: 'Most recent searches of the current user, optionally filtered by prefix.' })
  @ApiOkResponse({ type: SearchSuggestionResponseDto })
  async findRecent(
    @CurrentUser() user: User,
    @Query() query: SearchSuggestionsQueryDto
  ) {
    return { data: await this.searchHistoryService.findRecent(user.id, query.q) }
  }

  @Post()
  @ApiOperation({ summary: 'Record a search' })
  @ApiBadRequestResponse({ description: 'Invalid search term', type: ErrorResponseDto })
  @ApiCreatedResponse({ type: SuccessResponseDto })
  async record(@CurrentUser() user: User, @Body() body: RecordSearchDto) {
    await this.searchHistoryService.record(user.id, body.term)
    return { success: true }
  }

  @Post('import')
  @ApiOperation({ summary: 'Import anonymous search history', description: 'Merges searches made before login. Newer timestamps win.' })
  @ApiCreatedResponse({ type: SuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid entries', type: ErrorResponseDto })
  async import(@CurrentUser() user: User, @Body() body: ImportSearchHistoryDto) {
    await this.searchHistoryService.import(user.id, body.entries)
    return { success: true }
  }
}
