import { Controller, Get, Query } from '@nestjs/common';
import { FindGamesDto } from './dto/find-games.dto';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  find(@Query() query: FindGamesDto) {
    return this.gamesService.find(query);
  }
}
