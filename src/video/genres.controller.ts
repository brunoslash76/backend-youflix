import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Genre } from "./entities/genre.entity";
import { GenresService } from "./genres.service";

@ApiTags('genre')
@Controller('genre')
export class GenresController {
  constructor(private readonly genresService: GenresService) {}

  @Get('all')
  @ApiOperation({
    summary: 'Get all genres',
    description: 'Get all genres',
  })
  @ApiOkResponse({ type: [Genre] })
  async getGenres() {
    return this.genresService.getGenres();
  }
}