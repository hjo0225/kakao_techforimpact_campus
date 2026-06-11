import { create } from 'zustand'

interface TutorialStore {
  /** 이번 세션에 오버레이를 띄울지. */
  pendingShow: boolean
  /** 로그인 직후 호출 — 매 로그인마다 무조건 노출. */
  requestShow: () => void
  /** 닫기(마지막 스와이프/X) — 이번 세션만 닫힘, 다음 로그인엔 다시 노출. */
  close: () => void
  /** 프로필 "다시 보기" — 강제 노출. */
  reopen: () => void
}

export const useTutorialStore = create<TutorialStore>()((set) => ({
  pendingShow: false,
  requestShow: () => set({ pendingShow: true }),
  close: () => set({ pendingShow: false }),
  reopen: () => set({ pendingShow: true }),
}))
