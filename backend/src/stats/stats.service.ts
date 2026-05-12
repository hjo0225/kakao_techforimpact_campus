import { Injectable } from '@nestjs/common';
import { UsageKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface MyStats {
  points: number;
  useCount: number;
  returnCount: number;
  totalCount: number;
}

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
}
