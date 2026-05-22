import { type ReactNode, useEffect, useState } from 'react';
import {
  Bell,
  Camera,
  ChevronRight,
  Leaf,
  Map,
  Plus,
  RotateCcw,
  Share2,
  Trophy,
} from 'lucide-react';
import { useApp } from '../../AppContext';
import { useAuthStore } from '../../../store/authStore';
import { useNavigation, type Route } from '../../navigation';
import { TeamBadge } from '../TeamBadge';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import { getTeamRankings, type TeamRanking } from '../../../lib/rankingsApi';

function normalizeTeam(team: string | null | undefined) {
  return (team ?? '').split(' ')[0];
}

const TODAY_GAMES = [
  { teams: 'LG vs 두산', venue: '잠실', time: '18:30' },
  { teams: 'SSG vs KT', venue: '인천', time: '18:30' },
  { teams: 'NC vs 한화', venue: '창원', time: '18:30' },
];

const SECTIONS = [
  '1루 내야',
  '1루 외야',
  '3루 내야',
  '3루 외야',
  '1루 응원석',
  '3루 응원석',
  '중앙 테이블석',
  '외야 잔디석',
];

function Card({
  children,
  border,
  background,
}: {
  children: ReactNode;
  border?: string;
  background?: string;
}) {
  return (
    <div style={{
      background: background ?? '#fff',
      borderRadius: 'var(--cb-radius-lg)',
      padding: 14,
      border: `2px solid ${border ?? '#430A21'}`,
      boxShadow: background
        ? '0 4px 0 0 #430A21, 0 6px 12px rgba(67, 10, 33, 0.24)'
        : '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: 12, fontWeight: 800, color: '#374151', margin: '2px 0 0' }}>
      {children}
    </p>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ height: 8, borderRadius: 'var(--cb-radius-full)', background: '#E5E7EB', overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.min(value, 100)}%`,
          height: '100%',
          borderRadius: 'var(--cb-radius-full)',
          background: 'var(--cb-primary)',
          transition: 'width 0.25s ease',
        }}
      />
    </div>
  );
}

function QuickAction({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: '#fff',
        border: '2px solid #430A21',
        borderRadius: 'var(--cb-radius-lg)',
        padding: '12px 8px',
        minHeight: 94,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        textAlign: 'left',
        boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
      }}
    >
      <span style={{
        width: 34,
        height: 34,
        borderRadius: 'var(--cb-radius-sm)',
        background: 'var(--cb-primary-soft)',
        color: 'var(--cb-primary-deep)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1.5px solid #430A21',
      }}>
        {icon}
      </span>
      <span>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 900, color: '#111827', lineHeight: 1.2 }}>
          {label}
        </span>
        <span style={{ display: 'block', fontSize: 10, color: '#6B7280', marginTop: 2, lineHeight: 1.3 }}>
          {sub}
        </span>
      </span>
    </button>
  );
}

export function HomeScreen() {
  const { navigate } = useNavigation();
  const {
    selectedTeam,
    selectedGame,
    cancelSelectedGame,
    seatInfo,
    setSeatInfo,
    todayMission,
    certificationLogs,
    totalCertCount,
    isTimesaleActive,
    ecoImpact,
    reusableUseCount,
    reusableReturnCount,
  } = useApp();
  const user = useAuthStore((s) => s.user);
  const [seatNumberInput, setSeatNumberInput] = useState(seatInfo.seatNumber);
  const [allTeams, setAllTeams] = useState<TeamRanking[]>([]);

  useEffect(() => {
    let cancelled = false;
    getTeamRankings()
      .then((data) => {
        if (!cancelled) setAllTeams(data);
      })
      .catch(() => {
        if (!cancelled) setAllTeams([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const topTeams = allTeams.slice(0, 3);
  const myTeamKey = normalizeTeam(selectedTeam);
  const supportTeamEntry = myTeamKey
    ? allTeams.find((t) => normalizeTeam(t.displayName) === myTeamKey)
    : undefined;
  const supportRank = supportTeamEntry
    ? allTeams.findIndex((t) => t.teamCode === supportTeamEntry.teamCode) + 1
    : 0;

  const latestCert = certificationLogs[0];

  const missionItems = [
    { label: '사용 인증', done: todayMission.useDone },
    { label: '반납 인증', done: todayMission.returnDone },
    { label: '직관 카드', done: todayMission.shared },
  ];

  const go = (route: Route) => navigate(route);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <StatusBar />

      <div
        className="hide-scroll"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <section
          onClick={() => go('ranking')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              go('ranking');
            }
          }}
          style={{
            background: 'var(--cb-surface)',
            border: '2px solid #430A21',
            borderRadius: 'var(--cb-radius-lg)',
            padding: '12px 14px',
            boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 'var(--cb-radius-full)',
            border: '2px solid #430A21',
            overflow: 'hidden',
            flexShrink: 0,
            background: 'var(--cb-primary-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 0 0 #430A21',
          }}>
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.nickname ? `${user.nickname} 프로필` : '내 프로필'}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--cb-primary-deep)' }}>MY</span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {user?.nickname && (
              <p style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, letterSpacing: '0.04em' }}>
                {user.nickname}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedTeam && <TeamBadge teamName={selectedTeam} size={24} />}
              <span style={{
                fontSize: 14,
                fontWeight: 900,
                color: '#430A21',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {selectedTeam ?? '응원팀 미지정'}
              </span>
            </div>
          </div>

          <div style={{
            flexShrink: 0,
            textAlign: 'center',
            minWidth: 64,
            padding: '6px 12px',
            background: supportRank > 0 ? 'var(--cb-primary-soft)' : 'var(--cb-bg-soft)',
            border: `2px solid ${supportRank > 0 ? 'var(--cb-primary-border)' : '#D1D5DB'}`,
            borderRadius: 'var(--cb-radius-md)',
            boxShadow: supportRank > 0
              ? '0 2px 0 0 var(--cb-primary-border)'
              : '0 2px 0 0 #D1D5DB',
          }}>
            <p style={{ fontSize: 9, color: '#6B7280', fontWeight: 700, letterSpacing: '0.04em' }}>리그 순위</p>
            <p style={{
              fontSize: 20,
              fontWeight: 900,
              color: supportRank > 0 ? 'var(--cb-primary-deep)' : '#9CA3AF',
              lineHeight: 1.1,
              marginTop: 2,
            }}>
              {supportRank > 0 ? `#${supportRank}` : '-'}
            </p>
          </div>
        </section>

        <section className="cb-hero-card">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <p style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: '#430A21' }}>{ecoImpact.containers}</p>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#5E1530' }}>개 줄임</p>
            <span style={{ fontSize: 11, color: '#5E1530', marginLeft: 'auto', fontWeight: 700 }}>
              누적 인증 {totalCertCount}건
            </span>
          </div>

          <div style={{ height: 10, borderRadius: 'var(--cb-radius-full)', background: 'rgba(67,10,33,0.18)', overflow: 'hidden', marginBottom: 12, border: '2px solid #430A21' }}>
            <div
              style={{
                width: `${Math.max(2, Math.min(100, ecoImpact.seoulContributionPct * 100))}%`,
                height: '100%',
                background: '#FFFFFF',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {[
              { label: '폐기물 감량', value: `${ecoImpact.wasteKg} kg` },
              { label: '탄소 절감', value: `${ecoImpact.carbonKg} kg` },
              { label: '사용·반납', value: `${reusableUseCount}·${reusableReturnCount}` },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: 'rgba(255,255,255,0.24)',
                  border: '2px solid #430A21',
                  borderRadius: 'var(--cb-radius-md)',
                  padding: '10px 8px',
                  textAlign: 'center',
                  boxShadow: '0 2px 0 0 #430A21',
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 900 }}>{item.value}</p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.72)', marginTop: 3 }}>{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        {!selectedGame && (
          <button
            type="button"
            onClick={() => go('game-select')}
            className="cb-button cb-button--primary cb-button--md cb-button--full"
          >
            <Plus size={17} />
            오늘 관람 경기 선택
          </button>
        )}

        {selectedGame && (
          <>
            <Card
              border={isTimesaleActive ? '#FCD34D' : 'var(--cb-primary-border)'}
              background={
                isTimesaleActive
                  ? 'linear-gradient(180deg, #FFFCF0 0%, #FFF1B8 55%, #FCD34D 100%)'
                  : 'linear-gradient(180deg, #FFFCF6 0%, #FBE6EA 55%, #F2A2AD 100%)'
              }
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>오늘의 미션</p>
                  <p style={{ fontSize: 17, fontWeight: 900, color: '#111827' }}>
                    {todayMission.completed}/{todayMission.total} 완료
                  </p>
                </div>
                <span style={{
                  alignSelf: 'flex-start',
                  borderRadius: 'var(--cb-radius-full)',
                  padding: '5px 12px',
                  background: isTimesaleActive ? '#FFF8E6' : 'var(--cb-primary-soft)',
                  color: isTimesaleActive ? '#B07800' : 'var(--cb-primary-deep)',
                  fontSize: 11,
                  fontWeight: 900,
                  border: `1.5px solid ${isTimesaleActive ? '#B07800' : 'var(--cb-primary-border)'}`,
                }}>
                  {isTimesaleActive ? '7-8회 조기반납 추천' : '경기 중 인증'}
                </span>
              </div>
              <ProgressBar value={todayMission.percent} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginTop: 12 }}>
                {missionItems.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      borderRadius: 'var(--cb-radius-md)',
                      padding: '10px 6px',
                      textAlign: 'center',
                      background: item.done ? 'var(--cb-primary-soft)' : '#F3F4F6',
                      border: `2px solid ${item.done ? 'var(--cb-primary-border)' : '#D1D5DB'}`,
                      boxShadow: item.done
                        ? '0 2px 0 0 var(--cb-primary-border)'
                        : '0 2px 0 0 #D1D5DB',
                    }}
                  >
                    <p style={{ fontSize: 16, fontWeight: 900, color: item.done ? 'var(--cb-primary-deep)' : '#9CA3AF' }}>
                      {item.done ? '✓' : '-'}
                    </p>
                    <p style={{ fontSize: 10, color: '#6B7280' }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </Card>

            {isTimesaleActive && (
              <Card border="#FCD34D">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Bell size={18} color="#B07800" />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: '#B07800', fontWeight: 900 }}>조기 반납 추천 시간</p>
                    <p style={{ fontSize: 11, color: '#6B7280' }}>7~8회에 반납하면 대기 줄을 피해 빠르게 환경 기여를 마칠 수 있어요.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => go('map')}
                    style={{
                      border: '2px solid #430A21',
                      borderRadius: 'var(--cb-radius-md)',
                      padding: '8px 12px',
                      background: '#B07800',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 2px 0 0 #430A21, 0 3px 5px rgba(67, 10, 33, 0.18)',
                    }}
                  >
                    지도
                  </button>
                </div>
              </Card>
            )}

            <Card>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 88px', gap: 8, alignItems: 'end' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>내 좌석 구역</span>
                  <select
                    value={seatInfo.section}
                    onChange={(event) => setSeatInfo({ section: event.target.value, seatNumber: seatNumberInput })}
                    style={{
                      width: '100%',
                      minHeight: 44,
                      borderRadius: 'var(--cb-radius-md)',
                      border: '2px solid #430A21',
                      background: 'var(--cb-bg-soft)',
                      padding: '0 12px',
                      fontSize: 13,
                      color: seatInfo.section ? '#111827' : '#9CA3AF',
                      boxShadow: 'inset 0 2px 0 0 rgba(67, 10, 33, 0.08)',
                    }}
                  >
                    <option value="">구역 선택</option>
                    {SECTIONS.map((section) => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>좌석</span>
                  <input
                    value={seatNumberInput}
                    onChange={(event) => {
                      setSeatNumberInput(event.target.value);
                      setSeatInfo({ section: seatInfo.section, seatNumber: event.target.value });
                    }}
                    placeholder="A-12"
                    style={{
                      width: '100%',
                      minHeight: 44,
                      borderRadius: 'var(--cb-radius-md)',
                      border: '2px solid #430A21',
                      background: 'var(--cb-bg-soft)',
                      padding: '0 12px',
                      fontSize: 13,
                      color: '#111827',
                      boxShadow: 'inset 0 2px 0 0 rgba(67, 10, 33, 0.08)',
                    }}
                  />
                </label>
              </div>
            </Card>
          </>
        )}

        <SectionTitle>빠른 실행</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <QuickAction icon={<Camera size={18} />} label="인증" sub="AI 판별" onClick={() => go('report')} />
          <QuickAction icon={<Map size={18} />} label="지도" sub="매장·메뉴" onClick={() => go('map')} />
          <QuickAction icon={<Trophy size={18} />} label="리그" sub="팀 순위" onClick={() => go('ranking')} />
          <QuickAction icon={<Share2 size={18} />} label="카드" sub="공유" onClick={() => go('record')} />
        </div>

        <SectionTitle>팀 환경 리그 TOP 3</SectionTitle>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {topTeams.length === 0 && (
              <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', padding: '8px 0' }}>
                랭킹을 불러오는 중...
              </p>
            )}
            {topTeams.map((item, index) => (
              <div key={item.teamCode} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 20, fontSize: 13, fontWeight: 900, color: 'var(--cb-primary-deep)' }}>{index + 1}</span>
                <TeamBadge teamName={item.displayName} size={28} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#111827' }}>{item.displayName}</span>
                <span style={{ fontSize: 11, color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Leaf size={11} color="var(--cb-primary-deep)" />
                  {item.memberCount.toLocaleString()}명 참여
                </span>
              </div>
            ))}
          </div>
        </Card>

        <SectionTitle>{selectedGame ? '오늘 환경 기록' : '오늘의 KBO 경기'}</SectionTitle>
        {selectedGame ? (
          <Card>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { label: '줄인 용기', value: `${ecoImpact.containers}개` },
                { label: '감량', value: `${ecoImpact.wasteKg}kg` },
                { label: '최근 인증', value: latestCert ? latestCert.label.replace(' 인증', '') : '-' },
              ].map((item) => (
                <div key={item.label} style={{ textAlign: 'center', background: 'var(--cb-bg-soft)', borderRadius: 'var(--cb-radius-md)', padding: '10px 6px', border: '2px solid #430A21', boxShadow: '0 2px 0 0 #430A21' }}>
                  <p style={{ fontSize: 16, fontWeight: 900, color: '#111827' }}>{item.value}</p>
                  <p style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{item.label}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => cancelSelectedGame()}
              style={{
                width: '100%',
                marginTop: 12,
                border: '2px solid #430A21',
                borderRadius: 'var(--cb-radius-md)',
                padding: '10px 12px',
                background: '#fff',
                color: '#430A21',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 2px 0 0 #430A21, 0 3px 5px rgba(67, 10, 33, 0.14)',
              }}
            >
              <RotateCcw size={14} />
              경기 변경 / 해제
            </button>
          </Card>
        ) : (
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TODAY_GAMES.map((game) => (
                <div key={game.teams} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: 'var(--cb-bg-soft)',
                  borderRadius: 'var(--cb-radius-md)',
                  border: '2px solid #430A21',
                  boxShadow: '0 2px 0 0 #430A21',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#111827' }}>{game.teams}</span>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>
                    {game.venue} · {game.time}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => go('game-select')}
              className="cb-button cb-button--soft cb-button--md cb-button--full"
              style={{ marginTop: 10 }}
            >
              전체 경기 보기
              <ChevronRight size={14} />
            </button>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
