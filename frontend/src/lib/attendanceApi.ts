import { api } from './apiClient'
import type { GameSummary } from './gameSummary'

export interface MyAttendance {
  current: GameSummary | null // 선택했지만 아직 경기 날짜가 안 지난 현재 선택
  visits: GameSummary[] // 경기 날짜가 지나도록 취소 안 해 직관 확정된 방문 (최신순)
}

export const getMyAttendance = () => api.get<MyAttendance>('/attendance/me')

export const selectAttendance = (gameId: string) =>
  api.post<GameSummary>('/attendance', { gameId })

export const cancelAttendance = (gameId: string) =>
  api.delete<void>(`/attendance/${gameId}`)
