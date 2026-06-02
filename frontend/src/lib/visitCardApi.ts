import { apiFetch, ApiError } from './apiClient'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export interface VisitCardSummary {
  id: string
  caption: string | null
  teamCode: string | null
  shareToken: string
  createdAt: string
}

export interface CreatedVisitCard {
  id: string
  shareToken: string
  createdAt: string
}

export interface SharedCardMeta {
  caption: string | null
  teamCode: string | null
  createdAt: string
}

export async function createVisitCard(
  image: File,
  opts: { caption?: string; teamCode?: string } = {},
): Promise<CreatedVisitCard> {
  const form = new FormData()
  form.append('image', image)
  if (opts.caption) form.append('caption', opts.caption)
  if (opts.teamCode) form.append('teamCode', opts.teamCode)
  return apiFetch<CreatedVisitCard>('/visit-cards', { method: 'POST', body: form })
}

export async function getVisitCards(): Promise<VisitCardSummary[]> {
  return apiFetch<VisitCardSummary[]>('/visit-cards')
}

// 공개 공유 페이지가 여는 링크 (로그인 불필요)
export function shareUrlForToken(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/card/${token}`
}

// 공개 이미지 URL — 인증 없이 <img src>로 직접 사용 가능
export function sharedCardImageUrl(token: string): string {
  return `${API_BASE}/share/visit-cards/${token}/image`
}

export async function getSharedCardMeta(token: string): Promise<SharedCardMeta> {
  return apiFetch<SharedCardMeta>(`/share/visit-cards/${token}`, { skipAuth: true })
}

export { ApiError }
