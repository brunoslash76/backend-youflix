import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { PublicRoute } from './decorators/public-route.decorator.js';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @PublicRoute()
  @ApiExcludeEndpoint()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @PublicRoute()
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ schema: { properties: { status: { type: 'string', example: 'ok' }}}})
  health() {
    return {
      status: 'ok',
    }
  }
}
