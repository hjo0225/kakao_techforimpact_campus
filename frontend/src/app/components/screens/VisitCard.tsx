import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Download, SwitchCamera, Frame, Smile, RotateCcw, Video, X } from 'lucide-react';
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

// 촬영 버튼 하늘색 — 카메라 컨트롤 한정(DESIGN.md 토큰 외, 추후 토큰화 가능)
const SKY = '#5BA7E5';

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

  // 좌하단 토끼 마스코트
  const mascotHeight = size * 0.5;
  const mascotWidth = (mascot.width / mascot.height) * mascotHeight;
  const pad = Math.round(size * 0.03);
  ctx.drawImage(mascot, pad, size - mascotHeight - pad, mascotWidth, mascotHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((r) => (r ? resolve(r) : reject(new Error('export failed'))), 'image/png');
  });
  return new File([blob], `jikgwan-card-${input.visitN}.png`, { type: 'image/png' });
}

type View = 'camera' | 'result';
type BottomMode = 'controls' | 'frames';

export function VisitCard() {
  const { registerCameraAction } = useApp();
  const user = useAuthStore((s) => s.user);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [view, setView] = useState<View>('camera');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [camError, setCamError] = useState(false);
  const [bottomMode, setBottomMode] = useState<BottomMode>('controls');

  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [frameKey, setFrameKey] = useState<string>(FRAMES[0].key);
  const [visitN, setVisitN] = useState(1);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [savedCard, setSavedCard] = useState<{ id: string; shareToken: string } | null>(null);

  const mascotSrc = (FRAMES.find((f) => f.key === frameKey) ?? FRAMES[0]).mascot;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  // ── 라이브 카메라: camera 뷰일 때만 스트림 on, result/언마운트 시 off ──
  useEffect(() => {
    if (view !== 'camera') return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamError(false);
      } catch {
        if (!cancelled) setCamError(true);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [view, facing]);

  useEffect(() => {
    getVisitCards()
      .then((cards) => setVisitN(cards.length + 1))
      .catch(() => {});
  }, []);

  // photo/frame/visitN 변경 시 카드 합성
  useEffect(() => {
    let cancelled = false;
    setSavedCard(null);
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

  // ── 촬영: video 프레임 → 1080² canvas(cover) → File ──
  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const size = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.max(size / vw, size / vh);
    const w = vw * scale;
    const h = vh * scale;
    if (facing === 'user') {
      // 프리뷰 미러링과 동일하게 좌우 반전
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, (size - w) / 2, (size - h) / 2, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'shot.png', { type: 'image/png' });
      const url = URL.createObjectURL(file);
      setPhoto((cur) => {
        if (cur) URL.revokeObjectURL(cur.url);
        return { file, url };
      });
      setBottomMode('controls');
      setView('result');
    }, 'image/png');
  }, [facing]);

  // 중앙 네비 카메라 버튼: 카메라 뷰에서 촬영 트리거
  useEffect(() => {
    if (view === 'camera') registerCameraAction(() => capture());
    else registerCameraAction(null);
    return () => registerCameraAction(null);
  }, [view, capture, registerCameraAction]);

  // 카메라 불가 시 파일 선택 폴백
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhoto((cur) => {
        if (cur) URL.revokeObjectURL(cur.url);
        return { file, url };
      });
      setView('result');
    }
    e.target.value = '';
  };

  const retake = () => {
    setPhoto((cur) => {
      if (cur) URL.revokeObjectURL(cur.url);
      return null;
    });
    setBottomMode('controls');
    setView('camera');
  };

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
      await ensureSaved();
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

      {/* 상단바 — 모드 토글(중앙) + 전/후면 전환(우, 카메라 뷰만) */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px 6px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <CameraPurposeToggle />
        </div>
        {view === 'camera' && !camError && (
          <button
            type="button"
            onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            aria-label="전후면 전환"
            style={{
              flexShrink: 0,
              width: 48,
              height: 48,
              border: '2px solid #430A21',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 3px 0 0 #430A21',
            }}
          >
            <SwitchCamera size={20} color="#430A21" strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* 뷰파인더 / 결과 — 가운데 정사각(넘침 방지) */}
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
          {view === 'camera' ? (
            camError ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: 20,
                  textAlign: 'center',
                  color: '#fff',
                }}
              >
                <Camera size={30} strokeWidth={2.2} />
                <p style={{ fontSize: 12, fontWeight: 700, margin: 0, lineHeight: 1.5 }}>
                  카메라를 열 수 없어요.
                  <br />
                  권한을 허용하거나 사진을 선택해 주세요.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px solid #fff',
                    background: 'transparent',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 800,
                    padding: '10px 16px',
                    cursor: 'pointer',
                  }}
                >
                  사진 선택
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transform: facing === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />
            )
          ) : cardUrl ? (
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
        </div>
      </div>

      {/* 하단 촬영 제어부 */}
      <div style={{ flexShrink: 0, borderTop: '2px solid #430A21', background: '#fff', padding: '10px 14px 12px' }}>
        {view === 'result' ? (
          // 촬영 후 — 다시 찍기 / 저장
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <button
              type="button"
              onClick={retake}
              aria-label="다시 찍기"
              style={ctrlSquareStyle}
            >
              <RotateCcw size={20} color="#430A21" strokeWidth={2.4} />
              <span style={ctrlLabelStyle}>다시</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!cardUrl || busy}
              style={{
                flex: 1,
                height: 56,
                border: '2px solid #430A21',
                background: !cardUrl || busy ? '#CBD5E1' : 'var(--cb-primary)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: cardUrl && !busy ? 'pointer' : 'not-allowed',
                boxShadow: '0 3px 0 0 #430A21, 0 4px 8px rgba(200,92,119,0.32)',
              }}
            >
              <Download size={18} strokeWidth={2.6} />
              {busy ? '저장 중' : '저장'}
            </button>
            <div style={{ width: 56 }} aria-hidden />
          </div>
        ) : bottomMode === 'frames' ? (
          // 프레임 선택 모드
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#430A21' }}>프레임</span>
              <button
                type="button"
                onClick={() => setBottomMode('controls')}
                aria-label="프레임 닫기"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} color="#430A21" strokeWidth={2.6} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 2 }}>
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
                    <span style={{ fontSize: 11, fontWeight: 800, color: active ? 'var(--cb-primary-deep)' : '#430A21', whiteSpace: 'nowrap' }}>
                      {f.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          // 기본 — 촬영/비디오 탭 + 프레임 / 촬영 / 이모지
          <>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#430A21' }}>촬영</span>
              <button
                type="button"
                onClick={() => showToast('2초 비디오는 준비 중이에요')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontSize: 13, fontWeight: 700, color: '#B59CA3', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Video size={14} strokeWidth={2.4} />
                비디오
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* 프레임 (좌) */}
              <button type="button" onClick={() => setBottomMode('frames')} aria-label="프레임" style={ctrlSquareStyle}>
                <Frame size={20} color="#430A21" strokeWidth={2.4} />
                <span style={ctrlLabelStyle}>프레임</span>
              </button>

              {/* 촬영 (중앙, 하늘색 원형) */}
              <button
                type="button"
                onClick={capture}
                disabled={camError}
                aria-label="촬영"
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: '9999px',
                  border: '4px solid #fff',
                  background: camError ? '#CBD5E1' : SKY,
                  cursor: camError ? 'not-allowed' : 'pointer',
                  boxShadow: '0 0 0 2px #430A21, 0 4px 10px rgba(67,10,33,0.3)',
                  flexShrink: 0,
                }}
              />

              {/* 이모지 (우) — Phase 2 */}
              <button type="button" onClick={() => showToast('이모지는 준비 중이에요')} aria-label="이모지" style={ctrlSquareStyle}>
                <Smile size={20} color="#B59CA3" strokeWidth={2.4} />
                <span style={{ ...ctrlLabelStyle, color: '#B59CA3' }}>이모지</span>
              </button>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 170, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ background: '#430A21', color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 16px', border: '2px solid #430A21', boxShadow: '3px 3px 0 0 rgba(67,10,33,0.25)' }}>
            {toast}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

const ctrlSquareStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  flexShrink: 0,
  border: '2px solid #430A21',
  background: '#fff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  cursor: 'pointer',
  boxShadow: '0 2px 0 0 #430A21',
};

const ctrlLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  color: '#430A21',
};
