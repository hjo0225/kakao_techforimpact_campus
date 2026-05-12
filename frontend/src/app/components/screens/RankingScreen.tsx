import { useEffect, useState } from 'react';
import { useApp } from '../../AppContext';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import {
  Award,
  BarChart3,
  ChevronRight,
  Coffee,
  Gift,
  Trophy,
} from 'lucide-react';
import { useNavigation } from '../../navigation';
import { TeamBadge } from '../TeamBadge';
import { getTeamRankings, type TeamRanking } from '../../../lib/rankingsApi';

function normalizeTeam(team: string | null | undefined) {
  return (team ?? '').split(' ')[0];
}

export function RankingScreen() {
  const { points, selectedTeam } = useApp();
  const { navigate } = useNavigation();
  const [teams, setTeams] = useState<TeamRanking[]>([]);

  useEffect(() => {
    let cancelled = false;
    getTeamRankings()
      .then((data) => {
        if (!cancelled) setTeams(data);
      })
      .catch(() => {
        if (!cancelled) setTeams([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const myTeamKey = normalizeTeam(selectedTeam);
  const supportTeamEntry = myTeamKey
    ? teams.find((t) => normalizeTeam(t.displayName) === myTeamKey)
    : undefined;
  const supportRank = supportTeamEntry
    ? teams.findIndex((t) => t.teamCode === supportTeamEntry.teamCode) + 1
    : 0;
  const topGap = supportTeamEntry && teams.length > 0
    ? Math.max(0, teams[0].totalPoints - supportTeamEntry.totalPoints)
    : 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F2FBF5' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <StatusBar />
        <div style={{ display: 'flex', alignItems: 'center', padding: '2px 14px 8px', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#111827' }}>리그</span>
          <button
            onClick={() => navigate('account')}
            aria-label="MY"
            title="MY"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: 'linear-gradient(135deg, #3DDB6D, #1AB852)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(61,219,109,0.28)',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>MY</span>
          </button>
        </div>
      </div>

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
            background: 'linear-gradient(145deg, #133A2A 0%, #1D7A47 62%, #35BA68 100%)',
            borderRadius: 22,
            padding: '16px',
            color: '#fff',
            boxShadow: '0 12px 28px rgba(19,58,42,0.18)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 999,
                  padding: '4px 10px',
                  background: 'rgba(255,255,255,0.14)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  marginBottom: 8,
                }}
              >
                <Trophy size={13} color="#FDE68A" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#F8FAFC' }}>누적 리그</span>
              </div>
              <p style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.22, marginBottom: 4 }}>KBO 환경 리그</p>
              <p style={{ fontSize: 11, lineHeight: 1.5, color: 'rgba(255,255,255,0.78)' }}>
                구단별 친환경 실천 포인트를 한 화면에서 확인합니다.
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
              <span style={{ fontSize: 10, fontWeight: 700, color: '#D1FAE5', textAlign: 'center' }}>
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
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 16,
                padding: '12px',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>내 응원팀 순위</p>
              <p style={{ fontSize: 20, fontWeight: 800, marginBottom: 3 }}>
                {supportRank > 0 ? `#${supportRank}` : '-'}
              </p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.78)' }}>
                {supportTeamEntry ? `1위와 ${topGap.toLocaleString()}P 차이` : '응원팀을 설정하세요'}
              </p>
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 16,
                padding: '12px',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>내 누적 포인트</p>
              <p style={{ fontSize: 20, fontWeight: 800, marginBottom: 3 }}>
                {points.toLocaleString()}
                <span style={{ fontSize: 11, marginLeft: 2 }}>P</span>
              </p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.78)' }}>
                {supportTeamEntry ? `응원팀에 합산되는 점수` : '인증으로 점수를 모아보세요'}
              </p>
            </div>
          </div>
        </section>

        <section
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: '14px',
            boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 3 }}>팀 랭킹</p>
              <p style={{ fontSize: 10, color: '#6B7280' }}>구단별 누적 친환경 포인트</p>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                background: '#F5F8FF',
                border: '1px solid #DCE7FF',
                padding: '6px 10px',
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
                    borderRadius: 16,
                    background: isSupportTeam ? '#F0FFF6' : '#F9FAFB',
                    border: isSupportTeam ? '1.5px solid #93E7AF' : '1px solid #EEF1F4',
                    boxShadow: isSupportTeam ? '0 6px 16px rgba(61,219,109,0.12)' : 'none',
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
                          color: isSupportTeam ? '#13923F' : '#111827',
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
                            color: '#13923F',
                            background: '#DFF8E8',
                            borderRadius: 999,
                            padding: '3px 7px',
                            border: '1px solid #BDEECD',
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
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 3 }}>
                      {entry.totalPoints.toLocaleString()}P
                    </p>
                    <p style={{ fontSize: 10, color: '#6B7280' }}>구단 누적</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: '14px',
            boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 3 }}>내 기록</p>
              <p style={{ fontSize: 10, color: '#6B7280' }}>인증 누적과 등급 진행 상황</p>
            </div>
            <button
              onClick={() => navigate('record')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                border: 'none',
                background: 'none',
                padding: '12px 8px',
                margin: '-12px -8px',
                minHeight: 44,
                color: '#13923F',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              자세히 보기
              <ChevronRight size={14} />
            </button>
          </div>
        </section>

        <section
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: '14px',
            boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 3 }}>리워드 상세</p>
            <p style={{ fontSize: 10, color: '#6B7280' }}>커피트럭 · 사인볼 · 에코 굿즈</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              {
                icon: <Coffee size={16} color="#B45309" />,
                title: '커피트럭 응원 데이',
                desc: '응원팀 시즌 1위 달성 시 홈구장 커피트럭 운영',
                status: '팀 순위 반영',
                tone: '#FFF7E8',
                border: '#FDE1A6',
              },
              {
                icon: <Award size={16} color="#1565C0" />,
                title: '선수 친필 사인볼',
                desc: '개인 포인트 상위 추첨 대상',
                status: '응모 진행 중',
                tone: '#F5F8FF',
                border: '#DCE7FF',
              },
              {
                icon: <Gift size={16} color="#13923F" />,
                title: '에코 굿즈 세트',
                desc: '누적 1,500P 달성 시 자동 응모',
                status: `${Math.max(0, 1500 - points)}P 남음`,
                tone: '#F0FFF6',
                border: '#C8F2D6',
              },
            ].map((reward) => (
              <div
                key={reward.title}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  borderRadius: 16,
                  padding: '12px',
                  background: reward.tone,
                  border: `1px solid ${reward.border}`,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {reward.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#111827', marginBottom: 4 }}>{reward.title}</p>
                  <p style={{ fontSize: 10, lineHeight: 1.45, color: '#6B7280', marginBottom: 6 }}>{reward.desc}</p>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#111827',
                      background: '#fff',
                      borderRadius: 999,
                      padding: '4px 8px',
                    }}
                  >
                    {reward.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
