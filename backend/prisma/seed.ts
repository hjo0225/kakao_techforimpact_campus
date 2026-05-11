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

// 2026 KBO 정규시즌 — 05.12 ~ 05.31 (사용자 제공, 2회 입력 합본)
// 두 포맷 혼재:
//   (간략) "MM.DD?  HH:MM  AwayvsHome  Venue  -"
//   (프리뷰) "MM.DD?  HH:MM  AwayvsHome  프리뷰  [Caster…]  Venue  -"
//   캐스터가 두 줄에 걸치는 경우 있음 — preprocess에서 합침.
//   날짜는 다음 라인까지 fill-down. 05.18(월) / 05.25(월) 휴식일.
const SCHEDULE_RAW = `
05.12(화)    18:30    삼성vsLG    프리뷰        SS-T        잠실    -
18:30    NCvs롯데    프리뷰        KN-T        사직    -
18:30    SSGvsKT    프리뷰        SPO-T        수원    -
18:30    두산vsKIA    프리뷰        SPO-2T        광주    -
18:30    한화vs키움    프리뷰        MS-T        고척    -
05.13(수)    18:30    삼성vsLG    프리뷰        SS-T        잠실    -
18:30    NCvs롯데    프리뷰        KN-T        사직    -
18:30    SSGvsKT    프리뷰        SPO-T        수원    -
18:30    두산vsKIA    프리뷰        SPO-2T        광주    -
18:30    한화vs키움    프리뷰        MS-T        고척    -
05.14(목)    18:30    삼성vsLG    프리뷰        SS-T        잠실    -
18:30    NCvs롯데    프리뷰        KN-T        사직    -
18:30    SSGvsKT    프리뷰        SPO-T        수원    -
18:30    두산vsKIA    프리뷰        SPO-2T        광주    -
18:30    한화vs키움    프리뷰        MS-T        고척    -
05.15(금)    18:30    롯데vs두산    프리뷰        MS-T        잠실    -
18:30    LGvsSSG    프리뷰        SPO-2T        문학    -
18:30    KIAvs삼성    프리뷰        K-2T        대구    -
18:30    키움vsNC    프리뷰        KN-T
SPO-T        창원    -
18:30    한화vsKT    프리뷰        SS-T        수원    -
05.16(토)    14:00    한화vsKT    프리뷰        S-T        수원    -
17:00    롯데vs두산    프리뷰        SS-T        잠실    -
17:00    LGvsSSG    프리뷰        MS-T        문학    -
17:00    KIAvs삼성    프리뷰        SPO-2T        대구    -
17:00    키움vsNC    프리뷰        KN-T
SPO-T        창원    -
05.17(일)    14:00    롯데vs두산    프리뷰        MS-T        잠실    -
14:00    LGvsSSG    프리뷰        M-T        문학    -
14:00    KIAvs삼성    프리뷰        SPO-2T        대구    -
14:00    키움vsNC    프리뷰        KN-T
SPO-T        창원    -
14:00    한화vsKT    프리뷰        SS-T        수원    -
05.19(화)    18:30    NCvs두산    프리뷰                잠실    -
18:30    LGvsKIA    프리뷰                광주    -
18:30    SSGvs키움    프리뷰                고척    -
18:30    롯데vs한화    프리뷰                대전    -
18:30    KTvs삼성    프리뷰                포항    -
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

const VENUES = new Set([
  '잠실', '광주', '고척', '대전', '포항', '사직', '수원', '문학', '창원', '대구',
])

interface ParsedGame {
  date: Date
  startTime: string
  awayTeamCode: string
  homeTeamCode: string
  venue: string
}

// 캐스터가 다음 줄로 넘어간 경우(`키움vsNC` 류) 이전 줄에 이어붙임.
// 줄의 첫 토큰이 날짜(MM.DD)도 시각(HH:MM)도 아니면 연속선으로 간주.
function preprocessLines(raw: string): string[] {
  const out: string[] = []
  for (const rawLine of raw.split('\n')) {
    const t = rawLine.trim()
    if (!t) continue
    const first = t.split(/\s+/)[0]
    const isStart = /^\d{2}\.\d{2}/.test(first) || /^\d{2}:\d{2}/.test(first)
    if (isStart || out.length === 0) {
      out.push(t)
    } else {
      out[out.length - 1] += ' ' + t
    }
  }
  return out
}

function parseSchedule(raw: string): ParsedGame[] {
  const games: ParsedGame[] = []
  let currentDate: Date | null = null

  for (const line of preprocessLines(raw)) {
    const tokens = line.split(/\s+/).filter(Boolean)
    let offset = 0

    if (/^\d{2}\.\d{2}/.test(tokens[0])) {
      const m = tokens[0].match(/^(\d{2})\.(\d{2})/)
      if (m) {
        const [, mm, dd] = m
        currentDate = new Date(Date.UTC(SCHEDULE_YEAR, Number(mm) - 1, Number(dd)))
        offset = 1
      }
    }

    if (!currentDate) continue
    const time = tokens[offset]
    const matchup = tokens[offset + 1]
    if (!time || !matchup) continue

    // venue를 known set으로 스캔 — 포맷 차이(프리뷰/캐스터 컬럼)에 강건
    let venueIdx = -1
    for (let i = offset + 2; i < tokens.length; i++) {
      if (VENUES.has(tokens[i])) { venueIdx = i; break }
    }
    if (venueIdx === -1) {
      throw new Error(`venue를 찾지 못함: "${line}"`)
    }
    const venue = tokens[venueIdx]

    const m = matchup.match(MATCH_PATTERN)
    if (!m) throw new Error(`경기 매치업 파싱 실패: "${matchup}" (line: "${line}")`)
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
