import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { UsersService } from './users.service';

interface AuthedRequest {
  user: { userId: string };
}

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getMe(@Request() req: AuthedRequest) {
    return this.usersService.findById(req.user.userId);
  }

  @Patch('team')
  updateTeam(@Request() req: AuthedRequest, @Body() dto: UpdateTeamDto) {
    return this.usersService.updateTeam(req.user.userId, dto.teamCode);
  }

  @Patch('avatar')
  updateAvatar(@Request() req: AuthedRequest, @Body() dto: UpdateAvatarDto) {
    return this.usersService.updateAvatar(req.user.userId, dto.avatarConfig);
  }
}
