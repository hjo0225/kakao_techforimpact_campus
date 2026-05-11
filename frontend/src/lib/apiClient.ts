import { useAuthStore } from '../store/authStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  // If true, do NOT attach Authorization header (e.g., for /auth/kakao bootstrap).
  skipAuth?: boolean
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { skipAuth, body, headers: initHeaders, ...rest } = options
  const token = useAuthStore.getState().token

  const headers = new Headers(initHeaders)
  if (token && !skipAuth) headers.set('Authorization', `Bearer ${token}`)
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`

  const response = await fetch(url, {
    ...rest,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (response.status === 401 && !skipAuth) {
    // Token rejected — drop local session so app routes back to /login.
    useAuthStore.getState().logout()
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `${response.status} ${response.statusText}`,
      data,
    )
  }
  return data as T
}

export const api = {
  get: <T>(path: string, init?: RequestOptions) =>
    apiFetch<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    apiFetch<T>(path, { ...init, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    apiFetch<T>(path, { ...init, method: 'PATCH', body }),
  delete: <T>(path: string, init?: RequestOptions) =>
    apiFetch<T>(path, { ...init, method: 'DELETE' }),
}
