import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AttendanceService } from './attendance.service';
import { SelectGameDto } from './dto/select-game.dto';

interface AuthedRequest {
  user: { userId: string };
}

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('me')
  getMine(@Request() req: AuthedRequest) {
    return this.attendanceService.getMine(req.user.userId);
  }

  @Post()
  @HttpCode(200)
  select(@Request() req: AuthedRequest, @Body() body: SelectGameDto) {
    return this.attendanceService.select(req.user.userId, body.gameId);
  }

  @Delete(':gameId')
  @HttpCode(204)
  async cancel(@Request() req: AuthedRequest, @Param('gameId') gameId: string) {
    await this.attendanceService.cancel(req.user.userId, gameId);
  }
}
