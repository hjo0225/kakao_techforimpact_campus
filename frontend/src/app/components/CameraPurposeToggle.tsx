import { ScanLine, Image as ImageIcon, type LucideIcon } from 'lucide-react';
import { useApp, type CameraPurpose } from '../AppContext';

const PURPOSES: Array<{ value: CameraPurpose; title: string; desc: string; icon: LucideIcon }> = [
  { value: 'verify', title: '인증', desc: '다회용기 사용·반납 사진을 찍어 AI로 인증해요', icon: ScanLine },
  { value: 'visit-card', title: '직관카드', desc: '오늘 직관 사진으로 카드를 만들어 저장해요', icon: ImageIcon },
];

// 맨 위 용도 설정 — 인증 / 직관카드 (테두리 있는 세그먼트 탭)
export function CameraPurposeToggle() {
  const { cameraPurpose, setCameraPurpose } = useApp();

  const activePurpose = PURPOSES.find((p) => p.value === cameraPurpose) ?? PURPOSES[0];

  return (
    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div
        style={{
          display: 'flex',
          border: '2px solid #430A21',
          borderRadius: 'var(--cb-radius-md)',
          overflow: 'hidden',
          boxShadow: '0 2px 0 0 #430A21',
        }}
      >
        {PURPOSES.map((p, i) => {
          const active = p.value === cameraPurpose;
          const Icon = p.icon;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => setCameraPurpose(p.value)}
              aria-pressed={active}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                height: 48,
                padding: 0,
                boxSizing: 'border-box',
                lineHeight: 1,
                background: active ? 'var(--cb-primary)' : '#fff',
                color: active ? '#fff' : '#64748B',
                border: 'none',
                borderRight: i === 0 ? '2px solid #430A21' : 'none',
                fontSize: 14,
                fontWeight: active ? 800 : 600,
                cursor: 'pointer',
              }}
            >
              <Icon size={17} strokeWidth={active ? 2.6 : 2} />
              {p.title}
            </button>
          );
        })}
      </div>
      <p style={{ margin: 0, fontSize: 11, color: '#8C6B73', fontWeight: 600, lineHeight: 1.4, paddingLeft: 2 }}>
        {activePurpose.desc}
      </p>
    </div>
  );
}
