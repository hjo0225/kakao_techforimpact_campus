import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TeamRanking {
  teamCode: string;
  displayName: string;
  totalPoints: number;
  memberCount: number;
}

interface RawTeamRow {
  team_code: string;
  display_name: string;
  total_points: number;
  member_count: number;
}

@Injectable()
export class RankingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeamRankings(): Promise<TeamRanking[]> {
    const rows = await this.prisma.$queryRaw<RawTeamRow[]>`
      SELECT
        t.code                              AS team_code,
        t.display_name                      AS display_name,
        COALESCE(SUM(us.score), 0)::int     AS total_points,
        COUNT(DISTINCT u.id)::int           AS member_count
      FROM teams t
      LEFT JOIN users u  ON u.team_code = t.code
      LEFT JOIN usages us ON us.user_id = u.id
      GROUP BY t.code, t.display_name
      ORDER BY total_points DESC, t.code ASC
    `;

    return rows.map((r) => ({
      teamCode: r.team_code,
      displayName: r.display_name,
      totalPoints: Number(r.total_points),
      memberCount: Number(r.member_count),
    }));
  }
}
