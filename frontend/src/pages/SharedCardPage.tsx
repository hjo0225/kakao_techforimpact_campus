import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { sharedCardImageUrl } from '../lib/visitCardApi'

// 공개 직관카드 공유 페이지 — 로그인 불필요. 공유 링크(/card/:token)로 누구나 열람.
export default function SharedCardPage() {
  const { token } = useParams<{ token: string }>()
  const [failed, setFailed] = useState(false)

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 20,
        background: 'linear-gradient(180deg, #430A21 0%, #5E1530 55%, #C85C77 100%)',
      }}
    >
      <p style={{ color: '#FFFAE6', fontSize: 14, fontWeight: 800 }}>잠실 직관카드</p>

      <div
        style={{
          width: 'min(100%, 420px)',
          aspectRatio: '1 / 1',
          borderRadius: 16,
          overflow: 'hidden',
          border: '2px solid rgba(255,255,255,0.6)',
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!token || failed ? (
          <p style={{ color: '#fff', fontSize: 13, padding: 24, textAlign: 'center' }}>
            카드를 찾을 수 없습니다.
          </p>
        ) : (
          <img
            src={sharedCardImageUrl(token)}
            alt="직관카드"
            onError={() => setFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>

      <a
        href="/"
        style={{
          marginTop: 4,
          color: '#430A21',
          background: '#FFFAE6',
          border: '2px solid #430A21',
          borderRadius: 12,
          padding: '12px 20px',
          fontSize: 14,
          fontWeight: 800,
          textDecoration: 'none',
        }}
      >
        나도 직관 인증하기
      </a>
    </div>
  )
}
