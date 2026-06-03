import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Download } from 'lucide-react';
import { useApp } from '../../AppContext';
import { useAuthStore } from '../../../store/authStore';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import { CameraPurposeToggle } from '../CameraPurposeToggle';
import { createVisitCard, getVisitCards } from '../../../lib/visitCardApi';
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

// 직관카드 프레임 — 1080² 정사각형. 사진을 cover로 채움 + 좌하단 토끼.
async function createCardImage(input: CardInput): Promise<File> {
  const mascot = await loadImage(input.mascotSrc);
  const size = 1080;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');

  if (input.photoUrl) {
    const photo = await loadImage(input.photoUrl);
    // cover: 짧은 쪽 기준으로 꽉 채워 그림 (여백 없음, 긴 쪽은 크롭)
    const scale = Math.max(size / photo.width, size / photo.height);
    const w = photo.width * scale;
    const h = photo.height * scale;
    ctx.drawImage(photo, (size - w) / 2, (size - h) / 2, w, h);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, size);
    bg.addColorStop(0, '#430A21');
    bg.addColorStop(0.55, '#5E1530');
    bg.addColorStop(1, '#C85C77');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
  }

  // 좌하단 토끼 마스코트만
  const mascotHeight = size * 0.5;
  const mascotWidth = (mascot.width / mascot.height) * mascotHeight;
  const pad = Math.round(size * 0.03);
  ctx.drawImage(mascot, pad, size - mascotHeight - pad, mascotWidth, mascotHeight);

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
  // 서버에 1회 저장된 카드(저장 중복 생성 방지). 카드가 바뀌면 null로 리셋.
  const [savedCard, setSavedCard] = useState<{ id: string; shareToken: string } | null>(null);
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
    setSavedCard(null); // 카드 내용이 바뀌면 이전 저장본 무효 → 다음 저장 시 새로 저장
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

  // 카드를 서버에 1회 저장(캘린더에 노출). 이미 저장됐으면 그대로 재사용해 중복 생성 방지.
  const ensureSaved = useCallback(async () => {
    if (savedCard) return savedCard;
    if (!cardFile) return null;
    const created = await createVisitCard(cardFile, { teamCode: user?.teamCode ?? undefined });
    const rec = { id: created.id, shareToken: created.shareToken };
    setSavedCard(rec);
    return rec;
  }, [savedCard, cardFile, user]);

  const handleDownload = async () => {
    if (!cardUrl || busy) return;
    setBusy(true);
    let saved = true;
    try {
      await ensureSaved(); // 서버 저장 → 캘린더 직관카드 탭에 노출
    } catch {
      saved = false;
    }
    const a = document.createElement('a');
    a.href = cardUrl;
    a.download = `직관카드_${visitN}.png`;
    a.click();
    showToast(saved ? '저장했어요' : '내려받았어요 (기록 저장 실패)');
    setBusy(false);
  };

  const canSave = !!cardUrl && !busy;

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
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

      {/* 헤더 — 용도 토글(좌) + 저장(우상단) */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px 6px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <CameraPurposeToggle />
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!canSave}
          aria-label="저장"
          style={{
            flexShrink: 0,
            height: 48,
            padding: '0 16px',
            border: '2px solid #430A21',
            background: canSave ? 'var(--cb-primary)' : '#CBD5E1',
            color: '#fff',
            fontSize: 14,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: canSave ? 'pointer' : 'not-allowed',
            boxShadow: '0 3px 0 0 #430A21',
          }}
        >
          <Download size={16} strokeWidth={2.6} />
          {busy ? '저장 중' : '저장'}
        </button>
      </div>

      {/* 카드 프리뷰 — 가운데, 가변 영역. 가용 폭/높이 중 작은 쪽에 맞춰 정사각이 항상 들어가게(넘침 방지). */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          containerType: 'size',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 16px 10px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 'min(100%, 100cqh)',
            aspectRatio: '1 / 1',
            border: '2px solid #430A21',
            boxShadow: '4px 4px 0 0 #430A21',
            overflow: 'hidden',
            background: '#000',
          }}
        >
          {cardUrl ? (
            <img
              src={cardUrl}
              alt="직관카드 미리보기"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.8)',
                fontSize: 12,
              }}
            >
              카드 생성 중...
            </div>
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
              <Camera size={30} strokeWidth={2.4} />
              <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>중앙 카메라 버튼으로 촬영</p>
            </div>
          )}
        </div>
      </div>

      {/* 프레임 캐러셀 — 네비 위, 가로 스크롤로 프레임 전환 */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 12px',
          borderTop: '2px solid #430A21',
          background: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            paddingBottom: 2,
            WebkitOverflowScrolling: 'touch',
          }}
        >
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
                  scrollSnapAlign: 'center',
                  width: 76,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '8px 6px',
                  border: active ? '2px solid var(--cb-primary)' : '2px solid #430A21',
                  background: active ? 'var(--cb-primary-soft)' : '#fff',
                  boxShadow: active ? '0 3px 0 0 var(--cb-primary)' : '0 2px 0 0 #430A21',
                  cursor: 'pointer',
                }}
              >
                <img src={f.mascot} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: active ? 'var(--cb-primary-deep)' : '#430A21',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 토스트 — 캐러셀/네비 위에 잠깐 떠오름 */}
      {toast && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 150,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: '#430A21',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              padding: '10px 16px',
              border: '2px solid #430A21',
              boxShadow: '3px 3px 0 0 rgba(67,10,33,0.25)',
            }}
          >
            {toast}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
