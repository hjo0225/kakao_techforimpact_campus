import { useMemo, useState } from 'react';
import { useApp } from '../../AppContext';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  ChevronRight,
  Clock3,
  Coffee,
  Gift,
  Minus,
  Trophy,
} from 'lucide-react';
import { useNavigation } from '../../navigation';
import { TeamBadge } from '../TeamBadge';

type PeriodTab = 'weekly' | 'monthly' | 'season';

interface LeagueEntry {
  team: string;
  weekly: number;
  monthly: number;
  season: number;
  delta: number;
}

const LEAGUE_RANKING: LeagueEntry[] = [
  { team: 'LG 트윈스', weekly: 1480, monthly: 5980, season: 18240, delta: 1 },
  { team: 'KIA 타이거즈', weekly: 1410, monthly: 5720, season: 17610, delta: -1 },
  { team: '두산 베어스', weekly: 1320, monthly: 5490, season: 16980, delta: 2 },
  { team: '롯데 자이언츠', weekly: 1260, monthly: 5280, season: 16420, delta: 0 },
  { team: 'SSG 랜더스', weekly: 1190, monthly: 5040, season: 15840, delta: 1 },
  { team: '삼성 라이온즈', weekly: 1120, monthly: 4860, season: 15010, delta: -2 },
  { team: 'KT 위즈', weekly: 1070, monthly: 4620, season: 14520, delta: 1 },
  { team: 'NC 다이노스', weekly: 990, monthly: 4350, season: 13810, delta: 0 },
  { team: '한화 이글스', weekly: 940, monthly: 4160, season: 13270, delta: 1 },
  { team: '키움 히어로즈', weekly: 860, monthly: 3980, season: 12810, delta: -1 },
];

const CONTRIBUTION_DATA: Record<PeriodTab, { label: string; value: number; accent: string }[]> = {
  weekly: [
    { label: '사용 인증', value: 12, accent: '#3DDB6D' },
    { label: '반납 인증', value: 9, accent: '#1565C0' },
    { label: '조기반납', value: 5, accent: '#F59E0B' },
    { label: '직관 카드', value: 3, accent: '#8B5CF6' },
  ],
  monthly: [
    { label: '사용 인증', value: 46, accent: '#3DDB6D' },
    { label: '반납 인증', value: 38, accent: '#1565C0' },
    { label: '조기반납', value: 18, accent: '#F59E0B' },
    { label: '직관 카드', value: 11, accent: '#8B5CF6' },
  ],
  season: [
    { label: '사용 인증', value: 138, accent: '#3DDB6D' },
    { label: '반납 인증', value: 121, accent: '#1565C0' },
    { label: '조기반납', value: 64, accent: '#F59E0B' },
    { label: '직관 카드', value: 38, accent: '#8B5CF6' },
  ],
};

const COUNTDOWN_REFERENCE_TIME = new Date('2026-05-10T12:00:00+09:00').getTime();

function normalizeTeam(team: string | null | undefined) {
  return (team ?? '').split(' ')[0];
}

function getLeaguePoints(entry: LeagueEntry, periodTab: PeriodTab) {
  if (periodTab === 'weekly') return entry.weekly;
  if (periodTab === 'monthly') return entry.monthly;
  return entry.season;
}

function getMovement(delta: number) {
  if (delta > 0) {
    return {
      icon: <ArrowUpRight size={12} color="#13923F" />,
      label: `+${delta}`,
      tone: '#E8F8EE',
      color: '#13923F',
    };
  }
  if (delta < 0) {
    return {
      icon: <ArrowDownRight size={12} color="#D14343" />,
      label: `${delta}`,
      tone: '#FFF1F1',
      color: '#D14343',
    };
  }
  return {
    icon: <Minus size={12} color="#6B7280" />,
    label: '0',
    tone: '#F3F4F6',
    color: '#6B7280',
  };
}

export function RankingScreen() {
  const { points, selectedTeam } = useApp();
  const { navigate } = useNavigation();
  const [periodTab, setPeriodTab] = useState<PeriodTab>('season');

  const supportTeam = selectedTeam ?? 'LG 트윈스';
  const rankingList = useMemo(
    () => [...LEAGUE_RANKING].sort((a, b) => getLeaguePoints(b, periodTab) - getLeaguePoints(a, periodTab)),
    [periodTab],
  );
  const supportTeamEntry =
    rankingList.find((entry) => normalizeTeam(entry.team) === normalizeTeam(supportTeam)) ?? rankingList[0];
  const supportRank = rankingList.findIndex((entry) => entry.team === supportTeamEntry.team) + 1;

  const overallRank = Math.max(187, 2410 - points);
  const teamRank = Math.max(12, 310 - Math.round(points / 3));
  const topGap = getLeaguePoints(rankingList[0], periodTab) - getLeaguePoints(supportTeamEntry, periodTab);

  const rewardDeadline = new Date('2026-10-03T18:00:00+09:00').getTime();
  const now = COUNTDOWN_REFERENCE_TIME;
  const remainingMs = Math.max(0, rewardDeadline - now);
  const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const remainingHours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24);
  const remainingMinutes = Math.floor((remainingMs / (1000 * 60)) % 60);

  const contributionSeries = CONTRIBUTION_DATA[periodTab];
  const contributionMax = Math.max(...contributionSeries.map((item) => item.value));
  const contributionTotal = contributionSeries.reduce((sum, item) => sum + item.value, 0);

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
                <span style={{ fontSize: 10, fontWeight: 700, color: '#F8FAFC' }}>2026 정규시즌</span>
              </div>
              <p style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.22, marginBottom: 4 }}>KBO 환경 리그</p>
              <p style={{ fontSize: 11, lineHeight: 1.5, color: 'rgba(255,255,255,0.78)' }}>
                구단별 친환경 실천 포인트와 내 응원팀의 시즌 흐름을 한 화면에서 확인합니다.
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
              <TeamBadge teamName={supportTeamEntry.team} size={42} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#D1FAE5', textAlign: 'center' }}>응원팀 고정</span>
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
              <p style={{ fontSize: 20, fontWeight: 800, marginBottom: 3 }}>#{supportRank}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.78)' }}>
                1위와 {Math.max(0, topGap).toLocaleString()}P 차이
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
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>내 시즌 포인트</p>
              <p style={{ fontSize: 20, fontWeight: 800, marginBottom: 3 }}>
                {points.toLocaleString()}
                <span style={{ fontSize: 11, marginLeft: 2 }}>P</span>
              </p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.78)' }}>내 응원팀 상위 {teamRank}위권</p>
            </div>
          </div>
        </section>

        <section
          style={{
            background: '#FFF7E8',
            borderRadius: 20,
            padding: '16px',
            border: '1px solid #FDE1A6',
            boxShadow: '0 2px 10px rgba(245,158,11,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: '#FFF1C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock3 size={18} color="#B45309" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>시즌 리워드 오픈 카운트다운</p>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#9A6700',
                    background: '#FFF4D6',
                    borderRadius: 999,
                    padding: '4px 9px',
                    border: '1px solid #FDE1A6',
                    flexShrink: 0,
                  }}
                >
                  D-{remainingDays}
                </span>
              </div>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#B45309', marginBottom: 5 }}>
                {remainingDays}일 {remainingHours}시간 {remainingMinutes}분
              </p>
              <p style={{ fontSize: 11, lineHeight: 1.5, color: '#7C5A13' }}>
                시즌 종료 후 포인트 구간별 보상이 열립니다. 응원팀 순위와 개인 포인트를 함께 반영해 리워드 우선권이 결정됩니다.
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 3 }}>개인 랭킹</p>
              <p style={{ fontSize: 10, color: '#6B7280' }}>내 응원팀 고정 표시 및 전체 리그 기준</p>
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
              내 기록 보기
              <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <div
              style={{
                borderRadius: 16,
                padding: '12px',
                background: '#F7FAF8',
                border: '1px solid #E5F2E9',
              }}
            >
              <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 5 }}>응원팀 내 순위</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 2 }}>#{teamRank}</p>
              <p style={{ fontSize: 10, color: '#13923F' }}>상위 18% 진입</p>
            </div>
            <div
              style={{
                borderRadius: 16,
                padding: '12px',
                background: '#F5F8FF',
                border: '1px solid #DCE7FF',
              }}
            >
              <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 5 }}>전체 리그 순위</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 2 }}>#{overallRank}</p>
              <p style={{ fontSize: 10, color: '#1565C0' }}>전주 대비 146계단 상승</p>
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
              <p style={{ fontSize: 10, color: '#6B7280' }}>로고, 순위, 포인트, 전주 대비 이동</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {([
                { key: 'weekly', label: '주간' },
                { key: 'monthly', label: '월간' },
                { key: 'season', label: '시즌' },
              ] as { key: PeriodTab; label: string }[]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setPeriodTab(tab.key)}
                  style={{
                    borderRadius: 999,
                    padding: '8px 14px',
                    minHeight: 44,
                    minWidth: 44,
                    border: periodTab === tab.key ? '1px solid #3DDB6D' : '1px solid #E5E7EB',
                    background: periodTab === tab.key ? '#E8F8EE' : '#fff',
                    color: periodTab === tab.key ? '#13923F' : '#6B7280',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rankingList.map((entry, index) => {
              const isSupportTeam = normalizeTeam(entry.team) === normalizeTeam(supportTeam);
              const movement = getMovement(entry.delta);
              return (
                <div
                  key={entry.team}
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
                  <TeamBadge teamName={entry.team} size={34} />
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
                        {entry.team}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: '#6B7280' }}>주간 변동</span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '3px 7px',
                          borderRadius: 999,
                          background: movement.tone,
                          color: movement.color,
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {movement.icon}
                        {movement.label}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 3 }}>
                      {getLeaguePoints(entry, periodTab).toLocaleString()}P
                    </p>
                    <p style={{ fontSize: 10, color: '#6B7280' }}>구단 누적 친환경 포인트</p>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 3 }}>기여 그래프</p>
              <p style={{ fontSize: 10, color: '#6B7280' }}>주간 · 월간 · 시즌 누적 행동 분포</p>
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
              <span style={{ fontSize: 10, fontWeight: 700, color: '#1565C0' }}>{contributionTotal}회</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, alignItems: 'end', minHeight: 152 }}>
            {contributionSeries.map((item) => (
              <div key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#111827' }}>{item.value}</span>
                <div
                  style={{
                    width: '100%',
                    height: 92,
                    borderRadius: 14,
                    background: '#F4F6F8',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    padding: 6,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 28,
                      height: `${Math.max(18, (item.value / contributionMax) * 80)}px`,
                      borderRadius: 12,
                      background: `linear-gradient(180deg, ${item.accent}, ${item.accent}CC)`,
                      boxShadow: `0 8px 18px ${item.accent}30`,
                    }}
                  />
                </div>
                <span style={{ fontSize: 10, color: '#6B7280', textAlign: 'center', lineHeight: 1.3 }}>{item.label}</span>
              </div>
            ))}
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
                desc: '개인 포인트 상위 1% 추첨 대상',
                status: `${overallRank}위 진행 중`,
                tone: '#F5F8FF',
                border: '#DCE7FF',
              },
              {
                icon: <Gift size={16} color="#13923F" />,
                title: '에코 굿즈 세트',
                desc: '시즌 누적 1,500P 달성 시 자동 응모',
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
