import { useMemo, useState } from 'react';
import { useApp } from '../../AppContext';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gift,
  History,
  LogOut,
  Palette,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { useNavigation } from '../../navigation';
import { ECO_GRADE_META } from '../../ecoGrades';
import { TeamBadge } from '../TeamBadge';
import { getAvatarParts } from '../../avatar';
import { AvatarFigure } from '../AvatarFigure';
import { useAuthStore } from '@/store/authStore';
import { getKakaoLogoutUrl } from '@/lib/kakaoAuth';

function formatRate(value: number) {
  return value.toFixed(3).replace(/^0/, '');
}

export function AccountScreen() {
  const { navigate } = useNavigation();
  const {
    selectedTeam,
    ecoGrade,
    points,
    visits,
    certificationLogs,
    reusableUseCount,
    reusableReturnCount,
    ecoImpact,
    shareCardShared,
    setShareCardShared,
    avatarConfig,
  } = useApp();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [cardGenerated, setCardGenerated] = useState(certificationLogs.length > 0 || visits.some((visit) => visit.shareCardCreated));

  const gradeInfo = ECO_GRADE_META[ecoGrade] ?? ECO_GRADE_META['그린팬'];
  const recentVisit = useMemo(
    () => [...visits].sort((a, b) => b.date.localeCompare(a.date))[0],
    [visits],
  );

  const reusableGames = Math.max(visits.filter((visit) => visit.reusableUsed).length, reusableUseCount);
  const certificationCount = certificationLogs.length;
  const ecoAverage = Math.min(0.999, 0.21 + reusableUseCount * 0.045 + reusableReturnCount * 0.055 + points / 10000);
  const onBase = Math.min(0.999, ecoAverage + 0.071);
  const slugging = Math.min(1.299, ecoAverage + 0.214);
  const ops = onBase + slugging;

  const reductionContribution = Math.min(92, Math.round(points / 25 + reusableReturnCount * 8 + visits.length * 4));
  const reductionSaved = ecoImpact.wasteKg.toFixed(2);

  const calendarAnchor = recentVisit ? new Date(`${recentVisit.date}T09:00:00`) : new Date();
  const monthLabel = `${calendarAnchor.getMonth() + 1}월`;
  const monthStart = new Date(calendarAnchor.getFullYear(), calendarAnchor.getMonth(), 1);
  const monthLastDate = new Date(calendarAnchor.getFullYear(), calendarAnchor.getMonth() + 1, 0).getDate();
  const monthOffset = monthStart.getDay();
  const visitDays = new Set(
    visits
      .filter((visit) => {
        const visitDate = new Date(`${visit.date}T09:00:00`);
        return (
          visitDate.getFullYear() === calendarAnchor.getFullYear()
          && visitDate.getMonth() === calendarAnchor.getMonth()
        );
      })
      .map((visit) => Number(visit.date.slice(-2))),
  );
  const calendarCells = Array.from({ length: 35 }, (_, index) => {
    const day = index - monthOffset + 1;
    return day > 0 && day <= monthLastDate ? day : null;
  });

  const avatarParts = getAvatarParts(avatarConfig);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F2FBF5' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <StatusBar />
        <div style={{ display: 'flex', alignItems: 'center', padding: '2px 14px 10px', gap: 8 }}>
          <button
            onClick={() => navigate('home')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={22} color="#374151" />
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', flex: 1 }}>MY/마이</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 14px' }}>
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt={`${user.nickname} 프로필`}
              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #C0F5D3' }}
            />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E2FAE9', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#111827', marginBottom: 2 }}>
              {user?.nickname ?? '게스트'} 님
            </p>
            <p style={{ fontSize: 11, color: '#6B7280' }}>카카오 계정으로 로그인됨</p>
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
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
            background: 'linear-gradient(145deg, #102A4B 0%, #17416D 62%, #1E6B79 100%)',
            borderRadius: 22,
            padding: '16px',
            color: '#fff',
            boxShadow: '0 12px 28px rgba(16,42,75,0.16)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{ flexShrink: 0 }}>
              <TeamBadge teamName={selectedTeam} size={48} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>MY CLUBHOUSE</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 }}>환경 타격 대시보드</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.78)' }}>{selectedTeam || '응원팀 미선택'}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: 'rgba(61,219,109,0.18)',
                    border: '1px solid rgba(61,219,109,0.35)',
                    color: '#BBF7D0',
                  }}
                >
                  {gradeInfo.emoji} {ecoGrade}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#7CF0A2', marginBottom: 2 }}>
                {points.toLocaleString()}
              </p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>시즌 포인트</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {[
              { label: '타율', value: formatRate(ecoAverage) },
              { label: '출루율', value: formatRate(onBase) },
              { label: '장타율', value: formatRate(slugging) },
              { label: 'OPS', value: ops.toFixed(3) },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: '10px 8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.72)', marginBottom: 5 }}>{stat.label}</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{stat.value}</p>
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
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 3 }}>서울 감축 목표 기여도</p>
              <p style={{ fontSize: 10, color: '#6B7280' }}>야구장 일회용품 저감 시즌 목표 기준</p>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 10px',
                borderRadius: 999,
                background: '#E8F8EE',
                border: '1px solid #C8F2D6',
                color: '#13923F',
                fontSize: 11,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              <Target size={14} />
              {reductionContribution}%
            </div>
          </div>

          <div style={{ height: 10, background: '#EEF2F4', borderRadius: 999, overflow: 'hidden', marginBottom: 10 }}>
            <div
              style={{
                width: `${reductionContribution}%`,
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(90deg, #3DDB6D, #1AB852)',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {[
              { label: '다회용기 사용', value: `${reusableGames}경기` },
              { label: '예상 절감량', value: `${reductionSaved}kg` },
              { label: '시즌 인증', value: `${certificationCount}건` },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  borderRadius: 16,
                  padding: '11px 10px',
                  background: '#F7FAF8',
                  border: '1px solid #E5F2E9',
                }}
              >
                <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 5 }}>{item.label}</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{item.value}</p>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 92,
                height: 112,
                borderRadius: 18,
                background: avatarParts.backdrop.background,
                border: '1px solid #D9EFE2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AvatarFigure config={avatarConfig} size={76} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <Palette size={15} color="#13923F" />
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>내 야구 아바타</p>
              </div>
              <p style={{ fontSize: 10, color: '#6B7280', lineHeight: 1.5, marginBottom: 10 }}>
                {avatarParts.cap.label} · {avatarParts.jersey.label} 유니폼 · {avatarParts.pose.label} · {avatarParts.backdrop.label}
              </p>
              <button
                type="button"
                onClick={() => navigate('avatar')}
                style={{
                  border: '1.5px solid #C8F2D6',
                  background: '#F0FFF6',
                  color: '#13923F',
                  borderRadius: 12,
                  padding: '9px 12px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                꾸미기
                <ChevronRight size={14} />
              </button>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 3 }}>직관 캘린더</p>
              <p style={{ fontSize: 10, color: '#6B7280' }}>최근 방문 경기와 인증 기록</p>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                borderRadius: 999,
                background: '#F5F8FF',
                border: '1px solid #DCE7FF',
                padding: '6px 10px',
                color: '#1565C0',
                fontSize: 11,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              <CalendarDays size={14} />
              {monthLabel}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, marginBottom: 10 }}>
            {['일', '월', '화', '수', '목', '금', '토'].map((label) => (
              <div key={label} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#9CA3AF' }}>
                {label}
              </div>
            ))}
            {calendarCells.map((day, index) => {
              const isVisitDay = day !== null && visitDays.has(day);
              return (
                <div
                  key={`${day ?? 'empty'}-${index}`}
                  style={{
                    aspectRatio: '1 / 1',
                    borderRadius: 12,
                    border: isVisitDay ? '1.5px solid #3DDB6D' : '1px solid #EEF1F4',
                    background: isVisitDay ? '#E8F8EE' : '#F9FAFB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: isVisitDay ? 800 : 600,
                    color: day ? '#111827' : 'transparent',
                    position: 'relative',
                  }}
                >
                  {day ?? '.'}
                  {isVisitDay && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: '#13923F',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {recentVisit && (
            <div
              style={{
                borderRadius: 16,
                padding: '12px',
                background: '#F7FAF8',
                border: '1px solid #E5F2E9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
                  최근 직관 {recentVisit.date}
                </p>
                <p style={{ fontSize: 10, color: '#6B7280', lineHeight: 1.45 }}>
                  {recentVisit.game.home} vs {recentVisit.game.away} · {recentVisit.seat.section} · {recentVisit.result}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#13923F' }}>{recentVisit.reusableUsed ? '다회용기 사용' : '기록만 저장'}</p>
                <p style={{ fontSize: 10, color: '#6B7280' }}>{reusableReturnCount > 0 ? '반납 인증 완료' : '다음 경기 리마인드'}</p>
              </div>
            </div>
          )}
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
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 3 }}>오늘 직관 카드</p>
              <p style={{ fontSize: 10, color: '#6B7280' }}>생성 후 바로 공유 가능한 관람 카드</p>
            </div>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                background: '#F2FBF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={16} color="#13923F" />
            </div>
          </div>

          <div
            style={{
              borderRadius: 18,
              padding: '14px',
              background: 'linear-gradient(145deg, #1B5E20 0%, #2F855A 100%)',
              color: '#fff',
              marginBottom: 10,
            }}
          >
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.76)', marginBottom: 5 }}>TODAY VIEWING CARD</p>
            <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
              {cardGenerated ? '직관 카드 생성 완료' : '오늘 경기 카드 대기 중'}
            </p>
            <p style={{ fontSize: 11, lineHeight: 1.5, color: 'rgba(255,255,255,0.82)' }}>
              {cardGenerated
                ? `최근 직관 기록과 친환경 지표가 카드에 반영되었습니다. ${shareCardShared ? '공유 완료 상태입니다.' : '지금 바로 공유할 수 있습니다.'}`
                : '최근 직관 기록과 다회용기 인증을 기반으로 카드 생성을 시작할 수 있습니다.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <button
              onClick={() => setCardGenerated(true)}
              style={{
                padding: '12px 10px',
                borderRadius: 14,
                border: '1.5px solid #C8F2D6',
                background: '#F0FFF6',
                color: '#13923F',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              카드 만들기
            </button>
            <button
              onClick={() => {
                if (cardGenerated) setShareCardShared(true);
              }}
              disabled={!cardGenerated}
              style={{
                padding: '12px 10px',
                borderRadius: 14,
                border: 'none',
                background: cardGenerated ? 'linear-gradient(135deg, #3DDB6D, #1AB852)' : '#D1D5DB',
                color: '#fff',
                fontSize: 12,
                fontWeight: 800,
                cursor: cardGenerated ? 'pointer' : 'default',
                opacity: cardGenerated ? 1 : 0.8,
              }}
            >
              카드 공유하기
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 3 }}>바로가기</p>
              <p style={{ fontSize: 10, color: '#6B7280' }}>포인트 내역과 굿즈 교환 프로그램</p>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                borderRadius: 999,
                background: '#FFF7E8',
                border: '1px solid #FDE1A6',
                padding: '6px 10px',
                color: '#B45309',
                fontSize: 11,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              <Trophy size={14} />
              시즌 혜택
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              {
                icon: <History size={16} color="#1565C0" />,
                title: '포인트 내역',
                desc: '직관 · 인증 · 리워드 적립 흐름 확인',
                action: () => navigate('record'),
              },
              {
                icon: <Gift size={16} color="#13923F" />,
                title: '굿즈 교환',
                desc: '에코 굿즈와 교환 프로그램 바로 이동',
                action: () => navigate('programs'),
              },
            ].map((item) => (
              <button
                key={item.title}
                onClick={item.action}
                style={{
                  width: '100%',
                  borderRadius: 16,
                  border: '1px solid #EEF1F4',
                  background: '#F9FAFB',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
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
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#111827', marginBottom: 4 }}>{item.title}</p>
                  <p style={{ fontSize: 10, color: '#6B7280', lineHeight: 1.45 }}>{item.desc}</p>
                </div>
                <ChevronRight size={16} color="#9CA3AF" />
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={() => {
            logout();
            window.location.href = getKakaoLogoutUrl();
          }}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: 16,
            background: '#FFF3F3',
            border: '1.5px solid #FCA5A5',
            cursor: 'pointer',
            color: '#E53E3E',
            fontSize: 14,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
