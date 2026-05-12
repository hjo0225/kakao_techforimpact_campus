import { api } from './apiClient'

export interface MyStats {
  points: number
  useCount: number
  returnCount: number
  totalCount: number
}

export const getMyStats = () => api.get<MyStats>('/stats/me')
