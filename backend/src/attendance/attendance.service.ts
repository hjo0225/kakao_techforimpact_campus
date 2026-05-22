import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface GameSummary {
  gameId: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  venue: string;
  homeTeam: { code: string; displayName: string };
  awayTeam: { code: string; displayName: string };
}

export interface MyAttendance {
  // 선택했지만 아직 경기 날짜가 지나지 않은 '현재 선택'
  current: GameSummary | null;
  // 경기 날짜가 지나도록 취소하지 않아 직관으로 확정된 방문 (최신순)
  visits: GameSummary[];
}

const gameInclude = {
  game: {
    select: {
      id: true,
      date: true,
      startTime: true,
      venue: true,
      homeTeam: { select: { code: true, displayName: true } },
      awayTeam: { select: { code: true, displayName: true } },
    },
  },
} as const;

// KST(UTC+9) 기준 오늘 날짜 YYYY-MM-DD
function todayKstIso(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

type GameRow = {
  id: bigint;
  date: Date;
  startTime: string;
  venue: string;
  homeTeam: { code: string; displayName: string };
  awayTeam: { code: string; displayName: string };
};

function toSummary(game: GameRow): GameSummary {
  return {
    gameId: game.id.toString(),
    date: game.date.toISOString().slice(0, 10),
    startTime: game.startTime,
    venue: game.venue,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
  };
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  // 경기 선택 = 직관 의향 등록. 동시에 아직 안 지난 다른 선택은 취소(현재 선택은 1개만 유지).
  async select(userId: string, gameId: string): Promise<GameSummary> {
    const uid = BigInt(userId);
    const gid = BigInt(gameId);

    const game = await this.prisma.game.findUnique({
      where: { id: gid },
      select: gameInclude.game.select,
    });
    if (!game) throw new NotFoundException('존재하지 않는 경기입니다');

    const today = todayKstIso();

    await this.prisma.$transaction(async (tx) => {
      // 아직 경기 날짜가 안 지난 다른 활성 선택 취소 → 현재 선택은 항상 1개
      const activeUpcoming = await tx.attendance.findMany({
        where: { userId: uid, canceledAt: null, gameId: { not: gid } },
        select: { id: true, game: { select: { date: true } } },
      });
      const toCancel = activeUpcoming
        .filter((a) => a.game.date.toISOString().slice(0, 10) >= today)
        .map((a) => a.id);
      if (toCancel.length > 0) {
        await tx.attendance.updateMany({
          where: { id: { in: toCancel } },
          data: { canceledAt: new Date() },
        });
      }

      await tx.attendance.upsert({
        where: { userId_gameId: { userId: uid, gameId: gid } },
        create: { userId: uid, gameId: gid },
        update: { canceledAt: null, selectedAt: new Date() },
      });
    });

    return toSummary(game);
  }

  // 현재 선택 취소 (직관 미인정). 이미 취소돼 있으면 멱등.
  async cancel(userId: string, gameId: string): Promise<void> {
    await this.prisma.attendance.updateMany({
      where: {
        userId: BigInt(userId),
        gameId: BigInt(gameId),
        canceledAt: null,
      },
      data: { canceledAt: new Date() },
    });
  }

  async getMine(userId: string): Promise<MyAttendance> {
    const active = await this.prisma.attendance.findMany({
      where: { userId: BigInt(userId), canceledAt: null },
      orderBy: { selectedAt: 'desc' },
      include: gameInclude,
    });

    const today = todayKstIso();
    let current: GameSummary | null = null;
    const visits: GameSummary[] = [];

    for (const a of active) {
      const summary = toSummary(a.game);
      if (summary.date >= today) {
        // 아직 안 지난 선택 — 가장 최근 선택을 현재로
        if (!current) current = summary;
      } else {
        // 경기 날짜가 지났고 취소 안 됨 → 직관 확정
        visits.push(summary);
      }
    }

    visits.sort((a, b) => (a.date < b.date ? 1 : -1)); // 최신순
    return { current, visits };
  }
}
