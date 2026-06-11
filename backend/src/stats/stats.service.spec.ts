import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from './stats.service';

const UsageKind = {
  USE: 'USE',
  RETURN: 'RETURN',
} as const;

type AnyFn = jest.Mock<unknown, unknown[]>;
interface PrismaStub {
  usage: { groupBy: AnyFn; findMany: AnyFn };
  verificationSample: { count: AnyFn };
}

describe('StatsService', () => {
  let service: StatsService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    prisma = {
      usage: {
        groupBy: jest.fn<unknown, unknown[]>(),
        findMany: jest.fn<unknown, unknown[]>(),
      },
      verificationSample: {
        count: jest.fn<unknown, unknown[]>().mockResolvedValue(0),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [StatsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(StatsService);
    jest.clearAllMocks();
  });

  it('totalCount = 라벨 확정 샘플 수 (일회+다회 전체)', async () => {
    prisma.usage.groupBy.mockResolvedValue([
      { kind: UsageKind.USE, _count: { _all: 7 } },
      { kind: UsageKind.RETURN, _count: { _all: 5 } },
    ]);
    prisma.verificationSample.count.mockResolvedValue(15); // 다회 12 + 일회 3 등

    const stats = await service.getMyStats('1');

    expect(stats).toEqual({
      useCount: 7,
      returnCount: 5,
      totalCount: 15,
    });
    expect(prisma.verificationSample.count).toHaveBeenCalledWith({
      where: { userId: BigInt('1'), status: 'CONFIRMED' },
    });
  });

  it('빈 결과 → 모든 값 0', async () => {
    prisma.usage.groupBy.mockResolvedValue([]);

    const stats = await service.getMyStats('1');

    expect(stats).toEqual({
      useCount: 0,
      returnCount: 0,
      totalCount: 0,
    });
  });

  it('일회용기만 라벨링(usage 없음) → useCount 0, totalCount는 확정 수', async () => {
    prisma.usage.groupBy.mockResolvedValue([]);
    prisma.verificationSample.count.mockResolvedValue(3);

    const stats = await service.getMyStats('1');

    expect(stats).toEqual({
      useCount: 0,
      returnCount: 0,
      totalCount: 3,
    });
  });

  it('userId를 BigInt로 변환해 where에 전달', async () => {
    prisma.usage.groupBy.mockResolvedValue([]);

    await service.getMyStats('123');

    const call = prisma.usage.groupBy.mock.calls[0][0] as {
      where: { userId: bigint };
    };
    expect(call.where.userId).toBe(123n);
  });

  describe('getMyLogs', () => {
    it('usage를 타임라인 형태로 매핑 (game 있음/없음)', async () => {
      prisma.usage.findMany.mockResolvedValue([
        {
          id: 2n,
          kind: UsageKind.RETURN,
          score: 100,
          scannedAt: new Date('2026-05-22T11:18:00.000Z'),
          game: {
            homeTeam: { displayName: 'LG 트윈스' },
            awayTeam: { displayName: '두산 베어스' },
          },
        },
        {
          id: 1n,
          kind: UsageKind.USE,
          score: 50,
          scannedAt: new Date('2026-05-22T09:42:00.000Z'),
          game: null,
        },
      ]);

      const logs = await service.getMyLogs('1');

      expect(logs).toEqual([
        {
          id: '2',
          kind: UsageKind.RETURN,
          score: 100,
          gameLabel: 'LG 트윈스 vs 두산 베어스',
          scannedAt: '2026-05-22T11:18:00.000Z',
        },
        {
          id: '1',
          kind: UsageKind.USE,
          score: 50,
          gameLabel: null,
          scannedAt: '2026-05-22T09:42:00.000Z',
        },
      ]);
    });

    it('limit 기본값 20, 최신순 정렬, userId BigInt 변환', async () => {
      prisma.usage.findMany.mockResolvedValue([]);

      await service.getMyLogs('123');

      const call = prisma.usage.findMany.mock.calls[0][0] as {
        where: { userId: bigint };
        orderBy: { scannedAt: string };
        take: number;
      };
      expect(call.where.userId).toBe(123n);
      expect(call.orderBy).toEqual({ scannedAt: 'desc' });
      expect(call.take).toBe(20);
    });

    it('limit은 1~100으로 클램프', async () => {
      prisma.usage.findMany.mockResolvedValue([]);

      await service.getMyLogs('1', 999);
      await service.getMyLogs('1', 0);

      const first = prisma.usage.findMany.mock.calls[0][0] as { take: number };
      const second = prisma.usage.findMany.mock.calls[1][0] as { take: number };
      expect(first.take).toBe(100);
      expect(second.take).toBe(1);
    });
  });
});
