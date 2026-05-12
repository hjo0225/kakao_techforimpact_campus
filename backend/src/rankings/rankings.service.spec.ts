import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RankingsService } from './rankings.service';

type AnyFn = jest.Mock<unknown, unknown[]>;
interface PrismaStub {
  $queryRaw: AnyFn;
}

describe('RankingsService', () => {
  let service: RankingsService;
  let prisma: PrismaStub;

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn<unknown, unknown[]>() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        RankingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(RankingsService);
    jest.clearAllMocks();
  });

  it('10팀 점수 desc 정렬 + 매핑 검증', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        team_code: 'LG',
        display_name: 'LG 트윈스',
        total_points: 1800,
        member_count: 12,
      },
      {
        team_code: 'KIA',
        display_name: 'KIA 타이거즈',
        total_points: 1500,
        member_count: 9,
      },
      {
        team_code: 'DS',
        display_name: '두산 베어스',
        total_points: 1200,
        member_count: 7,
      },
      {
        team_code: 'LT',
        display_name: '롯데 자이언츠',
        total_points: 900,
        member_count: 5,
      },
      {
        team_code: 'SSG',
        display_name: 'SSG 랜더스',
        total_points: 700,
        member_count: 4,
      },
      {
        team_code: 'SS',
        display_name: '삼성 라이온즈',
        total_points: 600,
        member_count: 3,
      },
      {
        team_code: 'KT',
        display_name: 'KT 위즈',
        total_points: 500,
        member_count: 2,
      },
      {
        team_code: 'NC',
        display_name: 'NC 다이노스',
        total_points: 400,
        member_count: 2,
      },
      {
        team_code: 'HH',
        display_name: '한화 이글스',
        total_points: 300,
        member_count: 1,
      },
      {
        team_code: 'KW',
        display_name: '키움 히어로즈',
        total_points: 100,
        member_count: 1,
      },
    ]);

    const result = await service.getTeamRankings();

    expect(result).toHaveLength(10);
    expect(result[0]).toEqual({
      teamCode: 'LG',
      displayName: 'LG 트윈스',
      totalPoints: 1800,
      memberCount: 12,
    });
    expect(result[9].teamCode).toBe('KW');
  });

  it('점수 0인 팀도 포함 — 신규 사용자/미가입 팀', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        team_code: 'LG',
        display_name: 'LG 트윈스',
        total_points: 50,
        member_count: 1,
      },
      {
        team_code: 'DS',
        display_name: '두산 베어스',
        total_points: 0,
        member_count: 0,
      },
      {
        team_code: 'KIA',
        display_name: 'KIA 타이거즈',
        total_points: 0,
        member_count: 0,
      },
    ]);

    const result = await service.getTeamRankings();

    expect(result).toHaveLength(3);
    expect(result[0].totalPoints).toBe(50);
    expect(result[1].totalPoints).toBe(0);
    expect(result[1].memberCount).toBe(0);
  });

  it('빈 DB (인증 0건) — 모든 팀 0점', async () => {
    const empty = [
      'LG',
      'DS',
      'SSG',
      'KT',
      'KW',
      'NC',
      'HH',
      'LT',
      'SS',
      'KIA',
    ].map((code) => ({
      team_code: code,
      display_name: `${code} display`,
      total_points: 0,
      member_count: 0,
    }));
    prisma.$queryRaw.mockResolvedValue(empty);

    const result = await service.getTeamRankings();

    expect(result).toHaveLength(10);
    expect(result.every((r) => r.totalPoints === 0)).toBe(true);
    expect(result.every((r) => r.memberCount === 0)).toBe(true);
  });

  it('total_points/member_count가 string으로 와도 number로 변환 (pg bigint 안전)', async () => {
    prisma.$queryRaw.mockResolvedValue([
      // pg 드라이버가 큰 정수를 string으로 줄 수 있음 — Number() 변환 보장
      {
        team_code: 'LG',
        display_name: 'LG 트윈스',
        total_points: '12345' as unknown as number,
        member_count: '7' as unknown as number,
      },
    ]);

    const result = await service.getTeamRankings();

    expect(typeof result[0].totalPoints).toBe('number');
    expect(result[0].totalPoints).toBe(12345);
    expect(typeof result[0].memberCount).toBe('number');
    expect(result[0].memberCount).toBe(7);
  });
});
