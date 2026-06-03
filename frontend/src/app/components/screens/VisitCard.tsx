import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Download, Share2 } from 'lucide-react';
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
  // 서버에 1회 저장된 카드(저장/공유 중복 생성 방지). 카드가 바뀌면 null로 리셋.
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
    setSavedCard(null); // 카드 내용이 바뀌면 이전 저장본 무효 → 다음 저장/공유 시 새로 저장
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

  const handleShare = async () => {
    if (!cardFile || busy) return;
    setBusy(true);
    try {
      // 저장은 동일 — 서버에 저장해 캘린더에 남김
      await ensureSaved();

      const file = cardFile;
      const canShareImage =
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });

      if (canShareImage) {
        // 이미지 자체를 OS 공유 시트로 — 사용자가 인스타(스토리/피드)·카톡 선택
        try {
          await navigator.share({
            files: [file],
            title: '직관카드',
            text: '오늘의 직관 인증! 🐰',
          });
          showToast('공유했어요');
        } catch (err) {
          // 공유 시트 취소(AbortError)는 조용히 무시
          if ((err as Error)?.name !== 'AbortError') {
            showToast('공유를 완료하지 못했어요');
          }
        }
      } else if (cardUrl) {
        // 이미지 직접 공유 미지원(주로 데스크톱) → 이미지 다운로드로 폴백
        const a = document.createElement('a');
        a.href = cardUrl;
        a.download = `직관카드_${visitN}.png`;
        a.click();
        showToast('이미지를 저장했어요. 인스타·카톡에 올려보세요');
      } else {
        showToast('이 기기에서는 직접 공유를 지원하지 않아요');
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

        {/* 프레임 선택 — 탭 바로 아래 (가로 스크롤, 항목 추가 가능) */}
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

        {/* 저장하기 + 공유하기 (한 줄) */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!cardUrl || busy}
            style={{
              flex: 1,
              borderRadius: 'var(--cb-radius-md)',
              border: '2px solid #430A21',
              background: '#fff',
              color: '#430A21',
              padding: '14px 12px',
              fontSize: 14,
              fontWeight: 700,
              cursor: cardUrl && !busy ? 'pointer' : 'not-allowed',
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
