import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/apiClient'
import { useAuthStore, type User } from '../store/authStore'
import { useTutorialStore } from '../store/tutorialStore'

interface KakaoLoginResponse {
  user: User
  accessToken: string
}

export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const requestTutorial = useTutorialStore((s) => s.requestShow)
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
        // 팀 선택은 프로필에서. 로그인 직후 튜토리얼 노출 요청(미해제 시).
        requestTutorial()
        navigate('/home', { replace: true })
      })
      .catch((err) => {
        console.error('[OAuth callback] failed:', err)
        navigate('/login', { replace: true })
      })
  }, [navigate, setAuth, requestTutorial])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">로그인 중...</p>
    </div>
  )
}
