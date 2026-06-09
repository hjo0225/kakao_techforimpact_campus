import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 로컬 날짜 키 (YYYY-M-D) — 자정이 지나면 값이 바뀌어 잠금이 다시 걸린다. */
export function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

interface VerifyGateStore {
  /** 마지막으로 용기인증을 완료한 날짜 키. */
  lastVerifiedDate: string | null
  /** 용기인증 완료 시 호출 — 오늘 날짜로 기록 (그날 24시까지 야구네컷 해제). */
  markVerifiedToday: () => void
}

export const useVerifyGateStore = create<VerifyGateStore>()(
  persist(
    (set) => ({
      lastVerifiedDate: null,
      markVerifiedToday: () => set({ lastVerifiedDate: todayKey() }),
    }),
    { name: 'verify-gate' },
  ),
)
