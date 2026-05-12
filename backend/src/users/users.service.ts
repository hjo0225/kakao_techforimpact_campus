import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(id) },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다');
    return {
      id: user.id.toString(),
      nickname: user.nickname,
      profileImage: user.profileImage,
      teamCode: user.teamCode,
      avatarConfig: user.avatarConfig,
      createdAt: user.createdAt,
    };
  }

  async updateTeam(id: string, teamCode: string) {
    const user = await this.prisma.user.update({
      where: { id: BigInt(id) },
      data: { teamCode },
    });
    return { id: user.id.toString(), teamCode: user.teamCode };
  }

  async updateAvatar(id: string, avatarConfig: object) {
    const user = await this.prisma.user.update({
      where: { id: BigInt(id) },
      data: { avatarConfig },
    });
    return { id: user.id.toString(), avatarConfig: user.avatarConfig };
  }
}
