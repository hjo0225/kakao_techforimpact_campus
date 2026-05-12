import { Test } from '@nestjs/testing';
import { UsageKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from './stats.service';

type AnyFn = jest.Mock<unknown, unknown[]>;
interface PrismaStub {
  usage: { groupBy: AnyFn };
}

describe('StatsService', () => {
  let service: StatsService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    prisma = { usage: { groupBy: jest.fn<unknown, unknown[]>() } };
    const moduleRef = await Test.createTestingModule({
      providers: [StatsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(StatsService);
    jest.clearAllMocks();
  });

  it('USE 7 + RETURN 5 → points 850 + 카운트 합산', async () => {
    prisma.usage.groupBy.mockResolvedValue([
      { kind: UsageKind.USE, _sum: { score: 350 }, _count: { _all: 7 } },
      { kind: UsageKind.RETURN, _sum: { score: 500 }, _count: { _all: 5 } },
    ]);

    const stats = await service.getMyStats('1');

    expect(stats).toEqual({
      points: 850,
      useCount: 7,
      returnCount: 5,
      totalCount: 12,
    });
  });

  it('빈 결과 → 모든 값 0', async () => {
    prisma.usage.groupBy.mockResolvedValue([]);

    const stats = await service.getMyStats('1');

    expect(stats).toEqual({
      points: 0,
      useCount: 0,
      returnCount: 0,
      totalCount: 0,
    });
  });

  it('USE만 있음 → returnCount 0 유지', async () => {
    prisma.usage.groupBy.mockResolvedValue([
      { kind: UsageKind.USE, _sum: { score: 50 }, _count: { _all: 1 } },
    ]);

    const stats = await service.getMyStats('1');

    expect(stats).toEqual({
      points: 50,
      useCount: 1,
      returnCount: 0,
      totalCount: 1,
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

  it('_sum.score가 null인 행도 안전하게 처리', async () => {
    // Prisma는 빈 그룹의 _sum이 null이 될 수 있음
    prisma.usage.groupBy.mockResolvedValue([
      { kind: UsageKind.USE, _sum: { score: null }, _count: { _all: 0 } },
    ]);

    const stats = await service.getMyStats('1');

    expect(stats.points).toBe(0);
  });
});
