import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from './attendance.service';

type AnyFn = jest.Mock<unknown, unknown[]>;
interface PrismaStub {
  game: { findUnique: AnyFn };
  attendance: {
    findMany: AnyFn;
    updateMany: AnyFn;
    upsert: AnyFn;
  };
  $transaction: AnyFn;
}

function gameRow(id: number, date: string) {
  return {
    id: BigInt(id),
    date: new Date(`${date}T00:00:00.000Z`),
    startTime: '18:30',
    venue: '잠실',
    homeTeam: { code: 'LG', displayName: 'LG 트윈스' },
    awayTeam: { code: 'OB', displayName: '두산 베어스' },
  };
}

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    const fn = () => jest.fn<unknown, unknown[]>();
    prisma = {
      game: { findUnique: fn() },
      attendance: {
        findMany: fn(),
        updateMany: fn(),
        upsert: fn(),
      },
      $transaction: fn(),
    };
    // 트랜잭션 콜백에 같은 prisma 스텁을 tx로 전달
    prisma.$transaction.mockImplementation((cb: (tx: PrismaStub) => unknown) =>
      cb(prisma),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(AttendanceService);

    jest.useFakeTimers().setSystemTime(new Date('2026-05-22T03:00:00.000Z')); // KST 12:00
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((cb: (tx: PrismaStub) => unknown) =>
      cb(prisma),
    );
  });

  afterEach(() => jest.useRealTimers());

  describe('select', () => {
    it('없는 경기면 NotFound', async () => {
      prisma.game.findUnique.mockResolvedValue(null);
      await expect(service.select('1', '99')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('아직 안 지난 다른 선택은 취소하고 대상은 upsert', async () => {
      prisma.game.findUnique.mockResolvedValue(gameRow(10, '2026-05-23'));
      prisma.attendance.findMany.mockResolvedValue([
        { id: BigInt(1), game: { date: new Date('2026-05-25T00:00:00.000Z') } }, // 미래 → 취소
        { id: BigInt(2), game: { date: new Date('2026-05-01T00:00:00.000Z') } }, // 과거(확정 방문) → 유지
      ]);

      const result = await service.select('7', '10');

      const cancelCall = prisma.attendance.updateMany.mock.calls[0][0] as {
        where: { id: { in: bigint[] } };
      };
      expect(cancelCall.where.id.in).toEqual([BigInt(1)]);
      expect(prisma.attendance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_gameId: { userId: 7n, gameId: 10n } },
        }),
      );
      expect(result.gameId).toBe('10');
      expect(result.homeTeam.displayName).toBe('LG 트윈스');
    });
  });

  describe('getMine', () => {
    it('경기 날짜 지난 활성 선택은 visits, 안 지난 건 current', async () => {
      prisma.attendance.findMany.mockResolvedValue([
        { game: gameRow(20, '2026-05-23') }, // 미래 → current
        { game: gameRow(21, '2026-05-20') }, // 과거 → 직관 확정
        { game: gameRow(22, '2026-05-10') }, // 과거 → 직관 확정
      ]);

      const { current, visits } = await service.getMine('1');

      expect(current?.gameId).toBe('20');
      expect(visits.map((v) => v.gameId)).toEqual(['21', '22']); // 최신순
    });

    it('오늘 경기는 아직 current (다음날부터 확정)', async () => {
      prisma.attendance.findMany.mockResolvedValue([
        { game: gameRow(30, '2026-05-22') }, // 오늘(KST)
      ]);

      const { current, visits } = await service.getMine('1');

      expect(current?.gameId).toBe('30');
      expect(visits).toHaveLength(0);
    });
  });

  describe('cancel', () => {
    it('활성 선택만 canceledAt 설정', async () => {
      prisma.attendance.updateMany.mockResolvedValue({ count: 1 });
      await service.cancel('1', '10');
      const call = prisma.attendance.updateMany.mock.calls[0][0] as {
        where: { userId: bigint; gameId: bigint; canceledAt: null };
        data: { canceledAt: Date };
      };
      expect(call.where).toEqual({ userId: 1n, gameId: 10n, canceledAt: null });
      expect(call.data.canceledAt).toBeInstanceOf(Date);
    });
  });
});
