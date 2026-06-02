import { Camera, ChevronRight, Map as MapIcon, Calendar, ScanLine, Image as ImageIcon } from 'lucide-react';
import { useApp, type CameraPurpose } from '../../AppContext';
import { useAuthStore } from '../../../store/authStore';
import { useNavigation } from '../../navigation';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 'var(--cb-radius-lg)',
  padding: 16,
  border: '2px solid #430A21',
  boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
};

const PURPOSES: Array<{
  value: CameraPurpose;
  title: string;
  subtitle: string;
  icon: typeof ScanLine;
}> = [
  { value: 'verify', title: '인증', subtitle: '다회용기 사용·반납 인증', icon: ScanLine },
  { value: 'visit-card', title: '직관카드', subtitle: '오늘의 직관 순간 카드', icon: ImageIcon },
];

export function HomeScreen() {
  const { navigate } = useNavigation();
  const user = useAuthStore((s) => s.user);
  const { selectedTeam, totalCertCount, ecoImpact, cameraPurpose, setCameraPurpose, certificationLogs } = useApp();

  const teamLabel = selectedTeam ?? user?.teamCode ?? '응원팀';
  const activePurpose = PURPOSES.find((p) => p.value === cameraPurpose) ?? PURPOSES[0];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <StatusBar centerLabel="홈" />

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
        {/* 인사 + 에코 요약 */}
        <div style={cardStyle}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cb-primary-deep)' }}>
            {teamLabel} 팬 · {user?.nickname ?? '게스트'}
          </p>
          <p style={{ marginTop: 4, fontSize: 17, fontWeight: 800, color: '#0F172A', lineHeight: 1.35 }}>
            오늘도 다회용기로 함께 줄여요
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 8,
              marginTop: 14,
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

        {/* 카메라 용도 토글 */}
        <div style={cardStyle}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>카메라 용도</p>
          <p style={{ marginTop: 3, fontSize: 11, color: '#64748B' }}>
            중앙 카메라 버튼이 무엇을 찍을지 선택하세요.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
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
                    padding: '12px 12px 11px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: active ? '0 3px 0 0 var(--cb-primary)' : '0 2px 0 0 #430A21',
                  }}
                >
                  <Icon size={18} color={active ? 'var(--cb-primary-deep)' : '#64748B'} />
                  <p style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: active ? 'var(--cb-primary-deep)' : '#0F172A' }}>
                    {p.title}
                  </p>
                  <p style={{ marginTop: 3, fontSize: 10, color: '#64748B', lineHeight: 1.4 }}>{p.subtitle}</p>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => navigate('report')}
            style={{
              width: '100%',
              marginTop: 12,
              borderRadius: 'var(--cb-radius-md)',
              border: '2px solid #430A21',
              background: 'var(--cb-primary)',
              color: '#fff',
              padding: '14px 12px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 3px 0 0 #430A21, 0 4px 8px rgba(200, 92, 119, 0.32)',
            }}
          >
            <Camera size={18} />
            {activePurpose.title} 카메라 열기
          </button>
        </div>

        {/* 바로가기 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: '식음료 지도', icon: MapIcon, onClick: () => navigate('map') },
            { label: '인증 캘린더', icon: Calendar, onClick: () => navigate('calendar') },
          ].map((q) => {
            const Icon = q.icon;
            return (
              <button
                key={q.label}
                type="button"
                onClick={q.onClick}
                style={{
                  ...cardStyle,
                  padding: '14px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={18} color="var(--cb-primary-deep)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{q.label}</span>
                </span>
                <ChevronRight size={16} color="#94A3B8" />
              </button>
            );
          })}
        </div>

        {/* 최근 인증 */}
        {certificationLogs.length > 0 && (
          <div style={cardStyle}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>최근 인증</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {certificationLogs.slice(0, 4).map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: 'var(--cb-radius-md)',
                    background: '#F8FAFC',
                    border: '2px solid #430A21',
                    boxShadow: '0 2px 0 0 #430A21',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{log.label}</span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
