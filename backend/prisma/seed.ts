import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const KBO_TEAMS = [
  { code: 'LG', displayName: 'LG 트윈스', primaryColor: '#C3042F' },
  { code: 'DS', displayName: '두산 베어스', primaryColor: '#131230' },
  { code: 'SS', displayName: '삼성 라이온즈', primaryColor: '#074CA1' },
  { code: 'HH', displayName: '한화 이글스', primaryColor: '#FF6600' },
  { code: 'KT', displayName: 'KT 위즈', primaryColor: '#000000' },
  { code: 'NC', displayName: 'NC 다이노스', primaryColor: '#1D467E' },
  { code: 'OB', displayName: '롯데 자이언츠', primaryColor: '#002955' },
  { code: 'HB', displayName: '키움 히어로즈', primaryColor: '#820024' },
  { code: 'KIA', displayName: 'KIA 타이거즈', primaryColor: '#EA0029' },
  { code: 'SK', displayName: 'SSG 랜더스', primaryColor: '#CE0E2D' },
]

// 한글 단축명 → 백엔드 teams.code 매핑
const TEAM_NAME_TO_CODE: Record<string, string> = {
  LG: 'LG',
  두산: 'DS',
  삼성: 'SS',
  한화: 'HH',
  KT: 'KT',
  NC: 'NC',
  롯데: 'OB',
  키움: 'HB',
  KIA: 'KIA',
  SSG: 'SK',
}

// 2026 KBO 정규시즌 — 05.20 ~ 05.31 (사용자 제공)
// 포맷: "MM.DD(요일)?  HH:MM  AwayvsHome  Venue  Status"
// 날짜는 다음 라인까지 fill-down. 05.25(월) 휴식일.
const SCHEDULE_RAW = `
05.20(수)    18:30    NCvs두산                    잠실    -
18:30    LGvsKIA                    광주    -
18:30    SSGvs키움                    고척    -
18:30    롯데vs한화                    대전    -
18:30    KTvs삼성                    포항    -
05.21(목)    18:30    NCvs두산                    잠실    -
18:30    LGvsKIA                    광주    -
18:30    SSGvs키움                    고척    -
18:30    롯데vs한화                    대전    -
18:30    KTvs삼성                    포항    -
05.22(금)    18:30    키움vsLG                    잠실    -
18:30    삼성vs롯데                    사직    -
18:30    NCvsKT                    수원    -
18:30    SSGvsKIA                    광주    -
18:30    두산vs한화                    대전    -
05.23(토)    14:00    키움vsLG                    잠실    -
17:00    삼성vs롯데                    사직    -
17:00    NCvsKT                    수원    -
17:00    SSGvsKIA                    광주    -
17:00    두산vs한화                    대전    -
05.24(일)    14:00    키움vsLG                    잠실    -
14:00    삼성vs롯데                    사직    -
14:00    NCvsKT                    수원    -
14:00    SSGvsKIA                    광주    -
14:00    두산vs한화                    대전    -
05.26(화)    18:30    KTvs두산                    잠실    -
18:30    삼성vsSSG                    문학    -
18:30    LGvs롯데                    사직    -
18:30    한화vsNC                    창원    -
18:30    KIAvs키움                    고척    -
05.27(수)    18:30    KTvs두산                    잠실    -
18:30    삼성vsSSG                    문학    -
18:30    LGvs롯데                    사직    -
18:30    한화vsNC                    창원    -
18:30    KIAvs키움                    고척    -
05.28(목)    18:30    KTvs두산                    잠실    -
18:30    삼성vsSSG                    문학    -
18:30    LGvs롯데                    사직    -
18:30    한화vsNC                    창원    -
18:30    KIAvs키움                    고척    -
05.29(금)    18:30    KIAvsLG                    잠실    -
18:30    두산vs삼성                    대구    -
18:30    롯데vsNC                    창원    -
18:30    KTvs키움                    고척    -
18:30    SSGvs한화                    대전    -
05.30(토)    17:00    KIAvsLG                    잠실    -
17:00    두산vs삼성                    대구    -
17:00    롯데vsNC                    창원    -
17:00    KTvs키움                    고척    -
17:00    SSGvs한화                    대전    -
05.31(일)    14:00    KIAvsLG                    잠실    -
14:00    두산vs삼성                    대구    -
14:00    롯데vsNC                    창원    -
14:00    KTvs키움                    고척    -
14:00    SSGvs한화                    대전    -
`

const SCHEDULE_YEAR = 2026
const TEAM_TOKEN = Object.keys(TEAM_NAME_TO_CODE).sort((a, b) => b.length - a.length) // 긴 토큰 우선
const MATCH_PATTERN = new RegExp(`^(${TEAM_TOKEN.join('|')})vs(${TEAM_TOKEN.join('|')})$`)

interface ParsedGame {
  date: Date
  startTime: string
  awayTeamCode: string
  homeTeamCode: string
  venue: string
}

function parseSchedule(raw: string): ParsedGame[] {
  const games: ParsedGame[] = []
  let currentDate: Date | null = null

  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const tokens = trimmed.split(/\s+/).filter(Boolean)
    let dateLeading = false
    if (/^\d{2}\.\d{2}/.test(tokens[0])) {
      const m = tokens[0].match(/^(\d{2})\.(\d{2})/)
      if (m) {
        const [, mm, dd] = m
        currentDate = new Date(Date.UTC(SCHEDULE_YEAR, Number(mm) - 1, Number(dd)))
        dateLeading = true
      }
    }

    const offset = dateLeading ? 1 : 0
    const time = tokens[offset]
    const matchup = tokens[offset + 1]
    const venue = tokens[offset + 2]

    if (!currentDate || !time || !matchup || !venue) continue

    const m = matchup.match(MATCH_PATTERN)
    if (!m) {
      throw new Error(`경기 매치업 파싱 실패: "${matchup}"`)
    }
    const [, awayName, homeName] = m

    games.push({
      date: currentDate,
      startTime: time,
      awayTeamCode: TEAM_NAME_TO_CODE[awayName]!,
      homeTeamCode: TEAM_NAME_TO_CODE[homeName]!,
      venue,
    })
  }

  return games
}

async function seedTeams() {
  for (const team of KBO_TEAMS) {
    await prisma.team.upsert({
      where: { code: team.code },
      create: team,
      update: team,
    })
  }
  console.log(`teams 시드 완료 (${KBO_TEAMS.length}건)`)
}

async function seedGames() {
  const games = parseSchedule(SCHEDULE_RAW)
  const result = await prisma.game.createMany({
    data: games,
    skipDuplicates: true, // (date, away, home) 유니크 제약 기반
  })
  console.log(`games 시드 완료 (신규 ${result.count}건 / 입력 ${games.length}건)`)
}

async function main() {
  await seedTeams()
  await seedGames()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
