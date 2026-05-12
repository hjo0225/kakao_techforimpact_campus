import { Controller, Get } from '@nestjs/common';
import { RankingsService } from './rankings.service';

@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get('teams')
  getTeams() {
    return this.rankingsService.getTeamRankings();
  }
}
