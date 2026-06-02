import { ScanLine, Image as ImageIcon, type LucideIcon } from 'lucide-react';
import { useApp, type CameraPurpose } from '../AppContext';

const PURPOSES: Array<{ value: CameraPurpose; title: string; icon: LucideIcon }> = [
  { value: 'verify', title: '인증', icon: ScanLine },
  { value: 'visit-card', title: '직관카드', icon: ImageIcon },
];

// 맨 위 용도 설정 — 카메라가 무엇을 찍을지(인증 / 직관카드) 선택
export function CameraPurposeToggle() {
  const { cameraPurpose, setCameraPurpose } = useApp();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
              borderRadius: 'var(--cb-radius-md)',
              border: active ? '2px solid var(--cb-primary)' : '2px solid #430A21',
              background: active ? 'var(--cb-primary-soft)' : '#fff',
              color: active ? 'var(--cb-primary-deep)' : '#0F172A',
              padding: '12px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: active ? '0 3px 0 0 var(--cb-primary)' : '0 2px 0 0 #430A21',
            }}
          >
            <Icon size={18} color={active ? 'var(--cb-primary-deep)' : '#64748B'} />
            {p.title}
          </button>
        );
      })}
    </div>
  );
}
