import { LogOut, UserRound } from 'lucide-react';
import { useApp } from '../../AppContext';
import { useAuthStore } from '../../../store/authStore';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 'var(--cb-radius-lg)',
  padding: 16,
  border: '2px solid #430A21',
  boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
};

export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { totalCertCount, ecoImpact } = useApp();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <StatusBar centerLabel="프로필" />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '14px 16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* 프로필 카드 */}
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '9999px',
              flexShrink: 0,
              background: 'var(--cb-primary-soft)',
              border: '2px solid #430A21',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserRound size={28} color="var(--cb-primary-deep)" />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
              {user?.nickname ?? '게스트'}
            </p>
          </div>
        </div>

        {/* 누적 통계 (포인트 없음) */}
        <div style={cardStyle}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>나의 기여</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 8,
              marginTop: 12,
            }}
          >
            {[
              { label: '누적 인증', value: `${totalCertCount}건` },
              { label: '줄인 용기', value: `${ecoImpact.containers}개` },
              { label: '폐기물 감량', value: `${ecoImpact.wasteKg}kg` },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  borderRadius: 'var(--cb-radius-md)',
                  background: '#F8FAFC',
                  border: '2px solid #430A21',
                  padding: '10px 8px',
                  boxShadow: '0 2px 0 0 #430A21',
                }}
              >
                <p style={{ fontSize: 10, color: '#64748B' }}>{item.label}</p>
                <p style={{ marginTop: 4, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 로그아웃 */}
        <button
          type="button"
          onClick={() => logout()}
          style={{
            ...cardStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            color: '#E11D48',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <LogOut size={18} />
          로그아웃
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
