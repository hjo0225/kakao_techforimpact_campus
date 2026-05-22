import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StatsService } from './stats.service';

interface AuthedRequest {
  user: { userId: string };
}

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('me')
  getMe(@Request() req: AuthedRequest) {
    return this.statsService.getMyStats(req.user.userId);
  }

  @Get('me/logs')
  getMyLogs(
    @Request() req: AuthedRequest,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.statsService.getMyLogs(req.user.userId, limit);
  }
}
