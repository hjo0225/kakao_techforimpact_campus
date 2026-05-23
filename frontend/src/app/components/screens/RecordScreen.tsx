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
import winMascot from '../../../assets/share-win.png';
import loseMascot from '../../../assets/share-lose.png';

type SubTab = 'dashboard' | 'calendar' | 'share' | 'settings';
type GameResult = 'win' | 'lose';

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MASCOT: Record<GameResult, string> = { win: winMascot, lose: loseMascot };

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

interface ShareImageInput {
  photoUrl: string | null; // 사용자가 찍은/올린 셀카 — 배경 cover
  result: GameResult;      // 승리/패배 — 합성할 마스코트 선택
  visitN: number;          // 이번 시즌 잠실 직관 N번째
  gameLabel: { home: string; away: string } | null; // 선택한 경기 (우상단)
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

// 1:1 (1080×1080) — 셀카가 배경 cover, 좌하단 마스코트, 우상단 경기 정보, 좌상단 시즌 카운터.
async function createInstagramReadyImage(input: ShareImageInput) {
  await document.fonts?.ready;

  const width = 1080;
  const height = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');

  // 배경 — 셀카 cover, 없으면 그라데이션
  if (input.photoUrl) {
    const photo = await loadImage(input.photoUrl);
    drawCoverImage(ctx, photo, width, height);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#430A21');
    bg.addColorStop(0.55, '#5E1530');
    bg.addColorStop(1, '#C85C77');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  }

  // 상단 텍스트 가독성용 그라데이션 (1:1 비율에서는 두께 축소)
  const topShade = ctx.createLinearGradient(0, 0, 0, 320);
  topShade.addColorStop(0, 'rgba(67, 10, 33, 0.62)');
  topShade.addColorStop(1, 'rgba(67, 10, 33, 0)');
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, width, 320);

  // 좌상단 — 시즌 카운터
  drawText(ctx, '이번 시즌 잠실 직관', 60, 70, {
    font: '800 34px "Galmuri11", "Noto Sans KR", sans-serif',
    color: '#FFFFFF',
    align: 'left',
  });
  drawText(ctx, `${input.visitN}번째`, 60, 122, {
    font: '900 84px "Galmuri11", "Noto Sans KR", sans-serif',
    color: '#FFFAE6',
    align: 'left',
  });

  // 우상단 — 경기 정보 카드 (선택된 경기가 있을 때만)
  if (input.gameLabel) {
    const boxRight = width - 60;
    const boxTop = 70;
    const boxWidth = 360;
    const boxHeight = 160;
    const boxLeft = boxRight - boxWidth;
    // 반투명 흰색 + burgundy border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillRect(boxLeft, boxTop, boxWidth, boxHeight);
    ctx.strokeStyle = '#430A21';
    ctx.lineWidth = 4;
    ctx.strokeRect(boxLeft, boxTop, boxWidth, boxHeight);

    drawText(ctx, input.gameLabel.home, boxLeft + boxWidth / 2, boxTop + 18, {
      font: '900 36px "Galmuri11", "Noto Sans KR", sans-serif',
      color: '#430A21',
      align: 'center',
    });
    drawText(ctx, 'vs', boxLeft + boxWidth / 2, boxTop + 64, {
      font: '700 24px "Galmuri11", "Noto Sans KR", sans-serif',
      color: '#C85C77',
      align: 'center',
    });
    drawText(ctx, input.gameLabel.away, boxLeft + boxWidth / 2, boxTop + 100, {
      font: '900 36px "Galmuri11", "Noto Sans KR", sans-serif',
      color: '#430A21',
      align: 'center',
    });
  }

  // 좌측 하단 — 마스코트
  const mascot = await loadImage(MASCOT[input.result]);
  const mascotHeight = height * 0.5;
  const mascotWidth = (mascot.width / mascot.height) * mascotHeight;
  ctx.drawImage(mascot, 36, height - mascotHeight - 36, mascotWidth, mascotHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Image export failed.'));
    }, 'image/png');
  });

  return new File([blob], `yonggi-naelkkang-jikgwan-${input.visitN}.png`, { type: 'image/png' });
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
    reusableUseCount, reusableReturnCount,
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
  const [gameResult, setGameResult] = useState<GameResult>('win');
  const [sharePhoto, setSharePhoto] = useState<{ file: File; url: string } | null>(null);
  const [shareFile, setShareFile] = useState<File | null>(null);
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

  // 이번 시즌(2026) 잠실 직관 N번째 — 직관 달력(attendance visits) 기준 + 오늘 선택분 포함
  const isJamsilSeasonVisit = (date?: string, venue?: string) =>
    !!date && date.startsWith('2026') && (venue ?? '').includes('잠실');
  const confirmedJamsil = visits.filter((v) => isJamsilSeasonVisit(v.date, v.game.venue)).length;
  const todayCountsAsNew =
    !!selectedGame &&
    isJamsilSeasonVisit(selectedGame.date, selectedGame.venue) &&
    !visits.some((v) => v.date === selectedGame.date);
  const visitN = Math.max(confirmedJamsil + (todayCountsAsNew ? 1 : 0), 1);

  useEffect(() => () => {
    if (sharePhoto) URL.revokeObjectURL(sharePhoto.url);
  }, [sharePhoto]);

  // 공유 이미지 입력 — 의존성 변경 시 재생성
  const gameLabel = selectedGame
    ? { home: selectedGame.home, away: selectedGame.away }
    : null;

  // 공유 이미지를 미리 생성해 둠 → 버튼 클릭 시 user-gesture 안에서 동기로 share() 호출 (모바일 공유/저장 안정화)
  useEffect(() => {
    let cancelled = false;
    createInstagramReadyImage({ photoUrl: sharePhoto?.url ?? null, result: gameResult, visitN, gameLabel })
      .then((file) => { if (!cancelled) setShareFile(file); })
      .catch(() => { if (!cancelled) setShareFile(null); });
    return () => { cancelled = true; };
  }, [sharePhoto, gameResult, visitN, gameLabel?.home, gameLabel?.away]);

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
    if (isSharing) return;
    setIsSharing(true);

    // 미리 생성된 파일이 없으면 클릭 시점에 동기 생성 (preflight 실패한 경우 폴백).
    // 가능하면 사전 생성된 shareFile을 우선 사용해야 모바일 user-gesture가 유지됨.
    let file = shareFile;
    if (!file) {
      try {
        file = await createInstagramReadyImage({ photoUrl: sharePhoto?.url ?? null, result: gameResult, visitN, gameLabel });
        setShareFile(file);
      } catch {
        setShareToast({
          title: '이미지 생성 실패',
          body: '사진을 바꾸거나 잠시 후 다시 시도해주세요.',
          icon: 'error',
        });
        setIsSharing(false);
        setTimeout(() => setShareToast(null), 2600);
        return;
      }
    }

    const shareData: ShareData = {
      files: [file],
      title: '용기낼깡 직관 카드',
      text: `이번 시즌 잠실 직관 ${visitN}번째 · #용기낼깡 #클린야구`,
    };

    try {
      // user-gesture 안에서 share()를 먼저 호출 (이미지는 미리 생성됨 → 모바일 activation 유지)
      if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        setShareToast({
          title: '공유 시트를 열었습니다',
          body: 'Instagram 또는 사진 앱을 선택해 저장/업로드하세요.',
          icon: 'success',
        });
      } else {
        // 미지원(주로 데스크톱/일부 브라우저) → 이미지를 새 탭에 띄워 길게 눌러 저장
        const url = URL.createObjectURL(file);
        const opened = window.open(url, '_blank');
        if (!opened) downloadFile(file);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        setShareToast({
          title: '이미지를 열었습니다',
          body: '이미지를 길게 눌러 사진에 저장한 뒤 인스타그램에 올려주세요.',
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
          title: '공유 실패',
          body: '사진을 바꾸거나 브라우저 권한을 확인한 뒤 다시 시도해주세요.',
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

            <p style={{ fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 1.6 }}>
              내 사진 위에 마스코트를 함께 세워 직관 인증샷을 만들어요.
            </p>

            {/* 미리보기 — 1:1, 셀카 배경 + 좌상 시즌 + 우상 경기 정보 + 좌하 마스코트 */}
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: 340,
              margin: '0 auto',
              aspectRatio: '1 / 1',
              flexShrink: 0,
              borderRadius: 'var(--cb-radius-lg)',
              overflow: 'hidden',
              border: '2px solid #430A21',
              boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
              background: sharePhoto
                ? `center / cover no-repeat url(${sharePhoto.url})`
                : 'linear-gradient(180deg, #430A21 0%, #5E1530 55%, #C85C77 100%)',
            }}>
              {/* 상단 가독성용 그라데이션 */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '30%',
                background: 'linear-gradient(180deg, rgba(67,10,33,0.55) 0%, rgba(67,10,33,0) 100%)',
                pointerEvents: 'none',
              }} />

              {/* 좌상 — 시즌 카운터 */}
              <div style={{
                position: 'absolute', top: 12, left: 14,
                textAlign: 'left',
              }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#fff', margin: 0, textShadow: '0 1px 3px rgba(0,0,0,0.45)' }}>
                  이번 시즌 잠실 직관
                </p>
                <p style={{ fontSize: 26, fontWeight: 900, color: '#FFFAE6', margin: '2px 0 0', textShadow: '0 2px 4px rgba(0,0,0,0.45)', lineHeight: 1 }}>
                  {visitN}번째
                </p>
              </div>

              {/* 우상 — 경기 정보 카드 */}
              {selectedGame && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'rgba(255,255,255,0.92)',
                  border: '2px solid #430A21',
                  borderRadius: 'var(--cb-radius-sm)',
                  padding: '6px 10px',
                  minWidth: 92,
                  textAlign: 'center',
                  boxShadow: '0 2px 0 0 #430A21',
                }}>
                  <p style={{ fontSize: 12, fontWeight: 900, color: '#430A21', margin: 0, lineHeight: 1.15 }}>
                    {selectedGame.home}
                  </p>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#C85C77', margin: '2px 0' }}>vs</p>
                  <p style={{ fontSize: 12, fontWeight: 900, color: '#430A21', margin: 0, lineHeight: 1.15 }}>
                    {selectedGame.away}
                  </p>
                </div>
              )}

              {/* 좌하 — 마스코트 */}
              <img
                src={MASCOT[gameResult]}
                alt={gameResult === 'win' ? '승리 마스코트' : '패배 마스코트'}
                style={{ position: 'absolute', left: 6, bottom: 6, height: '50%', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
              />

              {!sharePhoto && (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: '6%', textAlign: 'center', color: 'rgba(255,255,255,0.72)', fontSize: 11 }}>
                  사진을 추가하면 함께 합성됩니다
                </div>
              )}
            </div>

            {/* 승리 / 패배 토글 — 프레임 하단 버튼 */}
            <div style={{ display: 'flex', gap: 8 }}>
              {([['win', '🏆 승리'], ['lose', '😢 패배']] as [GameResult, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGameResult(key)}
                  style={{
                    flex: 1, padding: '12px',
                    borderRadius: 'var(--cb-radius-md)',
                    border: gameResult === key ? '2px solid var(--cb-primary)' : '2px solid #430A21',
                    background: gameResult === key ? 'var(--cb-primary-soft)' : '#fff',
                    cursor: 'pointer', outline: 'none',
                    fontSize: 14, fontWeight: gameResult === key ? 800 : 600,
                    color: gameResult === key ? 'var(--cb-primary-deep)' : '#6B7280',
                    boxShadow: gameResult === key
                      ? '0 3px 0 0 var(--cb-primary), 0 4px 6px rgba(200, 92, 119, 0.22)'
                      : '0 2px 0 0 #430A21',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 사진 선택 / 촬영 */}
            <button
              type="button"
              onClick={() => sharePhotoInputRef.current?.click()}
              style={{
                width: '100%', padding: '12px',
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
              <button
                type="button"
                onClick={handleClearSharePhoto}
                style={{ alignSelf: 'center', background: '#F3F4F6', border: '1.5px solid #D1D5DB', borderRadius: 'var(--cb-radius-full)', padding: '6px 14px', fontSize: 11, color: '#6B7280', cursor: 'pointer' }}
              >
                사진 제거
              </button>
            )}

            <button
              onClick={handleShareCard}
              disabled={isSharing}
              className="cb-button cb-button--primary cb-button--md cb-button--full"
            >
              {isSharing ? <Download size={16} /> : <Share2 size={16} />}
              {isSharing ? '공유 중...' : '공유하기'}
            </button>

            <p style={{ fontSize: 11, color: '#6B7280', textAlign: 'center', lineHeight: 1.6 }}>
              모바일은 공유 시트에서 인스타그램/사진을 선택하세요. 미지원 시 이미지가 새 탭에 열리며 길게 눌러 저장할 수 있어요.
            </p>
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
