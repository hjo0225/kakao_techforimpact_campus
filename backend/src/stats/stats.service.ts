import { Injectable } from '@nestjs/common';
import { UsageKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface MyStats {
  points: number;
  useCount: number;
  returnCount: number;
  totalCount: number;
}

export interface MyUsageLog {
  id: string;
  kind: UsageKind;
  score: number;
  gameLabel: string | null;
  scannedAt: string;
}

const DEFAULT_LOG_LIMIT = 20;
const MAX_LOG_LIMIT = 100;

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyStats(userId: string): Promise<MyStats> {
    const rows = await this.prisma.usage.groupBy({
      by: ['kind'],
      where: { userId: BigInt(userId) },
      _sum: { score: true },
      _count: { _all: true },
    });

    let points = 0;
    let useCount = 0;
    let returnCount = 0;

    for (const row of rows) {
      points += row._sum.score ?? 0;
      if (row.kind === UsageKind.USE) useCount = row._count._all;
      else if (row.kind === UsageKind.RETURN) returnCount = row._count._all;
    }

    return {
      points,
      useCount,
      returnCount,
      totalCount: useCount + returnCount,
    };
  }

  async getMyLogs(userId: string, limit?: number): Promise<MyUsageLog[]> {
    const take = Math.min(
      Math.max(1, Math.trunc(limit ?? DEFAULT_LOG_LIMIT)),
      MAX_LOG_LIMIT,
    );

    const usages = await this.prisma.usage.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { scannedAt: 'desc' },
      take,
      include: {
        game: {
          select: {
            homeTeam: { select: { displayName: true } },
            awayTeam: { select: { displayName: true } },
          },
        },
      },
    });

    return usages.map((u) => ({
      id: u.id.toString(),
      kind: u.kind,
      score: u.score,
      gameLabel: u.game
        ? `${u.game.homeTeam.displayName} vs ${u.game.awayTeam.displayName}`
        : null,
      scannedAt: u.scannedAt.toISOString(),
    }));
  }
}
