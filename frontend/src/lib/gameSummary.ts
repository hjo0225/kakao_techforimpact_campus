import type { GameInfo } from '../app/AppContext'
import { getTeamBrand } from '../app/teamBrand'

export interface ApiTeam {
  code: string
  displayName: string
}

// 백엔드 attendance/games 응답의 경기 요약 (짧은 venue, 팀 displayName)
export interface GameSummary {
  gameId: string
  date: string // YYYY-MM-DD
  startTime: string
  venue: string
  homeTeam: ApiTeam
  awayTeam: ApiTeam
}

// 백엔드의 짧은 venue("잠실")을 화면용 풀네임으로 매핑
export const VENUE_LABEL: Record<string, string> = {
  잠실: '잠실 야구장',
  광주: '광주 KIA챔피언스필드',
  고척: '고척 스카이돔',
  대전: '대전 한화생명이글스파크',
  포항: '포항 야구장',
  사직: '사직 야구장',
  수원: '수원 KT위즈파크',
  문학: '인천 SSG랜더스필드',
  창원: 'NC파크',
  대구: '대구 삼성라이온즈파크',
}

export function venueLabel(venue: string): string {
  return VENUE_LABEL[venue] ?? venue
}

// 경기 요약 → 앱 내부 GameInfo (팀 단축명, 풀 venue)
export function summaryToGameInfo(summary: GameSummary): GameInfo {
  return {
    gameId: summary.gameId,
    date: summary.date,
    home: getTeamBrand(summary.homeTeam.displayName).shortName,
    away: getTeamBrand(summary.awayTeam.displayName).shortName,
    venue: venueLabel(summary.venue),
    time: summary.startTime,
    inning: '', // 스케줄 단계 — 라이브 데이터 없음
    score: '',
  }
}
