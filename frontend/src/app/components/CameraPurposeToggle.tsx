import { ScanLine, Image as ImageIcon, type LucideIcon } from 'lucide-react';
import { useApp, type CameraPurpose } from '../AppContext';

const PURPOSES: Array<{ value: CameraPurpose; title: string; icon: LucideIcon }> = [
  { value: 'verify', title: '인증', icon: ScanLine },
  { value: 'visit-card', title: '직관카드', icon: ImageIcon },
];

// 맨 위 용도 설정 — 인증 / 직관카드 (테두리 있는 세그먼트 탭)
export function CameraPurposeToggle() {
  const { cameraPurpose, setCameraPurpose } = useApp();

  return (
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
              padding: '12px 0',
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
  );
}
