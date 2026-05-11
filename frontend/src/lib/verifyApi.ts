import { apiFetch, ApiError } from './apiClient'

export type CertificationMode = 'use' | 'return'

export interface VerifyApiResponse {
  vision: {
    isReusable: boolean
    classIndex: number
    confidence: number
  }
  usage: {
    id: string
    kind: 'USE' | 'RETURN'
    score: number
    scannedAt: string
  }
}

interface VerifyOptions {
  gameId?: string
  lat?: number
  lng?: number
}

export async function verifyImage(
  mode: CertificationMode,
  image: File,
  options: VerifyOptions = {},
): Promise<VerifyApiResponse> {
  const form = new FormData()
  form.append('image', image)
  if (options.gameId) form.append('gameId', options.gameId)
  if (options.lat !== undefined) form.append('lat', options.lat.toString())
  if (options.lng !== undefined) form.append('lng', options.lng.toString())

  return apiFetch<VerifyApiResponse>(`/verify/${mode}`, {
    method: 'POST',
    body: form,
  })
}

export { ApiError }
