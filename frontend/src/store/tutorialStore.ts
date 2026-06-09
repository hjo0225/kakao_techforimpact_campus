import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TutorialStore {
  /** "다시 안보기"로 영구 해제됨 (persist). */
  dismissed: boolean
  /** 이번 세션에 오버레이를 띄울지 (비persist). */
  pendingShow: boolean
  /** 로그인 직후 호출 — 해제 안 됐으면 노출. */
  requestShow: () => void
  /** 일반 닫기(시작하기/X) — 다음 로그인엔 다시 노출. */
  close: () => void
  /** "다시 안보기" — 영구 해제. */
  dismissForever: () => void
  /** 프로필 "다시 보기" — 해제 여부와 무관하게 강제 노출. */
  reopen: () => void
}

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      dismissed: false,
      pendingShow: false,
      requestShow: () => set({ pendingShow: !get().dismissed }),
      close: () => set({ pendingShow: false }),
      dismissForever: () => set({ dismissed: true, pendingShow: false }),
      reopen: () => set({ pendingShow: true }),
    }),
    {
      name: 'tutorial',
      // 세션 전용 상태인 pendingShow는 저장하지 않는다.
      partialize: (state) => ({ dismissed: state.dismissed }),
    },
  ),
)
