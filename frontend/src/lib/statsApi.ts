import { api } from './apiClient'

export interface MyStats {
  points: number
  useCount: number
  returnCount: number
  totalCount: number
}

export interface MyUsageLog {
  id: string
  kind: 'USE' | 'RETURN'
  score: number
  gameLabel: string | null
  scannedAt: string
}

export const getMyStats = () => api.get<MyStats>('/stats/me')

export const getMyLogs = (limit?: number) =>
  api.get<MyUsageLog[]>(
    limit ? `/stats/me/logs?limit=${limit}` : '/stats/me/logs',
  )
