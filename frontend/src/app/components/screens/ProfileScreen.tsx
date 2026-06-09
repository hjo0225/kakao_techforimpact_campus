import { useState } from 'react';
import { LogOut, UserRound, ChevronRight, BookOpen } from 'lucide-react';
import { useApp } from '../../AppContext';
import { useAuthStore } from '../../../store/authStore';
import { useTutorialStore } from '../../../store/tutorialStore';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import { TeamBadge } from '../TeamBadge';
import { KBO_TEAMS } from '../../teamBrand';
import { cx } from '../../classNames';
import { Button } from '../design-system';

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 'var(--cb-radius-lg)',
  padding: 16,
  border: '2px solid #430A21',
  boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
};

export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const setTeam = useAuthStore((s) => s.setTeam);
  const logout = useAuthStore((s) => s.logout);
  const { totalCertCount, ecoImpact, selectedTeam, setSelectedTeam } = useApp();
  const reopenTutorial = useTutorialStore((s) => s.reopen);
  const [teamModalOpen, setTeamModalOpen] = useState(false);

  const handleSelectTeam = (teamName: string) => {
    setSelectedTeam(teamName);
    setTeam(teamName);
    setTeamModalOpen(false);
  };

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

        {/* 응원팀 카드 */}
        <button
          type="button"
          onClick={() => setTeamModalOpen(true)}
          style={{
            ...cardStyle,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <TeamBadge teamName={selectedTeam} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>응원팀</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
              {selectedTeam ?? '팀을 선택해 주세요'}
            </p>
          </div>
          <ChevronRight size={18} color="#8C6B73" />
        </button>

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

        {/* 튜토리얼 다시 보기 */}
        <button
          type="button"
          onClick={reopenTutorial}
          style={{
            ...cardStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            color: '#430A21',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <BookOpen size={18} />
          튜토리얼 다시 보기
        </button>

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

      {/* 팀 변경 모달 */}
      {teamModalOpen && (
        <>
          <div className="cb-modal-backdrop" onClick={() => setTeamModalOpen(false)} />
          <div className="cb-modal" role="dialog" aria-modal="true" aria-label="응원팀 선택">
            <h3 className="cb-modal__title">응원팀을 선택하세요</h3>
            <div className="cb-team-grid">
              {KBO_TEAMS.map((team) => {
                const isSelected = selectedTeam === team.name;
                return (
                  <button
                    key={team.name}
                    type="button"
                    onClick={() => handleSelectTeam(team.name)}
                    className={cx('cb-team-card', isSelected && 'is-selected')}
                  >
                    <div className="cb-team-card__badge">
                      <TeamBadge teamName={team.name} size={34} />
                    </div>
                    <p className="cb-team-card__name">{team.name}</p>
                    {isSelected && <div className="cb-check-dot">✓</div>}
                  </button>
                );
              })}
            </div>
            <div className="cb-modal__actions" style={{ marginTop: 16 }}>
              <Button variant="soft" size="md" fullWidth onClick={() => setTeamModalOpen(false)}>
                닫기
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
