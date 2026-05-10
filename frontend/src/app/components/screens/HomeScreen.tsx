import { type ReactNode, useState } from 'react';
import {
  Bell,
  Camera,
  ChevronRight,
  Clock,
  Map,
  Plus,
  RotateCcw,
  Share2,
  Trophy,
  UserCircle,
} from 'lucide-react';
import { useApp } from '../../AppContext';
import { ECO_GRADE_META } from '../../ecoGrades';
import { useNavigation, type Route } from '../../navigation';
import { TeamBadge } from '../TeamBadge';
import { BottomNav } from '../BottomNav';
import { useAuthStore } from '@/store/authStore';

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

const TEAM_PREVIEW = [
  { team: 'LG 트윈스', points: 12450, diff: '+2' },
  { team: '롯데 자이언츠', points: 11230, diff: '+1' },
  { team: 'KIA 타이거즈', points: 10870, diff: '-' },
];

function Card({ children, border = '#E5E7EB' }: { children: ReactNode; border?: string }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 18,
      padding: 14,
      border: `1.5px solid ${border}`,
      boxShadow: '0 2px 8px rgba(17,24,39,0.06)',
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
    <div style={{ height: 7, borderRadius: 999, background: '#E5E7EB', overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.min(value, 100)}%`,
          height: '100%',
          borderRadius: 999,
          background: 'linear-gradient(90deg, #3DDB6D, #13923F)',
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
        border: '1.5px solid rgba(0,0,0,0.07)',
        borderRadius: 16,
        padding: '12px 8px',
        minHeight: 94,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        textAlign: 'left',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      <span style={{
        width: 34,
        height: 34,
        borderRadius: 12,
        background: '#E2FAE9',
        color: '#13923F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
    setSelectedGame,
    points,
    seatInfo,
    setSeatInfo,
    ecoGrade,
    getNextGradeInfo,
    todayMission,
    certificationLogs,
    isTimesaleActive,
    ecoImpact,
  } = useApp();
  const user = useAuthStore((s) => s.user);
  const [seatNumberInput, setSeatNumberInput] = useState(seatInfo.seatNumber);

  const gradeColors = ECO_GRADE_META[ecoGrade] || ECO_GRADE_META['그린팬'];
  const nextGrade = getNextGradeInfo();
  const latestCert = certificationLogs[0];

  const missionItems = [
    { label: '사용 인증', done: todayMission.useDone },
    { label: '반납 인증', done: todayMission.returnDone },
    { label: '직관 카드', done: todayMission.shared },
  ];

  const go = (route: Route) => navigate(route);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F2FBF5' }}>
      <div style={{
        flexShrink: 0,
        background: selectedGame ? 'linear-gradient(135deg, #0F7038, #3DDB6D)' : '#fff',
        color: selectedGame ? '#fff' : '#111827',
        borderBottom: selectedGame ? 'none' : '1px solid rgba(0,0,0,0.07)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 'max(46px, env(safe-area-inset-top, 46px))',
          paddingLeft: 20,
          paddingRight: 16,
          paddingBottom: selectedGame ? 12 : 10,
        }}>
          <div>
            <p style={{
              fontSize: 12,
              fontWeight: 900,
              color: selectedGame ? 'rgba(255,255,255,0.78)' : '#3DDB6D',
              marginBottom: 3,
            }}>
              클린업 트리오
            </p>
            <p style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.25 }}>
              {selectedGame ? '오늘의 직관 미션' : '다회용기 직관을 준비하세요'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => go('account')}
            aria-label="계정 관리"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: 'none',
              background: selectedGame ? 'rgba(255,255,255,0.22)' : '#E2FAE9',
              color: selectedGame ? '#fff' : '#13923F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <UserCircle size={21} />
          </button>
        </div>

        {selectedGame && (
          <div style={{ padding: '0 20px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
              <div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', marginBottom: 3 }}>
                  {selectedGame.venue} · {selectedGame.inning}
                </p>
                <p style={{ fontSize: 20, fontWeight: 900 }}>
                  {selectedGame.home} vs {selectedGame.away}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>실시간</p>
                <p style={{ fontSize: 26, fontWeight: 900 }}>{selectedGame.score}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className="hide-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <Card border="#C0F5D3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={`${user.nickname} 프로필`}
                  style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <TeamBadge teamName={selectedTeam} size={38} />
              )}
              <div>
                <p style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>{user?.nickname ?? '게스트'} 님</p>
                <span style={{
                  display: 'inline-flex',
                  marginTop: 3,
                  fontSize: 11,
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: 7,
                  background: gradeColors.bg,
                  color: gradeColors.text,
                  border: `1px solid ${gradeColors.border}`,
                }}>
                  {ecoGrade}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: '#6B7280' }}>내 포인트</p>
              <p style={{ fontSize: 24, fontWeight: 900, color: '#111827' }}>
                {points.toLocaleString()}
                <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 2 }}>P</span>
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: '#6B7280' }}>다음 등급: {nextGrade.next}</span>
            <span style={{ fontSize: 10, color: '#13923F', fontWeight: 800 }}>
              {nextGrade.needed > 0 ? `${nextGrade.needed}P 남음` : '최고 등급'}
            </span>
          </div>
          <ProgressBar value={(nextGrade.current / nextGrade.max) * 100} />
        </Card>

        {!selectedGame && (
          <>
            <Card border="#FFE082">
              <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <Clock size={18} color="#B07800" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 900, color: '#B07800', marginBottom: 2 }}>
                    경기 선택 전에도 지도를 확인할 수 있어요
                  </p>
                  <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>
                    경기 전 다회용기 매장과 반납함 위치를 먼저 보고, 입장 후 좌석을 연결하세요.
                  </p>
                </div>
              </div>
            </Card>

            <button
              type="button"
              onClick={() => go('game-select')}
              style={{
                width: '100%',
                padding: 15,
                borderRadius: 18,
                background: 'linear-gradient(135deg, #3DDB6D, #1AB852)',
                border: 'none',
                color: '#fff',
                fontSize: 14,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 6px 16px rgba(61,219,109,0.30)',
              }}
            >
              <Plus size={17} />
              오늘 관람 경기 선택
            </button>
          </>
        )}

        {selectedGame && (
          <>
            <Card border={isTimesaleActive ? '#FCD34D' : '#C0F5D3'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>오늘의 미션</p>
                  <p style={{ fontSize: 17, fontWeight: 900, color: '#111827' }}>
                    {todayMission.completed}/{todayMission.total} 완료
                  </p>
                </div>
                <span style={{
                  alignSelf: 'flex-start',
                  borderRadius: 999,
                  padding: '5px 10px',
                  background: isTimesaleActive ? '#FFF8E6' : '#E2FAE9',
                  color: isTimesaleActive ? '#B07800' : '#13923F',
                  fontSize: 11,
                  fontWeight: 900,
                }}>
                  {isTimesaleActive ? '7~8회 2배 보너스' : '기본 50P'}
                </span>
              </div>
              <ProgressBar value={todayMission.percent} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginTop: 12 }}>
                {missionItems.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      borderRadius: 12,
                      padding: '9px 6px',
                      textAlign: 'center',
                      background: item.done ? '#E2FAE9' : '#F3F4F6',
                      border: `1px solid ${item.done ? '#C0F5D3' : '#E5E7EB'}`,
                    }}
                  >
                    <p style={{ fontSize: 16, fontWeight: 900, color: item.done ? '#13923F' : '#9CA3AF' }}>
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
                    <p style={{ fontSize: 13, color: '#B07800', fontWeight: 900 }}>조기반납 타임세일 진행 중</p>
                    <p style={{ fontSize: 11, color: '#6B7280' }}>8회 종료 전 반납 인증 시 100P를 받을 수 있습니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => go('map')}
                    style={{
                      border: 'none',
                      borderRadius: 10,
                      padding: '8px 10px',
                      background: '#B07800',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    반납함
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
                      minHeight: 42,
                      borderRadius: 12,
                      border: '1.5px solid #D1D5DB',
                      background: '#F8FFFA',
                      padding: '0 10px',
                      fontSize: 13,
                      color: seatInfo.section ? '#111827' : '#9CA3AF',
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
                      minHeight: 42,
                      borderRadius: 12,
                      border: '1.5px solid #D1D5DB',
                      background: '#F8FFFA',
                      padding: '0 10px',
                      fontSize: 13,
                      color: '#111827',
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
          <QuickAction icon={<Map size={18} />} label="지도" sub="매장·반납" onClick={() => go('map')} />
          <QuickAction icon={<Trophy size={18} />} label="리그" sub="팀 순위" onClick={() => go('ranking')} />
          <QuickAction icon={<Share2 size={18} />} label="카드" sub="공유" onClick={() => go('record')} />
        </div>

        <SectionTitle>팀 환경 리그 TOP 3</SectionTitle>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {TEAM_PREVIEW.map((item, index) => (
              <div key={item.team} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 20, fontSize: 13, fontWeight: 900, color: '#13923F' }}>{index + 1}</span>
                <TeamBadge teamName={item.team} size={28} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#111827' }}>{item.team}</span>
                <span style={{ fontSize: 11, color: '#6B7280' }}>{item.points.toLocaleString()}P</span>
                <span style={{
                  minWidth: 30,
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: 900,
                  color: item.diff === '-' ? '#9CA3AF' : '#13923F',
                  background: item.diff === '-' ? '#F3F4F6' : '#E2FAE9',
                  borderRadius: 999,
                  padding: '2px 6px',
                }}>
                  {item.diff}
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
                <div key={item.label} style={{ textAlign: 'center', background: '#F8FFFA', borderRadius: 12, padding: '10px 6px' }}>
                  <p style={{ fontSize: 16, fontWeight: 900, color: '#111827' }}>{item.value}</p>
                  <p style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{item.label}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSelectedGame(null)}
              style={{
                width: '100%',
                marginTop: 10,
                border: '1.5px solid #E5E7EB',
                borderRadius: 12,
                padding: 10,
                background: '#fff',
                color: '#6B7280',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
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
                  padding: '9px 10px',
                  background: '#F8FFFA',
                  borderRadius: 12,
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
              style={{
                width: '100%',
                marginTop: 10,
                border: 'none',
                borderRadius: 12,
                padding: 11,
                background: '#E2FAE9',
                color: '#13923F',
                fontSize: 12,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
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
