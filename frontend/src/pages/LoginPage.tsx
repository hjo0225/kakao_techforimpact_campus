import logoImg from '../imports/image.png'
import { Button } from '../app/components/design-system'
import { getKakaoLoginUrl } from '../lib/kakaoAuth'

export default function LoginPage() {
  return (
    <div className="cb-login-screen">
      <div className="cb-login-meta">
        <span className="cb-login-meta__pill">EST. 2026</span>
        <span className="cb-login-meta__divider" aria-hidden="true" />
        <span>Baseball · Eco · Trio</span>
      </div>

      <div className="cb-login-brand">
        <div className="cb-login-emblem">
          <span className="cb-login-halo" aria-hidden="true" />
          <img src={logoImg} alt="클린볼트리오 로고" className="cb-login-logo" />
        </div>

        <div className="cb-login-wordmark">
          <span className="cb-login-supertitle">Baseball Eco League</span>
          <h1 className="cb-login-title">클린볼트리오</h1>
          <span className="cb-login-en">Clean · Ball · Trio</span>
        </div>

        <p className="cb-login-tagline">
          응원하는 마음으로,
          <br />
          야구장을 더 깨끗하게.
        </p>
      </div>

      <div className="cb-login-actions">
        <span className="cb-login-cta-eyebrow">
          <span className="cb-login-cta-eyebrow__dot" aria-hidden="true" />
          Play Ball · 시즌 입장
        </span>

        <Button
          onClick={() => {
            window.location.href = getKakaoLoginUrl()
          }}
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

        <p className="cb-login-fine">
          <a href="#" onClick={(e) => e.preventDefault()}>
            이용약관
          </a>
          <span aria-hidden="true">·</span>
          <a href="#" onClick={(e) => e.preventDefault()}>
            개인정보처리방침
          </a>
          <span aria-hidden="true">·</span>
          <a href="#" onClick={(e) => e.preventDefault()}>
            1:1 문의
          </a>
        </p>
      </div>
    </div>
  )
}
