/** JWT exp 사전 검사 — 만료 토큰으로 보호 화면에 진입해 401 연쇄가 나는 것을 막는다. */

const CLOCK_SKEW_MS = 30_000

interface JwtPayload {
  exp?: number
}

function decodePayload(token: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64)) as JwtPayload
  } catch {
    return null
  }
}

/**
 * 만료가 확실할 때만 true.
 * JWT 형식이 아니거나(개발용 토큰 등) exp가 없으면 false — 백엔드 401 처리에 맡긴다.
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodePayload(token)
  if (!payload || typeof payload.exp !== 'number') return false
  return payload.exp * 1000 <= Date.now() - CLOCK_SKEW_MS
}
