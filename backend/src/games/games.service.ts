import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { FindGamesDto } from './dto/find-games.dto'

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async find(query: FindGamesDto) {
    const where: { date?: { gte?: Date; lte?: Date } } = {}
    if (query.from || query.to) {
      where.date = {}
      if (query.from) where.date.gte = new Date(query.from)
      if (query.to) where.date.lte = new Date(query.to)
    }

    const games = await this.prisma.game.findMany({
      where,
      include: {
        awayTeam: { select: { code: true, displayName: true } },
        homeTeam: { select: { code: true, displayName: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })

    return games.map((g) => ({
      id: g.id.toString(),
      date: g.date.toISOString().slice(0, 10), // YYYY-MM-DD
      startTime: g.startTime,
      awayTeam: g.awayTeam,
      homeTeam: g.homeTeam,
      venue: g.venue,
      status: g.status,
    }))
  }
}
