import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/apiClient'
import { useAuthStore, type User } from '../store/authStore'

interface KakaoLoginResponse {
  user: User
  accessToken: string
}

export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const getTeamFor = useAuthStore((s) => s.getTeamFor)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const code = new URLSearchParams(window.location.search).get('code')
    if (!code) {
      navigate('/login', { replace: true })
      return
    }

    api
      .post<KakaoLoginResponse>(
        '/auth/kakao',
        {
          code,
          redirectUri: import.meta.env.VITE_KAKAO_REDIRECT_URI,
        },
        { skipAuth: true },
      )
      .then((data) => {
        setAuth(data.user, data.accessToken)
        // Prefer backend teamCode (server SSOT). Fall back to local cache for
        // sessions whose team was selected before the backend column existed.
        const hasTeam = data.user.teamCode ?? getTeamFor(data.user.id)
        navigate(hasTeam ? '/home' : '/onboarding', { replace: true })
      })
      .catch((err) => {
        console.error('[OAuth callback] failed:', err)
        navigate('/login', { replace: true })
      })
  }, [navigate, setAuth, getTeamFor])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">로그인 중...</p>
    </div>
  )
}
