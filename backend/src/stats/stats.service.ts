import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const UsageKind = {
  USE: 'USE',
  RETURN: 'RETURN',
} as const;

type UsageKind = (typeof UsageKind)[keyof typeof UsageKind];

export interface MyStats {
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
    const [rows, confirmedCount] = await Promise.all([
      this.prisma.usage.groupBy({
        by: ['kind'],
        where: { userId: BigInt(userId) },
        _count: { _all: true },
      }),
      // 누적 인증 = 라벨 확정된 샘플 전체 (일회용기 + 다회용기)
      this.prisma.verificationSample.count({
        where: { userId: BigInt(userId), status: 'CONFIRMED' },
      }),
    ]);

    let useCount = 0;
    let returnCount = 0;

    for (const row of rows) {
      if (row.kind === UsageKind.USE) useCount = row._count._all;
      else if (row.kind === UsageKind.RETURN) returnCount = row._count._all;
    }

    return {
      useCount,
      returnCount,
      // 누적 인증 = 일회+다회 라벨 확정 전체. (useCount는 다회용기 라벨 건만 — usage는 REUSABLE일 때만 생성)
      totalCount: confirmedCount,
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
