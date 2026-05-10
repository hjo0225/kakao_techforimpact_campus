import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

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

    fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/kakao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirectUri: import.meta.env.VITE_KAKAO_REDIRECT_URI,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          throw new Error(`auth ${res.status}: ${body}`)
        }
        return res.json()
      })
      .then((data) => {
        setAuth(data.user, data.accessToken)
        const team = getTeamFor(data.user.id)
        navigate(team ? '/home' : '/onboarding', { replace: true })
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
