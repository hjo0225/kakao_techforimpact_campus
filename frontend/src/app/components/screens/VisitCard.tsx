import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Download, Share2 } from 'lucide-react';
import { useApp } from '../../AppContext';
import { useAuthStore } from '../../../store/authStore';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import { CameraPurposeToggle } from '../CameraPurposeToggle';
import {
  createVisitCard,
  getVisitCards,
  shareUrlForToken,
} from '../../../lib/visitCardApi';
import winMascot from '../../../assets/share-win.png';
import loseMascot from '../../../assets/share-lose.png';

// 프레임 목록 — 앞으로 계속 추가될 수 있게 배열로 관리 (여기에 항목만 추가하면 됨)
interface CardFrame {
  key: string;
  label: string;
  mascot: string;
}
const FRAMES: CardFrame[] = [
  { key: 'win', label: '🏆 승리', mascot: winMascot },
  { key: 'lose', label: '😢 패배', mascot: loseMascot },
];

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

interface CardInput {
  photoUrl: string | null;
  mascotSrc: string;
  visitN: number;
}

// 직관카드 프레임 — 사진을 비율 그대로(짤리지 않게) + 좌하단 토끼 마스코트만.
async function createCardImage(input: CardInput): Promise<File> {
  const mascot = await loadImage(input.mascotSrc);

  // 사진이 있으면 캔버스를 사진 비율에 맞춤(크롭 없음). 없으면 1080² 기본.
  let canvasW = 1080;
  let canvasH = 1080;
  let photo: HTMLImageElement | null = null;
  if (input.photoUrl) {
    photo = await loadImage(input.photoUrl);
    const maxSide = 1080;
    const scale = Math.min(1, maxSide / Math.max(photo.width, photo.height));
    canvasW = Math.max(1, Math.round(photo.width * scale));
    canvasH = Math.max(1, Math.round(photo.height * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');

  if (photo) {
    ctx.drawImage(photo, 0, 0, canvasW, canvasH); // 전체 사진, 짤림 없음
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, canvasH);
    bg.addColorStop(0, '#430A21');
    bg.addColorStop(0.55, '#5E1530');
    bg.addColorStop(1, '#C85C77');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // 좌하단 토끼 마스코트만
  const mascotHeight = canvasH * 0.5;
  const mascotWidth = (mascot.width / mascot.height) * mascotHeight;
  const pad = Math.round(canvasW * 0.03);
  ctx.drawImage(mascot, pad, canvasH - mascotHeight - pad, mascotWidth, mascotHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((r) => (r ? resolve(r) : reject(new Error('export failed'))), 'image/png');
  });
  return new File([blob], `jikgwan-card-${input.visitN}.png`, { type: 'image/png' });
}

export function VisitCard() {
  const { registerCameraAction } = useApp();
  const user = useAuthStore((s) => s.user);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [frameKey, setFrameKey] = useState<string>(FRAMES[0].key);
  const [visitN, setVisitN] = useState(1);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mascotSrc = (FRAMES.find((f) => f.key === frameKey) ?? FRAMES[0]).mascot;

  // 중앙 카메라 버튼이 이 화면의 파일 선택을 열도록 등록
  useEffect(() => {
    registerCameraAction(() => fileInputRef.current?.click());
    return () => registerCameraAction(null);
  }, [registerCameraAction]);

  useEffect(() => {
    getVisitCards()
      .then((cards) => setVisitN(cards.length + 1))
      .catch(() => {});
  }, []);

  // photo/frame/visitN 변경 시 카드 재생성
  useEffect(() => {
    let cancelled = false;
    createCardImage({ photoUrl: photo?.url ?? null, mascotSrc, visitN })
      .then((file) => {
        if (cancelled) return;
        const url = URL.createObjectURL(file);
        setCardFile(file);
        setCardUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [photo, mascotSrc, visitN]);

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

  const handleShare = async () => {
    if (!cardFile || busy) return;
    setBusy(true);
    try {
      const created = await createVisitCard(cardFile, { teamCode: user?.teamCode ?? undefined });
      const url = shareUrlForToken(created.shareToken);
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: '직관카드', text: '오늘의 직관 인증!', url });
          showToast('공유했어요');
        } catch {
          showToast('완료');
        }
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        showToast('공유 링크를 복사했어요');
      } else {
        showToast('완료');
      }
    } catch {
      showToast('실패했어요. 다시 시도해주세요');
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
        {/* 맨 위 — 용도 설정 (인증 / 직관카드) */}
        <CameraPurposeToggle />

        {/* 카드 프리뷰 — 사진 비율 그대로(짤림 없음). 길면 화면이 스크롤됨. */}
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'relative', width: '100%', background: '#000', display: 'flex', justifyContent: 'center', minHeight: 200 }}>
            {cardUrl ? (
              <img src={cardUrl} alt="직관카드 미리보기" style={{ width: '100%', height: 'auto', display: 'block' }} />
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, padding: 40 }}>카드 생성 중...</div>
            )}
            {!photo && cardUrl && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: 'rgba(67, 10, 33, 0.28)',
                  color: '#fff',
                  pointerEvents: 'none',
                }}
              >
                <Camera size={30} />
                <p style={{ fontSize: 12, fontWeight: 700 }}>중앙 카메라 버튼으로 촬영</p>
              </div>
            )}
          </div>
        </div>

        {/* 프레임 선택 (가로 스크롤 — 항목 추가 가능) */}
        <div style={{ ...cardStyle, flexShrink: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>프레임</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 2 }}>
            {FRAMES.map((f) => {
              const active = frameKey === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFrameKey(f.key)}
                  aria-pressed={active}
                  style={{
                    flexShrink: 0,
                    borderRadius: 'var(--cb-radius-md)',
                    border: active ? '2px solid var(--cb-primary)' : '2px solid #430A21',
                    background: active ? 'var(--cb-primary-soft)' : '#fff',
                    color: active ? 'var(--cb-primary-deep)' : '#0F172A',
                    padding: '12px 18px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: active ? '0 3px 0 0 var(--cb-primary)' : '0 2px 0 0 #430A21',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 저장하기 + 공유하기 (한 줄) */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!cardUrl}
            style={{
              flex: 1,
              borderRadius: 'var(--cb-radius-md)',
              border: '2px solid #430A21',
              background: '#fff',
              color: '#430A21',
              padding: '14px 12px',
              fontSize: 14,
              fontWeight: 700,
              cursor: cardUrl ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 3px 0 0 #430A21',
            }}
          >
            <Download size={16} />
            저장하기
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={!cardFile || busy}
            style={{
              flex: 1,
              borderRadius: 'var(--cb-radius-md)',
              border: '2px solid #430A21',
              background: !cardFile || busy ? '#CBD5E1' : 'var(--cb-primary)',
              color: '#fff',
              padding: '14px 12px',
              fontSize: 14,
              fontWeight: 700,
              cursor: !cardFile || busy ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 3px 0 0 #430A21, 0 4px 8px rgba(200, 92, 119, 0.32)',
            }}
          >
            <Share2 size={16} />
            {busy ? '공유 중...' : '공유하기'}
          </button>
        </div>

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
