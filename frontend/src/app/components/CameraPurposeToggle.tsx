import { ScanLine, Image as ImageIcon, type LucideIcon } from 'lucide-react';
import { useApp, type CameraPurpose } from '../AppContext';

const PURPOSES: Array<{ value: CameraPurpose; title: string; icon: LucideIcon }> = [
  { value: 'verify', title: '인증', icon: ScanLine },
  { value: 'visit-card', title: '직관카드', icon: ImageIcon },
];

// 맨 위 용도 설정 — 인증 / 직관카드 (밑줄 탭 스타일)
export function CameraPurposeToggle() {
  const { cameraPurpose, setCameraPurpose } = useApp();

  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '2px solid #430A21',
      }}
    >
      {PURPOSES.map((p) => {
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
              marginBottom: -2,
              background: 'transparent',
              border: 'none',
              borderBottom: active ? '3px solid var(--cb-primary)' : '3px solid transparent',
              color: active ? 'var(--cb-primary-deep)' : '#94A3B8',
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
