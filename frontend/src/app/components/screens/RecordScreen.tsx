import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useApp } from '../../AppContext';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import { Share2, ChevronLeft, ChevronRight, ImagePlus, Download, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/store/authStore';
import { getKakaoLogoutUrl } from '@/lib/kakaoAuth';
import { KBO_TEAMS } from '../../teamBrand';
import { TeamBadge } from '../TeamBadge';

type SubTab = 'dashboard' | 'calendar' | 'share' | 'settings';

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const SHARE_CARD_DATE = '2026.04.21';

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

interface ShareImageInput {
  format: 'story' | 'feed';
  backgroundUrl: string | null;
  visitCount: number;
  containerCount: number;
  todaySeatCertified: boolean;
  matchName: string;
  score: string;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height);
  const imageWidth = image.width * scale;
  const imageHeight = image.height * scale;
  const x = (width - imageWidth) / 2;
  const y = (height - imageHeight) / 2;
  ctx.drawImage(image, x, y, imageWidth, imageHeight);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: { font: string; color: string; align?: CanvasTextAlign; lineHeight?: number }
) {
  ctx.font = options.font;
  ctx.fillStyle = options.color;
  ctx.textAlign = options.align ?? 'left';
  ctx.textBaseline = 'top';
  const lineHeight = options.lineHeight ?? 1.35;
  const fontSize = Number(options.font.match(/(\d+)px/)?.[1] ?? 16);
  text.split('\n').forEach((line, index) => {
    ctx.fillText(line, x, y + index * fontSize * lineHeight);
  });
}

async function createInstagramReadyImage(input: ShareImageInput) {
  await document.fonts?.ready;

  const width = 1080;
  const height = input.format === 'story' ? 1920 : 1080;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');

  if (input.backgroundUrl) {
    const image = await loadImage(input.backgroundUrl);
    drawCoverImage(ctx, image, width, height);
  } else {
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#430A21');
    bg.addColorStop(0.55, '#5E1530');
    bg.addColorStop(1, '#C85C77');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  }

  const shade = ctx.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, 'rgba(6, 18, 12, 0.25)');
  shade.addColorStop(0.45, 'rgba(6, 18, 12, 0.35)');
  shade.addColorStop(1, 'rgba(6, 18, 12, 0.82)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);

  const padding = input.format === 'story' ? 92 : 72;
  const top = input.format === 'story' ? 160 : 92;
  const bottom = height - (input.format === 'story' ? 360 : 300);

  ctx.fillStyle = 'rgba(200, 92, 119, 0.24)';
  ctx.strokeStyle = 'rgba(200, 92, 119, 0.5)';
  ctx.lineWidth = 2;
  ctx.roundRect(padding, top, 370, 72, 24);
  ctx.fill();
  ctx.stroke();

  drawText(ctx, '용기낼깡', padding + 32, top + 19, {
    font: '800 30px "Noto Sans KR", sans-serif',
    color: '#BFFBD1',
  });
  drawText(ctx, `${SHARE_CARD_DATE} 잠실 야구장`, padding, top + 118, {
    font: '600 30px "Noto Sans KR", sans-serif',
    color: 'rgba(255,255,255,0.78)',
  });
  drawText(ctx, `오늘 잠실 직관\n${input.visitCount}번째`, padding, top + 170, {
    font: '900 72px "Noto Sans KR", sans-serif',
    color: '#FFFFFF',
    lineHeight: 1.25,
  });

  ctx.textAlign = 'center';
  drawText(ctx, input.matchName, width / 2, bottom - 120, {
    font: '700 34px "Noto Sans KR", sans-serif',
    color: 'rgba(255,255,255,0.76)',
    align: 'center',
  });
  drawText(ctx, input.score, width / 2, bottom - 70, {
    font: '900 96px "Noto Sans KR", sans-serif',
    color: '#FFFFFF',
    align: 'center',
  });
  drawText(ctx, '승리!', width / 2, bottom + 50, {
    font: '800 38px "Noto Sans KR", sans-serif',
    color: '#BFFBD1',
    align: 'center',
  });

  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 2;
  ctx.roundRect(padding, height - (input.format === 'story' ? 260 : 210), width - padding * 2, 132, 28);
  ctx.fill();
  ctx.stroke();

  drawText(ctx, '오늘의 환경 행동', padding + 34, height - (input.format === 'story' ? 232 : 182), {
    font: '700 28px "Noto Sans KR", sans-serif',
    color: 'rgba(255,255,255,0.78)',
  });
  drawText(
    ctx,
    `${input.todaySeatCertified ? '반납 인증 완료' : '반납 인증 전'} · 줄인 용기 ${input.containerCount}개`,
    padding + 34,
    height - (input.format === 'story' ? 182 : 132),
    {
      font: '800 34px "Noto Sans KR", sans-serif',
      color: '#FFFFFF',
    }
  );
  drawText(ctx, '#용기낼깡 #클린야구', width / 2, height - 78, {
    font: '700 26px "Noto Sans KR", sans-serif',
    color: 'rgba(255,255,255,0.64)',
    align: 'center',
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Image export failed.'));
    }, 'image/png');
  });

  return new File([blob], `yonggi-naelkkang-${input.format}.png`, { type: 'image/png' });
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RecordScreen() {
  const {
    selectedGame,
    visits, ecoImpact, certificationLogs,
    reusableUseCount, reusableReturnCount, todayMission,
    shareCardShared, setShareCardShared,
    selectedTeam, setSelectedTeam,
  } = useApp();
  const logout = useAuthStore((s) => s.logout);
  const setTeam = useAuthStore((s) => s.setTeam);

  const handleLogout = () => {
    logout();
    window.location.href = getKakaoLogoutUrl();
  };

  const handleSelectTeam = (teamName: string) => {
    setSelectedTeam(teamName);
    setTeam(teamName);
  };

  const [subTab, setSubTab] = useState<SubTab>('dashboard');
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(3); // April (0-indexed)
  const [selectedDate, setSelectedDate] = useState<string | null>('2026-04-21');
  const [shareFormat, setShareFormat] = useState<'story' | 'feed'>('story');
  const [sharePhoto, setSharePhoto] = useState<{ file: File; url: string } | null>(null);
  const [shareToast, setShareToast] = useState<{ title: string; body: string; icon: 'success' | 'info' | 'error' } | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const sharePhotoInputRef = useRef<HTMLInputElement | null>(null);

  const { firstDay, daysInMonth } = getCalendarDays(currentYear, currentMonth);

  const visitMap = Object.fromEntries(visits.map((v) => [v.date, v]));

  const selectedVisit = selectedDate ? visitMap[selectedDate] : null;

  const totalVisits = visits.length;
  const contributionDisplay = ecoImpact.seoulContributionPct < 0.01
    ? ecoImpact.seoulContributionPct.toFixed(4)
    : ecoImpact.seoulContributionPct.toFixed(3);

  useEffect(() => () => {
    if (sharePhoto) URL.revokeObjectURL(sharePhoto.url);
  }, [sharePhoto]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const handleSharePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSharePhoto((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return { file, url: URL.createObjectURL(file) };
    });
    event.target.value = '';
  };

  const handleClearSharePhoto = () => {
    setSharePhoto((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const handleShareCard = async () => {
    setIsSharing(true);

    try {
      const matchName = selectedGame ? `${selectedGame.home} vs ${selectedGame.away}` : 'LG vs 두산';
      const score = selectedGame?.score ?? '5 : 3';
      const file = await createInstagramReadyImage({
        format: shareFormat,
        backgroundUrl: sharePhoto?.url ?? null,
        visitCount: visits.length,
        containerCount: ecoImpact.containers,
        todaySeatCertified: todayMission.returnDone,
        matchName,
        score,
      });
      const shareData: ShareData = {
        files: [file],
        title: '용기낼깡 직관 카드',
        text: `오늘 잠실 직관 ${visits.length}번째 · 줄인 용기 ${ecoImpact.containers}개 · #용기낼깡 #클린야구`,
      };
      const canUseNativeShare = typeof navigator.share === 'function'
        && (!navigator.canShare || navigator.canShare(shareData));

      if (canUseNativeShare) {
        await navigator.share(shareData);
        setShareToast({
          title: '공유 시트를 열었습니다',
          body: 'Instagram을 선택한 뒤 스토리 또는 피드로 업로드해주세요.',
          icon: 'success',
        });
      } else {
        downloadFile(file);
        setShareToast({
          title: '이미지를 저장했습니다',
          body: '저장된 PNG를 Instagram 앱에서 스토리 또는 피드로 선택해주세요.',
          icon: 'info',
        });
      }

      if (!shareCardShared) {
        setShareCardShared(true);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setShareToast({
          title: '공유를 취소했습니다',
          body: '다시 누르면 공유 시트를 열 수 있습니다.',
          icon: 'info',
        });
      } else {
        setShareToast({
          title: '공유 이미지 생성 실패',
          body: '사진 파일을 바꾸거나 브라우저 권한을 확인한 뒤 다시 시도해주세요.',
          icon: 'error',
        });
      }
    } finally {
      setIsSharing(false);
      setTimeout(() => setShareToast(null), 2600);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <StatusBar />
      <div style={{
        flexShrink: 0,
        display: 'flex',
        gap: 6,
        padding: '6px 12px 10px',
        background: 'transparent',
      }}>
        {([
          { key: 'dashboard', label: '감축 기여' },
          { key: 'calendar', label: '직관 달력' },
          { key: 'share', label: '직관 카드' },
          { key: 'settings', label: '설정' },
        ] as { key: SubTab; label: string }[]).map((tab) => {
          const active = subTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key)}
              style={{
                flex: 1,
                minHeight: 38,
                padding: '8px 6px',
                border: '2px solid #430A21',
                borderRadius: 'var(--cb-radius-md)',
                background: active
                  ? 'linear-gradient(180deg, #F2A2AD 0%, #DD7386 100%)'
                  : 'var(--cb-surface)',
                color: active ? '#fff' : '#430A21',
                fontSize: 12,
                fontWeight: active ? 900 : 700,
                cursor: 'pointer',
                boxShadow: active ? '0 3px 0 0 #430A21' : '0 2px 0 0 #430A21',
                transform: active ? 'translateY(-1px)' : 'none',
                transition: 'transform 80ms ease, box-shadow 80ms ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {subTab === 'calendar' && (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflow: 'auto' }} className="hide-scroll">
            <div style={{
              background: 'var(--cb-primary)',
              borderRadius: 'var(--cb-radius-lg)',
              padding: '12px 16px',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '2px solid #430A21',
              boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.20)',
            }}>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>2026 시즌</p>
                <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>
                  {totalVisits}번째 직관 ⚾
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>줄인 용기</p>
                <p style={{ fontSize: 20, fontWeight: 700 }}>{ecoImpact.containers}개</p>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 'var(--cb-radius-lg)', padding: '16px', border: '2px solid #430A21', boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <button onClick={handlePrevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
                  <ChevronLeft size={18} color="#6B7280" />
                </button>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                  {currentYear}년 {MONTH_NAMES[currentMonth]}
                </p>
                <button onClick={handleNextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
                  <ChevronRight size={18} color="#6B7280" />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
                {DAYS.map((d, i) => (
                  <div key={d} style={{
                    textAlign: 'center', fontSize: 10, fontWeight: 600,
                    color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#9CA3AF',
                    paddingBottom: 4,
                  }}>
                    {d}
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0' }}>
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const visit = visitMap[dateStr];
                  const isSelected = selectedDate === dateStr;
                  const isToday = dateStr === '2026-04-21';
                  const dayOfWeek = (firstDay + i) % 7;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                        padding: '4px 2px',
                        borderRadius: 'var(--cb-radius-sm)',
                        background: isSelected ? 'var(--cb-primary-soft)' : 'transparent',
                        border: isSelected ? '1.5px solid var(--cb-primary)' : '1.5px solid transparent',
                        cursor: 'pointer', outline: 'none',
                      }}
                    >
                      <span style={{
                        fontSize: 13, fontWeight: isToday ? 700 : 400,
                        color: isSelected ? 'var(--cb-primary-deep)' : dayOfWeek === 0 ? '#EF4444' : dayOfWeek === 6 ? '#3B82F6' : '#374151',
                      }}>
                        {day}
                      </span>
                      {visit ? (
                        <span style={{ fontSize: 14 }}>⚾</span>
                      ) : isToday ? (
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--cb-primary)' }} />
                      ) : (
                        <div style={{ width: 4, height: 4 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedVisit && (
              <div style={{ background: '#fff', borderRadius: 'var(--cb-radius-lg)', padding: '16px', boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)', border: '2px solid #430A21' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 }}>
                      {selectedVisit.game.home} vs {selectedVisit.game.away}
                    </p>
                    <p style={{ fontSize: 11, color: '#6B7280' }}>
                      {selectedVisit.game.venue} · {selectedDate}
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 40, height: 40,
                      borderRadius: 'var(--cb-radius-md)',
                      fontSize: 22,
                      background: selectedVisit.result === '승' ? 'var(--cb-primary-soft)' : selectedVisit.result === '패' ? '#FFF3F3' : '#F9FAFB',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `2px solid ${selectedVisit.result === '승' ? 'var(--cb-primary-border)' : selectedVisit.result === '패' ? '#FCA5A5' : '#430A21'}`,
                      boxShadow: '0 2px 0 0 #430A21',
                    }}>
                      {selectedVisit.result === '승' ? '🏆' : selectedVisit.result === '패' ? '😢' : '🤝'}
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: selectedVisit.result === '승' ? 'var(--cb-primary-deep)' : selectedVisit.result === '패' ? '#E53E3E' : '#6B7280', marginTop: 3 }}>
                      {selectedVisit.result} {selectedVisit.score}
                    </p>
                  </div>
                </div>

                <div style={{ background: 'var(--cb-bg)', borderRadius: 'var(--cb-radius-md)', padding: '10px 12px', marginBottom: 10, border: '2px solid #430A21', boxShadow: '0 2px 0 0 #430A21' }}>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>좌석</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    {selectedVisit.seat.section} {selectedVisit.seat.seatNumber}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
                  {[
                    { label: '반납 인증', active: selectedVisit.seatCertified, emoji: '📸' },
                    { label: '다회용기', active: selectedVisit.reusableUsed, emoji: '♻️' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        flex: 1,
                        borderRadius: 'var(--cb-radius-md)',
                        padding: '8px 6px',
                        textAlign: 'center',
                        background: item.active ? 'var(--cb-primary-soft)' : '#F9FAFB',
                        border: `2px solid ${item.active ? 'var(--cb-primary-border)' : '#D1D5DB'}`,
                        boxShadow: item.active ? '0 2px 0 0 var(--cb-primary-border)' : '0 2px 0 0 #D1D5DB',
                      }}
                    >
                      <p style={{ fontSize: 14 }}>{item.emoji}</p>
                      <p style={{ fontSize: 10, color: item.active ? 'var(--cb-primary-deep)' : '#9CA3AF', fontWeight: item.active ? 600 : 400 }}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>

                {selectedVisit.memo ? (
                  <div style={{ background: '#FFF8E6', borderRadius: 'var(--cb-radius-md)', padding: '10px 12px', border: '2px solid #B07800', boxShadow: '0 2px 0 0 #B07800' }}>
                    <p style={{ fontSize: 11, color: '#B07800', marginBottom: 2 }}>메모</p>
                    <p style={{ fontSize: 12, color: '#374151' }}>{selectedVisit.memo}</p>
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>메모 없음</p>
                )}
              </div>
            )}

            {!selectedVisit && selectedDate && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>이 날의 직관 기록이 없습니다</p>
              </div>
            )}
          </div>
        )}

        {subTab === 'dashboard' && (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflow: 'auto' }} className="hide-scroll">
            <div style={{
              background: 'var(--cb-primary)',
              borderRadius: 'var(--cb-radius-lg)',
              padding: '18px',
              color: '#fff',
              border: '2px solid #430A21',
              boxShadow: '0 4px 0 0 #430A21, 0 6px 12px rgba(200, 92, 119, 0.30)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginBottom: 3 }}>서울 야구장 일회용품 감축</p>
                  <p style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>
                    {ecoImpact.wasteKg}<span style={{ fontSize: 16, marginLeft: 4 }}>kg</span>
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 4 }}>줄인 용기 {ecoImpact.containers}개</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginBottom: 3 }}>시즌 목표 기여도</p>
                  <p style={{ fontSize: 20, fontWeight: 900 }}>{contributionDisplay}%</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: '사용 인증', value: `${reusableUseCount}회` },
                  { label: '반납 인증', value: `${reusableReturnCount}회` },
                  { label: '탄소 절감', value: `${ecoImpact.carbonKg}kg` },
                ].map((item) => (
                  <div key={item.label} style={{
                    background: 'rgba(255,255,255,0.22)',
                    border: '2px solid rgba(255,255,255,0.32)',
                    borderRadius: 'var(--cb-radius-md)',
                    padding: '10px 6px',
                    textAlign: 'center',
                    boxShadow: '0 2px 0 0 rgba(67, 10, 33, 0.20)',
                  }}>
                    <p style={{ fontSize: 15, fontWeight: 900 }}>{item.value}</p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { title: '사용 인증', value: `${reusableUseCount}회`, sub: '다회용기 이용' },
                { title: '반납 인증', value: `${reusableReturnCount}회`, sub: '회수율 기여' },
              ].map((item) => (
                <div key={item.title} style={{
                  background: '#fff',
                  borderRadius: 'var(--cb-radius-lg)',
                  padding: 14,
                  border: '2px solid #430A21',
                  boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
                }}>
                  <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>{item.title}</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#111827' }}>{item.value}</p>
                  <p style={{ fontSize: 10, color: '#9CA3AF' }}>{item.sub}</p>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', borderRadius: 'var(--cb-radius-lg)', padding: 16, border: '2px solid #430A21', boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)' }}>
              <p style={{ fontSize: 13, fontWeight: 900, color: '#111827', marginBottom: 10 }}>최근 인증</p>
              {certificationLogs.slice(0, 4).map((log) => (
                <div key={log.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 0',
                  borderTop: '1px solid rgba(0,0,0,0.05)',
                }}>
                  <span style={{
                    width: 34,
                    height: 34,
                    borderRadius: 'var(--cb-radius-sm)',
                    background: log.type === 'return' ? '#EFF6FF' : 'var(--cb-primary-soft)',
                    color: log.type === 'return' ? '#2563EB' : 'var(--cb-primary-deep)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 900,
                    border: `1.5px solid ${log.type === 'return' ? '#2563EB' : 'var(--cb-primary-border)'}`,
                  }}>
                    {log.type === 'return' ? '반납' : '사용'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, color: '#111827', fontWeight: 800 }}>{log.label}</p>
                    <p style={{ fontSize: 10, color: '#9CA3AF' }}>{log.game} · {log.time}</p>
                  </div>
                  {log.bonus && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: '#B07800',
                      background: '#FFF8E6',
                      borderRadius: 'var(--cb-radius-full)',
                      padding: '3px 10px',
                      border: '1.5px solid #B07800',
                    }}>
                      조기 반납
                    </span>
                  )}
                </div>
              ))}
              {certificationLogs.length === 0 && (
                <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>
                  아직 인증 내역이 없습니다.
                </p>
              )}
            </div>
          </div>
        )}

        {subTab === 'share' && (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflow: 'auto' }} className="hide-scroll">
            <input
              ref={sharePhotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleSharePhotoChange}
              style={{ display: 'none' }}
            />
            <div style={{ background: '#fff', borderRadius: 'var(--cb-radius-lg)', padding: '14px 16px', boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)', border: '2px solid #430A21' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 3 }}>배경 사진</p>
                  <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>
                    스토리/피드 카드 배경으로 쓸 사진을 선택하거나 촬영하세요.
                  </p>
                </div>
                {sharePhoto && (
                  <button
                    type="button"
                    onClick={handleClearSharePhoto}
                    style={{ background: '#F3F4F6', border: '1.5px solid #D1D5DB', borderRadius: 'var(--cb-radius-full)', padding: '6px 12px', fontSize: 11, color: '#6B7280', cursor: 'pointer' }}
                  >
                    제거
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => sharePhotoInputRef.current?.click()}
                style={{
                  width: '100%', marginTop: 12, padding: '12px',
                  borderRadius: 'var(--cb-radius-md)',
                  border: '2px dashed var(--cb-primary-border)',
                  background: sharePhoto ? 'var(--cb-primary-soft)' : 'var(--cb-bg-soft)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  color: 'var(--cb-primary-deep)', fontSize: 13, fontWeight: 700,
                }}
              >
                <ImagePlus size={16} />
                {sharePhoto ? '다른 사진 선택 / 촬영' : '사진 선택 / 카메라 촬영'}
              </button>
              {sharePhoto && (
                <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>
                  {sharePhoto.file.name}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {(['story', 'feed'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setShareFormat(fmt)}
                  style={{
                    flex: 1, padding: '12px',
                    borderRadius: 'var(--cb-radius-md)',
                    border: shareFormat === fmt ? '2px solid var(--cb-primary)' : '2px solid #430A21',
                    background: shareFormat === fmt ? 'var(--cb-primary-soft)' : '#fff',
                    cursor: 'pointer', outline: 'none',
                    fontSize: 13, fontWeight: shareFormat === fmt ? 700 : 500,
                    color: shareFormat === fmt ? 'var(--cb-primary-deep)' : '#6B7280',
                    boxShadow: shareFormat === fmt
                      ? '0 3px 0 0 var(--cb-primary), 0 4px 6px rgba(200, 92, 119, 0.22)'
                      : '0 2px 0 0 #430A21',
                  }}
                >
                  {fmt === 'story' ? '스토리 (9:16)' : '피드 (1:1)'}
                </button>
              ))}
            </div>

            <div style={{
              borderRadius: 'var(--cb-radius-lg)',
              background: 'var(--cb-primary-soft)',
              padding: shareFormat === 'story' ? '10px 72px' : '10px 28px',
              border: '2px solid #430A21',
              boxShadow: '0 3px 0 0 #430A21',
            }}>
              <div style={{
                background: sharePhoto
                  ? `url(${sharePhoto.url})`
                  : 'var(--cb-primary-deep)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: 'var(--cb-radius-md)',
                padding: shareFormat === 'story' ? '26px 18px' : '20px',
                aspectRatio: shareFormat === 'story' ? '9/16' : '1/1',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                border: '2px solid #430A21',
                boxShadow: '0 3px 0 0 #430A21, 0 6px 12px rgba(0,0,0,0.18)',
                position: 'relative', overflow: 'hidden',
                width: '100%',
              }}>
                <div style={{
                  position: 'absolute', top: -30, right: -30, width: 120, height: 120,
                  borderRadius: '50%', background: 'rgba(200, 92, 119, 0.15)',
                }} />
                <div style={{
                  position: 'absolute', bottom: 20, left: -20, width: 80, height: 80,
                  borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                }} />

                <div style={{ zIndex: 1 }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'rgba(200, 92, 119, 0.32)',
                    borderRadius: 'var(--cb-radius-full)',
                    padding: '5px 14px',
                    marginBottom: 12,
                    border: '1.5px solid rgba(200, 92, 119, 0.7)',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--cb-primary)', fontWeight: 700 }}>⚾ 용기낼깡</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>{SHARE_CARD_DATE} 잠실 야구장</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.3 }}>
                    오늘 잠실 직관<br />
                    <span style={{ color: 'var(--cb-primary)' }}>{visits.length}번째</span> 🏟️
                  </p>
                </div>

                <div style={{ zIndex: 1, textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                    {selectedGame ? `${selectedGame.home} vs ${selectedGame.away}` : 'LG vs 두산'}
                  </p>
                  <p style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>{selectedGame?.score ?? '5 : 3'}</p>
                  <p style={{ fontSize: 12, color: 'var(--cb-primary)', fontWeight: 600 }}>🏆 승리!</p>
                </div>

                <div style={{ zIndex: 1 }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.18)',
                    borderRadius: 'var(--cb-radius-md)',
                    padding: '10px 14px',
                    border: '2px solid rgba(255,255,255,0.30)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>오늘의 환경 행동</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 10px',
                        borderRadius: 'var(--cb-radius-full)',
                        background: 'rgba(200, 92, 119, 0.35)', color: 'var(--cb-primary)',
                        border: '1.5px solid rgba(200, 92, 119, 0.65)',
                      }}>
                        🌿 줄인 용기 {ecoImpact.containers}개
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#fff' }}>
                        사용 {reusableUseCount}회
                      </span>
                      <span style={{ fontSize: 11, color: todayMission.returnDone ? 'var(--cb-primary)' : 'rgba(255,255,255,0.5)' }}>
                        {todayMission.returnDone ? '반납 인증 완료' : '반납 인증 전'}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 8 }}>
                    다회용기로 직관, 일회용기 줄였음 • #용기낼깡 #클린야구
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleShareCard}
              disabled={isSharing}
              className="cb-button cb-button--primary cb-button--md cb-button--full"
            >
              {isSharing ? <Download size={16} /> : <Share2 size={16} />}
              {isSharing ? '공유 이미지 생성 중...' : '인스타그램 공유 준비'}
            </button>

            <p style={{ fontSize: 11, color: '#6B7280', textAlign: 'center', lineHeight: 1.6 }}>
              모바일에서는 공유 시트에서 Instagram을 선택하세요. 미지원 브라우저에서는 PNG 저장으로 대체됩니다.
            </p>

            <div style={{ background: '#fff', borderRadius: 'var(--cb-radius-lg)', padding: '14px 16px', border: '2px solid #430A21', boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>기본 문구 템플릿</p>
              {[
                `오늘 잠실 직관 ${visits.length}번째 · 다회용기로 줄인 용기 ${ecoImpact.containers}개`,
                `#용기낼깡 #클린야구 #서울감축기여 #KBO`,
              ].map((text, i) => (
                <div key={i} style={{
                  background: 'var(--cb-bg)',
                  borderRadius: 'var(--cb-radius-md)',
                  padding: '10px 12px', marginBottom: 6,
                  fontSize: 12, color: '#374151', lineHeight: 1.5,
                  border: '1.5px solid #E8DEDE',
                }}>
                  {text}
                </div>
              ))}
            </div>
          </div>
        )}

        {subTab === 'settings' && (
          <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'auto' }} className="hide-scroll">
            <div style={{
              background: '#fff',
              borderRadius: 'var(--cb-radius-lg)',
              padding: '14px 16px',
              border: '2px solid #430A21',
              boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cb-primary-deep)', letterSpacing: '0.04em' }}>응원팀</p>
                <p style={{ fontSize: 11, color: '#6B7280' }}>
                  현재: <strong style={{ color: '#430A21' }}>{selectedTeam ?? '미설정'}</strong>
                </p>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 8,
              }}>
                {KBO_TEAMS.map((team) => {
                  const isCurrent = selectedTeam === team.name;
                  return (
                    <button
                      key={team.code}
                      type="button"
                      onClick={() => handleSelectTeam(team.name)}
                      title={team.name}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        padding: '8px 4px',
                        background: isCurrent ? 'var(--cb-primary-soft)' : 'var(--cb-bg-soft)',
                        border: `2px solid ${isCurrent ? 'var(--cb-primary)' : '#430A21'}`,
                        borderRadius: 'var(--cb-radius-md)',
                        boxShadow: isCurrent ? '0 3px 0 0 var(--cb-primary-deep)' : '0 2px 0 0 #430A21',
                        cursor: 'pointer',
                        transform: isCurrent ? 'translateY(-1px)' : 'none',
                        transition: 'transform 80ms ease',
                      }}
                    >
                      <TeamBadge teamName={team.name} size={28} />
                      <span style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: isCurrent ? 'var(--cb-primary-deep)' : '#430A21',
                        lineHeight: 1,
                      }}>
                        {team.shortName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{
              background: '#fff',
              borderRadius: 'var(--cb-radius-lg)',
              padding: '14px 16px',
              border: '2px solid #430A21',
              boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cb-primary-deep)', letterSpacing: '0.04em' }}>계정</p>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '12px 14px',
                  background: '#FFF3F3',
                  border: '2px solid #430A21',
                  borderRadius: 'var(--cb-radius-md)',
                  boxShadow: '0 2px 0 0 #430A21',
                  color: '#E53E3E',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <span>로그아웃</span>
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />

      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            style={{
              position: 'absolute', bottom: 80, left: 20, right: 20, zIndex: 50,
              background: '#111827',
              borderRadius: 'var(--cb-radius-lg)',
              padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 10,
              border: '2px solid #430A21',
              boxShadow: '0 4px 0 0 #430A21, 0 6px 14px rgba(0,0,0,0.30)',
            }}
          >
            <span style={{ fontSize: 20 }}>
              {shareToast.icon === 'success' ? '✓' : shareToast.icon === 'error' ? '!' : 'i'}
            </span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{shareToast.title}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                {shareToast.body}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
