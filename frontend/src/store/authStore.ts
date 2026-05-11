import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string                       // backend DB id (BigInt → string)
  nickname: string
  profileImage: string | null
  teamCode: string | null          // KBO team code (LG, DS, ...) — SSOT: backend
}

interface AuthStore {
  user: User | null
  token: string | null
  // legacy local cache of "team selected by user.id" — kept until team-name→code
  // migration lands. Primary source of truth is `user.teamCode`.
  teamsByUserId: Record<string, string>
  setAuth: (user: User, token: string) => void
  setTeam: (teamName: string) => void
  getTeamFor: (userId: string) => string | null
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      teamsByUserId: {},
      setAuth: (user, token) => set({ user, token }),
      setTeam: (teamName) => {
        const user = get().user
        if (!user) return
        set((state) => ({
          teamsByUserId: { ...state.teamsByUserId, [user.id]: teamName },
        }))
      },
      getTeamFor: (userId) => get().teamsByUserId[userId] ?? null,
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth',
      // v2: user.id changed from number → string (DB id) and JWT `sub` semantics
      // changed (kakao_id → DB id). Old tokens are invalid; force re-login.
      version: 2,
      migrate: (_persistedState, _version) =>
        ({
          user: null,
          token: null,
          teamsByUserId: {},
        }) as unknown as AuthStore,
    },
  ),
)
