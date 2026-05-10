import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  nickname: string
  profileImage: string | null
}

interface AuthStore {
  user: User | null
  token: string | null
  teamsByUserId: Record<number, string>
  setAuth: (user: User, token: string) => void
  setTeam: (teamName: string) => void
  getTeamFor: (userId: number) => string | null
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
    { name: 'auth' },
  ),
)
