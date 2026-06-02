import { apiFetch, ApiError } from './apiClient'

export type CertificationMode = 'use' | 'return'
export type ContainerLabel = 'REUSABLE' | 'SINGLE_USE'

export interface AiPrediction {
  isReusable: boolean
  classIndex: number
  confidence: number
}

// 1단계: 이미지 업로드 → GCS 적재 + Vision 예측. 아직 점수는 부여되지 않음.
export interface AnalyzeApiResponse {
  sampleId: string
  ai: AiPrediction | null
  suggestedLabel: ContainerLabel
}

// 2단계: 유저가 정답 라벨을 확정. REUSABLE이면 scored=true + usage 반환.
export interface ConfirmApiResponse {
  sample: {
    id: string
    kind: 'USE' | 'RETURN'
    userLabel: ContainerLabel
    status: 'CONFIRMED'
  }
  scored: boolean
  reason?: 'SINGLE_USE_LABEL' | 'NO_RECENT_USE'
  usage?: {
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

function modeToKind(mode: CertificationMode): 'USE' | 'RETURN' {
  return mode === 'return' ? 'RETURN' : 'USE'
}

export async function analyzeImage(
  mode: CertificationMode,
  image: File,
  options: VerifyOptions = {},
): Promise<AnalyzeApiResponse> {
  const form = new FormData()
  form.append('image', image)
  form.append('kind', modeToKind(mode))
  if (options.gameId) form.append('gameId', options.gameId)
  if (options.lat !== undefined) form.append('lat', options.lat.toString())
  if (options.lng !== undefined) form.append('lng', options.lng.toString())

  return apiFetch<AnalyzeApiResponse>('/verify/analyze', {
    method: 'POST',
    body: form,
  })
}

export async function confirmLabel(
  sampleId: string,
  userLabel: ContainerLabel,
): Promise<ConfirmApiResponse> {
  return apiFetch<ConfirmApiResponse>('/verify/confirm', {
    method: 'POST',
    body: { sampleId, userLabel },
  })
}

export { ApiError }
