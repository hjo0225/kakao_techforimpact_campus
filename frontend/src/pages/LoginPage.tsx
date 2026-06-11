import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import landingBg from '../assets/landing-bg.png'
import landingLogo from '../assets/landing-logo.svg'
import { Button } from '../app/components/design-system'
import { api } from '../lib/apiClient'
import { getKakaoLoginUrl } from '../lib/kakaoAuth'
import {
  isInWebView,
  onNativeMessage,
  requestNativeKakaoLogin,
} from '../lib/webviewBridge'
import { useAuthStore, type User } from '../store/authStore'
import { useTutorialStore } from '../store/tutorialStore'

interface KakaoLoginResponse {
  user: User
  accessToken: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const setTeam = useAuthStore((state) => state.setTeam)
  const requestTutorial = useTutorialStore((state) => state.requestShow)
  const [nativeBusy, setNativeBusy] = useState(false)

  // WebView: 네이티브 카카오 SDK 로그인 결과 수신 → 백엔드 JWT 교환
  useEffect(() => {
    if (!isInWebView()) return
    return onNativeMessage((message) => {
      if (message.type === 'KAKAO_LOGIN_ERROR') {
        setNativeBusy(false)
        return
      }
      if (message.type !== 'KAKAO_LOGIN' || typeof message.accessToken !== 'string') return
      api
        .post<KakaoLoginResponse>(
          '/auth/kakao',
          { accessToken: message.accessToken },
          { skipAuth: true },
        )
        .then((data) => {
          setAuth(data.user, data.accessToken)
          requestTutorial()
          navigate('/home', { replace: true })
        })
        .catch((err) => {
          console.error('[native kakao login] failed:', err)
          setNativeBusy(false)
        })
    })
  }, [navigate, setAuth, requestTutorial])

  const handleKakaoLogin = () => {
    // WebView면 네이티브 SDK에 위임, 브라우저면 OAuth redirect
    if (isInWebView()) {
      setNativeBusy(true)
      requestNativeKakaoLogin()
      return
    }
    window.location.href = getKakaoLoginUrl()
  }

  // 개발 전용: 백엔드 없이 가짜 로그인으로 진입 (배포본에는 노출되지 않음)
  const isLocalDev =
    import.meta.env.DEV &&
    (window.location.hostname === '127.0.0.1' ||
      window.location.hostname === 'localhost')

  const enterLocalQa = () => {
    setAuth(
      {
        id: 'dev-local-user',
        nickname: '로컬 QA',
        profileImage: null,
        teamCode: 'LG',
      },
      'dev-local-token',
    )
    setTeam('LG')
    requestTutorial()
    navigate('/home')
  }

  return (
    <div className="cb-login-screen">
      <img src={landingBg} alt="" aria-hidden="true" className="cb-login-bg" />
      <img src={landingLogo} alt="용기낼깡" className="cb-login-logo" />

      <div className="cb-login-actions">
        <Button
          onClick={handleKakaoLogin}
          disabled={nativeBusy}
          variant="kakao"
          size="lg"
          fullWidth
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2C5.58 2 2 4.91 2 8.5c0 2.26 1.45 4.25 3.63 5.38l-.92 3.34c-.07.27.22.48.45.33L9.5 15.1c.16.02.33.02.5.02 4.42 0 8-2.91 8-6.5S14.42 2 10 2z"
              fill="var(--cb-kakao-text)"
            />
          </svg>
          카카오로 시작하기
        </Button>
        {isLocalDev && (
          <Button onClick={enterLocalQa} variant="secondary" size="lg" fullWidth>
            로컬 QA로 들어가기 (개발용)
          </Button>
        )}
      </div>
    </div>
  )
}
