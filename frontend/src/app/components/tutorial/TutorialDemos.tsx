import type { CSSProperties, ReactNode } from 'react'
import { Camera, Search } from 'lucide-react'
import stadiumBg from '../../../assets/tutorial/stadium-bg.png'
import mapShot from '../../../assets/tutorial/map-shot.png'
import reusableMascot from '../../../assets/feedback/reusable.png'
import victorySticker from '../../../assets/card-frames/1cutvictory.png'

/**
 * 튜토리얼 전용 데모 화면 — 실제 앱 캡처 대신 표시 박스를 100% 채우는 컴포넌트로 제작.
 * 어떤 기기 비율에서도 박스에 딱 맞는다 (이미지 비율 문제 원천 제거).
 */

const BORDER = '2px solid #430A21'

// ── 공통 조각 ────────────────────────────────────────────────────

function PillToggle({ left, right, active }: { left: string; right: string; active: 0 | 1 }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0 3px', gap: 2, height: 30, border: BORDER, borderRadius: 9999, background: '#F0E8E7' }}>
      {[left, right].map((t, i) => (
        <span key={t} style={{
          padding: '4px 11px', borderRadius: 9999, fontSize: 11, fontWeight: 800,
          background: active === i ? 'var(--cb-primary)' : 'transparent',
          color: active === i ? '#fff' : '#8C6B73', whiteSpace: 'nowrap',
        }}>{t}</span>
      ))}
    </div>
  )
}

function Shutter() {
  return (
    <span style={{
      width: 46, height: 46, borderRadius: 9999, border: BORDER, background: 'var(--cb-primary)',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 3px 0 0 #430A21',
    }}>
      <Camera size={20} strokeWidth={2.4} />
    </span>
  )
}

/** 뷰파인더 모서리 포커스 브래킷 4개 — 각 모서리를 향해 ㄱ자로 꺾인다. */
export function FocusBrackets({ color }: { color: string }) {
  const corners: Array<{ inset: string; top?: boolean; bottom?: boolean; left?: boolean; right?: boolean }> = [
    { inset: '12px auto auto 12px', top: true, left: true },     // ↖
    { inset: '12px 12px auto auto', top: true, right: true },    // ↗
    { inset: 'auto auto 12px 12px', bottom: true, left: true },  // ↙
    { inset: 'auto 12px 12px auto', bottom: true, right: true }, // ↘
  ]
  const line = `2px solid ${color}`
  return (
    <>
      {corners.map((c, i) => (
        <span key={i} aria-hidden style={{
          position: 'absolute', inset: c.inset, width: 18, height: 18,
          borderTop: c.top ? line : 'none',
          borderBottom: c.bottom ? line : 'none',
          borderLeft: c.left ? line : 'none',
          borderRight: c.right ? line : 'none',
        }} />
      ))}
    </>
  )
}

function DemoShell({ children, bg = 'var(--cb-bg)' }: { children: ReactNode; bg?: string }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: bg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  )
}

// ── STEP 1 · 지도 ────────────────────────────────────────────────

export function MapDemo() {
  const chips = ['전체', '식사', '카페', '편의점']
  return (
    <DemoShell>
      <div style={{ padding: '10px 10px 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: BORDER, borderRadius: 9999, background: '#fff', padding: '7px 11px', color: '#8C6B73', fontSize: 11, fontWeight: 700 }}>
          <Search size={13} strokeWidth={2.6} color="#430A21" /> 가게명, 메뉴 검색
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {chips.map((c, i) => (
            <span key={c} style={{
              padding: '4px 10px', border: BORDER, borderRadius: 9999, fontSize: 10, fontWeight: 800,
              background: i === 0 ? 'var(--cb-primary)' : '#fff', color: i === 0 ? '#fff' : '#430A21',
              boxShadow: i === 0 ? '0 2px 0 0 #430A21' : 'none',
            }}>{c}</span>
          ))}
        </div>
      </div>
      {/* 구장 지도 — 실제 지도 화면 캡처 */}
      <div style={{ flex: 1, position: 'relative', margin: '2px 10px 10px', border: BORDER, borderRadius: 14, background: '#DFEAD2', overflow: 'hidden' }}>
        <img
          src={mapShot}
          alt=""
          draggable={false}
          className="cb-photo"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />
      </div>
    </DemoShell>
  )
}

// ── STEP 2 · 인증 ────────────────────────────────────────────────

export function VerifyDemo() {
  return (
    <DemoShell bg="#FFFCF6">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
        <PillToggle left="용기인증" right="야구네컷" active={0} />
      </div>
      <div style={{ flex: 1, position: 'relative', margin: '2px 12px 10px', border: BORDER, borderRadius: 14, background: '#F8F1F2', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={reusableMascot} alt="" draggable={false} style={{ width: '64%', maxWidth: 190, height: 'auto' }} />
        <div className="cb-scanline" aria-hidden="true" />
        <FocusBrackets color="#430A21" />
        <span style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: '#430A21', color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 9999, whiteSpace: 'nowrap' }}>
          AI가 다회용기를 확인해요
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}>
        <Shutter />
      </div>
    </DemoShell>
  )
}

// ── STEP 3 · 야구네컷 ─────────────────────────────────────────────

export function CardDemo() {
  return (
    <DemoShell bg="#FFFCF6">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
        <PillToggle left="용기인증" right="야구네컷" active={1} />
      </div>
      <div style={{ flex: 1, position: 'relative', margin: '2px 12px 10px', border: BORDER, borderRadius: 14, overflow: 'hidden' }}>
        <img src={stadiumBg} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <img src={victorySticker} alt="" draggable={false} style={{ position: 'absolute', left: '50%', bottom: '6%', transform: 'translateX(-50%)', width: '56%' }} />
        <span style={{ position: 'absolute', top: 10, left: 10, border: BORDER, borderRadius: 9999, background: 'rgba(255,255,255,0.94)', color: '#430A21', fontSize: 10, fontWeight: 800, padding: '4px 10px' }}>1컷</span>
        <span style={{ position: 'absolute', top: 10, right: 10, border: BORDER, borderRadius: 9999, background: 'rgba(255,255,255,0.94)', color: '#430A21', fontSize: 10, fontWeight: 800, padding: '4px 10px' }}>캐릭터 꾸미기 ✨</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}>
        <Shutter />
      </div>
    </DemoShell>
  )
}

// ── STEP 4 · 기록 ────────────────────────────────────────────────

export function RecordDemo() {
  const photoDays = [8, 17, 26]
  return (
    <DemoShell>
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px 8px' }}>
        {['다회용기 인증', '야구네컷'].map((t, i) => (
          <span key={t} style={{
            flex: 1, textAlign: 'center', padding: '8px 0', border: i === 0 ? '2px solid var(--cb-primary)' : BORDER,
            borderRadius: 12, fontSize: 11, fontWeight: 800,
            background: i === 0 ? 'var(--cb-primary-soft)' : '#fff',
            color: i === 0 ? 'var(--cb-primary-deep)' : '#430A21',
            boxShadow: i === 0 ? '0 2px 0 0 var(--cb-primary)' : '0 2px 0 0 #430A21',
          }}>{t}</span>
        ))}
      </div>
      <div style={{ flex: 1, margin: '0 12px 12px', border: BORDER, background: '#fff', boxShadow: '3px 3px 0 0 #430A21', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
            <span key={w} style={{ textAlign: 'center', padding: '5px 0', fontSize: 9, fontWeight: 800, color: i === 0 ? '#C2362C' : '#5E1530', borderBottom: BORDER, background: '#F8EAC9' }}>{w}</span>
          ))}
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr' }}>
          {Array.from({ length: 28 }, (_, i) => {
            const day = i + 1
            const hasPhoto = photoDays.includes(day)
            const cellStyle: CSSProperties = {
              position: 'relative', overflow: 'hidden',
              borderRight: i % 7 === 6 ? 'none' : '1px solid rgba(67,10,33,0.12)',
              borderBottom: '1px solid rgba(67,10,33,0.12)',
              background: hasPhoto ? '#F0E8E7' : '#fff',
            }
            return (
              <span key={day} style={cellStyle}>
                {hasPhoto && (
                  <img src={stadiumBg} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <span style={{
                  position: 'absolute', top: 2, left: 3, fontSize: 9, fontWeight: 800,
                  color: hasPhoto ? '#fff' : i % 7 === 0 ? '#C2362C' : '#430A21',
                  textShadow: hasPhoto ? '0 1px 0 rgba(67,10,33,0.8)' : 'none',
                }}>{day}</span>
              </span>
            )
          })}
        </div>
      </div>
    </DemoShell>
  )
}
