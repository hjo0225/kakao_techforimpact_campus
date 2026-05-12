import { api } from './apiClient'

export interface TeamRanking {
  teamCode: string
  displayName: string
  totalPoints: number
  memberCount: number
}

export const getTeamRankings = () => api.get<TeamRanking[]>('/rankings/teams')
