import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw, Download, Share2 } from 'lucide-react';
import { useApp } from '../../AppContext';
import { useAuthStore } from '../../../store/authStore';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import {
  createVisitCard,
  getVisitCards,
  shareUrlForToken,
} from '../../../lib/visitCardApi';
import winMascot from '../../../assets/share-win.png';
import loseMascot from '../../../assets/share-lose.png';

type GameResult = 'win' | 'lose';
const MASCOT: Record<GameResult, string> = { win: winMascot, lose: loseMascot };

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 'var(--cb-radius-lg)',
  padding: 16,
  border: '2px solid #430A21',
  boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
};

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
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: { font: string; color: string; align?: CanvasTextAlign },
) {
  ctx.font = options.font;
  ctx.fillStyle = options.color;
  ctx.textAlign = options.align ?? 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}

interface CardInput {
  photoUrl: string | null;
  result: GameResult;
  visitN: number;
  teamLabel: string | null;
}

// 기존 직관카드 프레임 (1080×1080) — 셀카 cover, 좌상단 시즌 카운터, 우상단 팀, 좌하단 마스코트
async function createCardImage(input: CardInput): Promise<File> {
  await document.fonts?.ready;
  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');

  if (input.photoUrl) {
    const photo = await loadImage(input.photoUrl);
    drawCoverImage(ctx, photo, size, size);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, size);
    bg.addColorStop(0, '#430A21');
    bg.addColorStop(0.55, '#5E1530');
    bg.addColorStop(1, '#C85C77');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
  }

  const topShade = ctx.createLinearGradient(0, 0, 0, 320);
  topShade.addColorStop(0, 'rgba(67, 10, 33, 0.62)');
  topShade.addColorStop(1, 'rgba(67, 10, 33, 0)');
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, size, 320);

  // 좌상단 — 시즌 카운터
  drawText(ctx, '이번 시즌 잠실 직관', 60, 70, {
    font: '800 34px "Pretendard Variable", "Noto Sans KR", sans-serif',
    color: '#FFFFFF',
  });
  drawText(ctx, `${input.visitN}번째`, 60, 118, {
    font: '900 84px "Pretendard Variable", "Noto Sans KR", sans-serif',
    color: '#FFFAE6',
  });

  // 우상단 — 응원팀 박스
  if (input.teamLabel) {
    const label = input.teamLabel;
    ctx.font = '900 32px "Pretendard Variable", "Noto Sans KR", sans-serif';
    const textWidth = ctx.measureText(label).width;
    const padX = 24;
    const boxWidth = textWidth + padX * 2;
    const boxHeight = 68;
    const boxRight = size - 60;
    const boxTop = 70;
    const boxLeft = boxRight - boxWidth;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillRect(boxLeft, boxTop, boxWidth, boxHeight);
    ctx.strokeStyle = '#430A21';
    ctx.lineWidth = 4;
    ctx.strokeRect(boxLeft, boxTop, boxWidth, boxHeight);
    drawText(ctx, label, boxLeft + boxWidth / 2, boxTop + 18, {
      font: '900 32px "Pretendard Variable", "Noto Sans KR", sans-serif',
      color: '#430A21',
      align: 'center',
    });
  }

  // 좌하단 — 마스코트
  const mascot = await loadImage(MASCOT[input.result]);
  const mascotHeight = size * 0.5;
  const mascotWidth = (mascot.width / mascot.height) * mascotHeight;
  ctx.drawImage(mascot, 36, size - mascotHeight - 36, mascotWidth, mascotHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((r) => (r ? resolve(r) : reject(new Error('export failed'))), 'image/png');
  });
  return new File([blob], `jikgwan-card-${input.visitN}.png`, { type: 'image/png' });
}

export function VisitCard() {
  const { selectedTeam } = useApp();
  const user = useAuthStore((s) => s.user);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [result, setResult] = useState<GameResult>('win');
  const [visitN, setVisitN] = useState(1);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const teamLabel = selectedTeam ?? user?.teamCode ?? null;

  // 시즌 직관 카드 수 → N번째
  useEffect(() => {
    getVisitCards()
      .then((cards) => setVisitN(cards.length + 1))
      .catch(() => {});
  }, []);

  // photo/result/visitN 변경 시 카드 재생성
  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    createCardImage({ photoUrl: photo?.url ?? null, result, visitN, teamLabel })
      .then((file) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(file);
        setCardFile(file);
        setCardUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return createdUrl;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // teamLabel은 photo/visitN와 함께 안정적이라 deps 최소화
  }, [photo, result, visitN, teamLabel]);

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url);
    };
  }, [photo]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto((cur) => {
        if (cur) URL.revokeObjectURL(cur.url);
        return { file, url: URL.createObjectURL(file) };
      });
    }
    e.target.value = '';
  };

  const handleDownload = () => {
    if (!cardUrl) return;
    const a = document.createElement('a');
    a.href = cardUrl;
    a.download = `직관카드_${visitN}.png`;
    a.click();
  };

  const handleSaveAndShare = async () => {
    if (!cardFile || busy) return;
    setBusy(true);
    try {
      const created = await createVisitCard(cardFile, { teamCode: user?.teamCode ?? undefined });
      const url = shareUrlForToken(created.shareToken);
      setVisitN((n) => n); // 유지
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: '직관카드', text: '오늘의 직관 인증!', url });
          showToast('공유했어요');
        } catch {
          showToast('저장 완료');
        }
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showToast('공유 링크를 복사했어요');
      } else {
        showToast('저장 완료');
      }
    } catch {
      showToast('저장에 실패했어요. 다시 시도해주세요');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      />
      <StatusBar centerLabel="직관카드" />

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
        <div style={cardStyle}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cb-primary-deep)' }}>직관카드</p>
          <p style={{ marginTop: 4, fontSize: 17, fontWeight: 800, color: '#0F172A', lineHeight: 1.35 }}>
            오늘의 직관 순간을 카드로
          </p>
          <p style={{ marginTop: 5, fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>
            사진을 올리면 시즌 직관 카드가 만들어져요. 저장하면 공유 링크가 생깁니다.
          </p>
        </div>

        {/* 카드 프리뷰 (생성된 1:1 카드) */}
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {cardUrl ? (
              <img src={cardUrl} alt="직관카드 미리보기" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>카드 생성 중...</div>
            )}
          </div>
        </div>

        {/* 승패 토글 */}
        <div style={cardStyle}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>오늘 경기 결과</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            {([['win', '🏆 승리'], ['lose', '😢 패배']] as [GameResult, string][]).map(([key, label]) => {
              const active = result === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setResult(key)}
                  aria-pressed={active}
                  style={{
                    borderRadius: 'var(--cb-radius-md)',
                    border: active ? '2px solid var(--cb-primary)' : '2px solid #430A21',
                    background: active ? 'var(--cb-primary-soft)' : '#fff',
                    color: active ? 'var(--cb-primary-deep)' : '#0F172A',
                    padding: '12px 0',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: active ? '0 3px 0 0 var(--cb-primary)' : '0 2px 0 0 #430A21',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 액션 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: 1,
              borderRadius: 'var(--cb-radius-md)',
              border: '2px solid #430A21',
              background: photo ? '#fff' : 'var(--cb-primary)',
              color: photo ? '#430A21' : '#fff',
              padding: '14px 12px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 3px 0 0 #430A21',
            }}
          >
            {photo ? <RotateCcw size={16} /> : <Camera size={18} />}
            {photo ? '다시 찍기' : '사진 촬영'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!cardUrl}
            aria-label="카드 저장"
            style={{
              borderRadius: 'var(--cb-radius-md)',
              border: '2px solid #430A21',
              background: '#fff',
              color: '#430A21',
              padding: '14px 16px',
              cursor: cardUrl ? 'pointer' : 'not-allowed',
              boxShadow: '0 3px 0 0 #430A21',
            }}
          >
            <Download size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSaveAndShare}
          disabled={!cardFile || busy}
          style={{
            borderRadius: 'var(--cb-radius-md)',
            border: '2px solid #430A21',
            background: !cardFile || busy ? '#CBD5E1' : 'var(--cb-primary)',
            color: '#fff',
            padding: '15px 12px',
            fontSize: 15,
            fontWeight: 700,
            cursor: !cardFile || busy ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 3px 0 0 #430A21, 0 4px 8px rgba(200, 92, 119, 0.32)',
          }}
        >
          <Share2 size={18} />
          {busy ? '저장 중...' : '서버 저장 & 공유'}
        </button>

        {toast && (
          <div
            style={{
              ...cardStyle,
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--cb-primary-deep)',
              padding: '12px 14px',
            }}
          >
            {toast}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
