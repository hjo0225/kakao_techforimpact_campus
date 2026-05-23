import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../AppContext';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import {
  BarChart3,
  Leaf,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { TeamBadge } from '../TeamBadge';
import { getTeamRankings, type TeamRanking } from '../../../lib/rankingsApi';

function normalizeTeam(team: string | null | undefined) {
  return (team ?? '').split(' ')[0];
}

export function RankingScreen() {
  const { selectedTeam, ecoImpact, totalCertCount } = useApp();
  const [teams, setTeams] = useState<TeamRanking[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRankings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTeamRankings();
      setTeams(data);
    } catch {
      // 실패 시 기존 데이터 유지 (마지막 성공 응답)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRankings();
  }, [loadRankings]);

  const myTeamKey = normalizeTeam(selectedTeam);
  const supportTeamEntry = myTeamKey
    ? teams.find((t) => normalizeTeam(t.displayName) === myTeamKey)
    : undefined;
  const supportRank = supportTeamEntry
    ? teams.findIndex((t) => t.teamCode === supportTeamEntry.teamCode) + 1
    : 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <StatusBar />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '14px 20px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <section
          style={{
            position: 'relative',
            background: 'linear-gradient(180deg, #ffe0e5 0%, #f2a2ad 55%, #c85c77 100%)',
            borderRadius: 'var(--cb-radius-lg)',
            padding: '16px',
            color: '#430A21',
            border: '2px solid #430A21',
            boxShadow: '0 4px 0 0 #430A21, 0 6px 14px rgba(67, 10, 33, 0.20)',
          }}
        >
          <button
            type="button"
            onClick={() => void loadRankings()}
            disabled={loading}
            aria-label="랭킹 새로고침"
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.65)',
              border: '2px solid #430A21',
              borderRadius: 'var(--cb-radius-full)',
              boxShadow: '0 2px 0 0 #430A21',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <RotateCcw size={14} color="#430A21" className={loading ? 'animate-spin' : undefined} />
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 'var(--cb-radius-full)',
                  padding: '4px 12px',
                  background: 'rgba(255,255,255,0.55)',
                  border: '1.5px solid #430A21',
                  marginBottom: 8,
                }}
              >
                <Trophy size={13} color="#B07800" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#430A21' }}>누적 리그</span>
              </div>
              <p style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.22, marginBottom: 4, color: '#430A21' }}>KBO 환경 리그</p>
              <p style={{ fontSize: 11, lineHeight: 1.5, color: '#5E1530' }}>
                구단별 다회용기 인증 누적으로 환경 기여를 비교합니다.
              </p>
            </div>
            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                minWidth: 70,
              }}
            >
              <TeamBadge teamName={supportTeamEntry?.displayName ?? selectedTeam} size={42} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#430A21', textAlign: 'center' }}>
                {supportTeamEntry ? '응원팀 고정' : '응원팀 미지정'}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.55)',
                borderRadius: 'var(--cb-radius-md)',
                padding: '12px',
                border: '2px solid #430A21',
                boxShadow: '0 2px 0 0 #430A21',
              }}
            >
              <p style={{ fontSize: 10, color: '#5E1530', marginBottom: 4 }}>내 응원팀 순위</p>
              <p style={{ fontSize: 20, fontWeight: 800, marginBottom: 3, color: '#430A21' }}>
                {supportRank > 0 ? `#${supportRank}` : '-'}
              </p>
              <p style={{ fontSize: 10, color: '#5E1530' }}>
                {supportTeamEntry ? `참여 ${supportTeamEntry.memberCount.toLocaleString()}명` : '응원팀을 설정하세요'}
              </p>
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.55)',
                borderRadius: 'var(--cb-radius-md)',
                padding: '12px',
                border: '2px solid #430A21',
                boxShadow: '0 2px 0 0 #430A21',
              }}
            >
              <p style={{ fontSize: 10, color: '#5E1530', marginBottom: 4 }}>내 시즌 인증</p>
              <p style={{ fontSize: 20, fontWeight: 800, marginBottom: 3, color: '#430A21' }}>
                {totalCertCount}<span style={{ fontSize: 11, marginLeft: 2 }}>건</span>
              </p>
              <p style={{ fontSize: 10, color: '#5E1530' }}>
                줄인 용기 {ecoImpact.containers}개
              </p>
            </div>
          </div>
        </section>

        <section
          style={{
            background: '#fff',
            borderRadius: 'var(--cb-radius-lg)',
            padding: '14px',
            boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
            border: '2px solid #430A21',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 3 }}>팀 랭킹</p>
              <p style={{ fontSize: 10, color: '#6B7280' }}>구단별 누적 환경 기여 (인증 + 반납)</p>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 'var(--cb-radius-full)',
                background: '#F5F8FF',
                border: '1.5px solid #1565C0',
                padding: '6px 12px',
                flexShrink: 0,
              }}
            >
              <BarChart3 size={13} color="#1565C0" />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#1565C0' }}>{teams.length}팀</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teams.length === 0 && (
              <div
                style={{
                  padding: '24px 12px',
                  textAlign: 'center',
                  color: '#9CA3AF',
                  fontSize: 12,
                }}
              >
                랭킹을 불러오는 중...
              </div>
            )}
            {teams.map((entry, index) => {
              const isSupportTeam = supportTeamEntry?.teamCode === entry.teamCode;
              return (
                <div
                  key={entry.teamCode}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 12px',
                    borderRadius: 'var(--cb-radius-md)',
                    background: isSupportTeam ? 'var(--cb-primary-soft)' : '#F9FAFB',
                    border: isSupportTeam ? '2px solid var(--cb-primary-border)' : '2px solid #430A21',
                    boxShadow: isSupportTeam
                      ? '0 3px 0 0 var(--cb-primary-border), 0 4px 6px rgba(200, 92, 119, 0.20)'
                      : '0 2px 0 0 #430A21',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: index < 3 ? 16 : 12, fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </span>
                  </div>
                  <TeamBadge teamName={entry.displayName} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: isSupportTeam ? 'var(--cb-primary-deep)' : '#111827',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {entry.displayName}
                      </p>
                      {isSupportTeam && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: 'var(--cb-primary-deep)',
                            background: 'var(--cb-primary-soft)',
                            borderRadius: 'var(--cb-radius-full)',
                            padding: '3px 8px',
                            border: '1.5px solid var(--cb-primary-border)',
                            flexShrink: 0,
                          }}
                        >
                          MY TEAM
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 10, color: '#6B7280' }}>
                      참여 {entry.memberCount.toLocaleString()}명
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: '#111827',
                      marginBottom: 3,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    >
                      <Leaf size={12} color="var(--cb-primary)" />
                      {entry.totalPoints.toLocaleString()}
                    </p>
                    <p style={{ fontSize: 10, color: '#6B7280' }}>구단 기여</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>

      <BottomNav />
    </div>
  );
}
