import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera, Download, SwitchCamera, Frame, RotateCcw, Video, X, ScanLine, CheckCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { useApp, type CameraPurpose } from '../../AppContext';
import { useAuthStore } from '../../../store/authStore';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import { createVisitCard, getVisitCards } from '../../../lib/visitCardApi';
import {
  analyzeImage, confirmLabel, ApiError,
  type AiPrediction, type ContainerLabel, type CertificationMode,
} from '../../../lib/verifyApi';
import lotteFrame from '../../../assets/card-frames/2cutlotte.png';
import doosanFrame from '../../../assets/card-frames/3cutdoosan.png';

interface CardSlot { x: number; y: number; w: number; h: number }
interface CardFrame {
  key: string;
  label: string;
  countLabel: string;
  src: string;
  width: number;
  height: number;
  bg: string;
  accent: string;
  slots: CardSlot[];
}
const FRAMES: CardFrame[] = [
  {
    key: 'lotte-2cut',
    label: '롯데 2컷',
    countLabel: '2장',
    src: lotteFrame,
    width: 1084,
    height: 1924,
    bg: '#fff',
    accent: '#C9152E',
    slots: [
      { x: 77, y: 186, w: 929, h: 801 },
      { x: 77, y: 1053, w: 929, h: 801 },
    ],
  },
  {
    key: 'doosan-3cut',
    label: '두산 3컷',
    countLabel: '3장',
    src: doosanFrame,
    width: 1080,
    height: 1920,
    bg: '#0D073A',
    accent: '#151047',
    slots: [
      { x: 40, y: 41, w: 1000, h: 550 },
      { x: 40, y: 632, w: 1000, h: 550 },
      { x: 40, y: 1223, w: 1000, h: 550 },
    ],
  },
];

const MODES: Array<{ v: CameraPurpose; t: string }> = [
  { v: 'verify', t: '용기인증' },
  { v: 'visit-card', t: '직관카드' },
];

const V_MODES: Array<{ id: CertificationMode; t: string }> = [
  { id: 'use', t: '사용 인증' },
  { id: 'return', t: '반납 인증' },
];

const LABELS: Array<{ value: ContainerLabel; t: string; tone: string }> = [
  { value: 'REUSABLE', t: '다회용기', tone: '#5E8B5A' },
  { value: 'SINGLE_USE', t: '일회용기', tone: '#8C5A00' },
];

type ResultTone = 'success' | 'neutral' | 'error';
function toneColor(t: ResultTone) {
  return t === 'success' ? '#5E8B5A' : t === 'neutral' ? '#430A21' : '#C2362C';
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

interface CardPhoto { file: File; url: string }
interface CardInput { photos: CardPhoto[]; frame: CardFrame; visitN: number }

function makeEmptyCardPhotos(frame: CardFrame): Array<CardPhoto | null> {
  return frame.slots.map(() => null);
}

function revokeCardPhoto(photo: CardPhoto | null) {
  if (photo) URL.revokeObjectURL(photo.url);
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, slot: CardSlot) {
  const scale = Math.max(slot.w / image.width, slot.h / image.height);
  const sw = slot.w / scale;
  const sh = slot.h / scale;
  const sx = (image.width - sw) / 2;
  const sy = (image.height - sh) / 2;
  ctx.drawImage(image, sx, sy, sw, sh, slot.x, slot.y, slot.w, slot.h);
}

async function createCardImage(input: CardInput): Promise<File> {
  const [frame, ...photos] = await Promise.all([
    loadImage(input.frame.src),
    ...input.photos.map((photo) => loadImage(photo.url)),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = input.frame.width;
  canvas.height = input.frame.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  ctx.fillStyle = input.frame.bg;
  ctx.fillRect(0, 0, input.frame.width, input.frame.height);
  photos.forEach((photo, index) => drawCover(ctx, photo, input.frame.slots[index]));
  ctx.drawImage(frame, 0, 0, input.frame.width, input.frame.height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((r) => (r ? resolve(r) : reject(new Error('export failed'))), 'image/png');
  });
  return new File([blob], `jikgwan-card-${input.visitN}-${input.frame.key}.png`, { type: 'image/png' });
}

type View = 'camera' | 'result';
type BottomMode = 'controls' | 'frames';
type VStep = 'idle' | 'analyzing' | 'labeling' | 'submitting' | 'done';
interface VResult { tone: ResultTone; title: string; reason: string }

export function VisitCard() {
  const { cameraPurpose, setCameraPurpose, setCaptureMode, addCertification } = useApp();
  const user = useAuthStore((s) => s.user);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const slotInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const cardPhotosRef = useRef<Array<CardPhoto | null>>(makeEmptyCardPhotos(FRAMES[0]));
  const cardUrlRef = useRef<string | null>(null);

  const [view, setView] = useState<View>('camera');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [camError, setCamError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);

  // 직관카드
  const [bottomMode, setBottomMode] = useState<BottomMode>('controls');
  const [frameKey, setFrameKey] = useState<string>(FRAMES[0].key);
  const [cardPhotos, setCardPhotos] = useState<Array<CardPhoto | null>>(() => makeEmptyCardPhotos(FRAMES[0]));
  const [visitN, setVisitN] = useState(1);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [savedCard, setSavedCard] = useState<{ id: string; shareToken: string } | null>(null);

  // 인증(verify)
  const [vMode, setVMode] = useState<CertificationMode>('use');
  const [vStep, setVStep] = useState<VStep>('idle');
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [ai, setAi] = useState<AiPrediction | null>(null);
  const [label, setLabel] = useState<ContainerLabel>('REUSABLE');
  const [vResult, setVResult] = useState<VResult | null>(null);

  const currentFrame = FRAMES.find((f) => f.key === frameKey) ?? FRAMES[0];
  const isCard = cameraPurpose === 'visit-card';
  const cardPhotoCount = cardPhotos.filter(Boolean).length;
  const isCardComplete = cardPhotoCount === currentFrame.slots.length;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    cardPhotosRef.current = cardPhotos;
  }, [cardPhotos]);

  useEffect(() => {
    cardUrlRef.current = cardUrl;
  }, [cardUrl]);

  useEffect(() => () => {
    cardPhotosRef.current.forEach(revokeCardPhoto);
    if (cardUrlRef.current) URL.revokeObjectURL(cardUrlRef.current);
  }, []);

  // 라이브 카메라 — camera 뷰일 때만
  useEffect(() => {
    if (view !== 'camera') return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // iOS Safari: autoPlay가 막히는 경우가 있어 명시적으로 재생
          videoRef.current.play().catch(() => {});
        }
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

  // 카메라 뷰 = 촬영 모드 → BottomNav 선 제거
  useEffect(() => {
    setCaptureMode(view === 'camera');
    return () => setCaptureMode(false);
  }, [view, setCaptureMode]);

  // 모드 전환 시 카메라로 복귀 + 상태 초기화
  useEffect(() => {
    setView('camera');
    setBottomMode('controls');
    setFrameKey(FRAMES[0].key);
    setVStep('idle');
    setSampleId(null);
    setAi(null);
    setVResult(null);
    setPhoto((cur) => { if (cur) URL.revokeObjectURL(cur.url); return null; });
    setCardPhotos((cur) => {
      cur.forEach(revokeCardPhoto);
      return makeEmptyCardPhotos(FRAMES[0]);
    });
    setCardFile(null);
    setCardUrl((cur) => { if (cur) URL.revokeObjectURL(cur); return null; });
    setSavedCard(null);
  }, [cameraPurpose]);

  useEffect(() => {
    getVisitCards().then((cards) => setVisitN(cards.length + 1)).catch(() => {});
  }, []);

  // 직관카드: 모든 슬롯이 채워지면 프레임과 합성
  useEffect(() => {
    if (!isCard) return;
    let cancelled = false;
    setSavedCard(null);
    if (!isCardComplete) {
      setCardFile(null);
      setCardUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      return () => { cancelled = true; };
    }
    createCardImage({ photos: cardPhotos as CardPhoto[], frame: currentFrame, visitN })
      .then((file) => {
        if (cancelled) return;
        const url = URL.createObjectURL(file);
        setCardFile(file);
        setCardUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
      })
      .catch(() => {
        if (cancelled) return;
        setCardFile(null);
        setCardUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      });
    return () => { cancelled = true; };
  }, [cardPhotos, currentFrame, isCard, isCardComplete, visitN]);

  useEffect(() => {
    return () => { if (photo) URL.revokeObjectURL(photo.url); };
  }, [photo]);

  const updateCardPhotos = useCallback((next: Array<CardPhoto | null>) => {
    setCardPhotos(next);
    setSavedCard(null);
    setBottomMode('controls');
    const filled = next.filter(Boolean).length;
    if (filled === currentFrame.slots.length) {
      showToast('카드가 완성됐어요');
    } else {
      showToast(`${filled}/${currentFrame.slots.length}장 선택했어요`);
    }
  }, [currentFrame.slots.length, showToast]);

  const addCardFiles = useCallback((files: File[]) => {
    const images = files.filter((file) => file.type.startsWith('image/'));
    if (images.length === 0) return;
    const next = [...cardPhotos];
    let cursor = next.findIndex((item) => !item);
    if (cursor === -1) cursor = 0;
    images.slice(0, currentFrame.slots.length).forEach((file) => {
      const target = cursor % currentFrame.slots.length;
      revokeCardPhoto(next[target]);
      next[target] = { file, url: URL.createObjectURL(file) };
      cursor += 1;
    });
    updateCardPhotos(next);
  }, [cardPhotos, currentFrame.slots.length, updateCardPhotos]);

  const replaceCardSlot = useCallback((index: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const next = [...cardPhotos];
    revokeCardPhoto(next[index]);
    next[index] = { file, url: URL.createObjectURL(file) };
    updateCardPhotos(next);
  }, [cardPhotos, updateCardPhotos]);

  const handleSlotFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) replaceCardSlot(index, file);
    e.target.value = '';
  };

  const selectCardFrame = (frame: CardFrame) => {
    if (frame.key === frameKey) return;
    setFrameKey(frame.key);
    setSavedCard(null);
    setCardPhotos((cur) => {
      const next = frame.slots.map((_, index) => cur[index] ?? null);
      cur.forEach((item, index) => {
        if (index >= frame.slots.length) revokeCardPhoto(item);
      });
      return next;
    });
    setCardFile(null);
    setCardUrl((cur) => { if (cur) URL.revokeObjectURL(cur); return null; });
    setBottomMode('controls');
  };

  const clearCard = () => {
    setCardPhotos((cur) => {
      cur.forEach(revokeCardPhoto);
      return makeEmptyCardPhotos(currentFrame);
    });
    setCardFile(null);
    setCardUrl((cur) => { if (cur) URL.revokeObjectURL(cur); return null; });
    setSavedCard(null);
  };

  // 촬영
  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    // 뷰파인더에 보이는 전체 프레임을 그대로 촬영한다.
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const canvas = document.createElement('canvas');
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (facing === 'user') { ctx.translate(vw, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, vw, vh);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'shot.png', { type: 'image/png' });
      if (cameraPurpose === 'visit-card') {
        addCardFiles([file]);
        return;
      }
      const url = URL.createObjectURL(file);
      setPhoto((cur) => { if (cur) URL.revokeObjectURL(cur.url); return { file, url }; });
      setBottomMode('controls');
      setVStep('idle');
      setSampleId(null);
      setAi(null);
      setVResult(null);
      setView('result');
    }, 'image/png');
  }, [addCardFiles, facing, cameraPurpose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (cameraPurpose === 'visit-card') {
      addCardFiles(files);
      e.target.value = '';
      return;
    }
    const file = files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhoto((cur) => { if (cur) URL.revokeObjectURL(cur.url); return { file, url }; });
      setVStep('idle');
      setSampleId(null);
      setAi(null);
      setVResult(null);
      setView('result');
    }
    e.target.value = '';
  };

  const retake = () => {
    if (isCard) {
      clearCard();
      setBottomMode('controls');
      setView('camera');
      return;
    }
    setPhoto((cur) => { if (cur) URL.revokeObjectURL(cur.url); return null; });
    setBottomMode('controls');
    setVStep('idle');
    setSampleId(null);
    setAi(null);
    setVResult(null);
    setView('camera');
  };

  // 직관카드 저장
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
    try { await ensureSaved(); } catch { saved = false; }
    const a = document.createElement('a');
    a.href = cardUrl;
    a.download = `직관카드_${visitN}.png`;
    a.click();
    showToast(saved ? '저장했어요' : '내려받았어요 (기록 저장 실패)');
    setBusy(false);
  };

  // 인증 — AI 분석/확정
  const errorResult = (err: unknown): VResult => {
    if (err instanceof ApiError) {
      const body = err.body as { code?: string; message?: string } | null;
      if (body?.code === 'ALREADY_CONFIRMED') return { tone: 'error', title: '이미 확정됨', reason: '새로 촬영해 다시 시도해주세요.' };
      if (err.status === 503) return { tone: 'error', title: '저장 실패', reason: '잠시 후 다시 시도해주세요.' };
      return { tone: 'error', title: `오류 ${err.status}`, reason: body?.message ?? err.message };
    }
    return { tone: 'error', title: '네트워크 오류', reason: '연결을 확인하고 다시 시도해주세요.' };
  };

  const handleAnalyze = async () => {
    if (!photo || busy) return;
    setBusy(true);
    setVResult(null);
    setVStep('analyzing');
    try {
      const res = await analyzeImage(vMode, photo.file);
      setSampleId(res.sampleId);
      setAi(res.ai);
      setLabel(res.suggestedLabel);
      setVStep('labeling');
    } catch (err) {
      setVResult(errorResult(err));
      setVStep('done');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!sampleId || busy) return;
    setBusy(true);
    setVStep('submitting');
    try {
      const res = await confirmLabel(sampleId, label);
      const detected = label === 'REUSABLE' ? '다회용기' : '일회용기';
      if (res.scored) {
        addCertification(vMode);
        setVResult({ tone: 'success', title: vMode === 'use' ? '사용 인증 완료' : '반납 인증 완료', reason: ai ? `${detected} · AI ${ai.confidence.toFixed(1)}%` : detected });
      } else if (res.reason === 'SINGLE_USE_LABEL') {
        setVResult({ tone: 'neutral', title: '일회용기로 기록', reason: '학습 데이터로 저장했어요. 점수는 반영되지 않습니다.' });
      } else {
        setVResult({ tone: 'error', title: '사용 인증 필요', reason: '최근 12시간 내 사용 인증이 없어 반납 점수가 반영되지 않았습니다.' });
      }
      setVStep('done');
    } catch (err) {
      setVResult(errorResult(err));
      setVStep('done');
    } finally {
      setBusy(false);
    }
  };

  const captureBtn = (
    <button
      type="button"
      onClick={capture}
      disabled={camError}
      aria-label="촬영"
      style={{
        width: 72, height: 72, borderRadius: '9999px', border: '2px solid #430A21',
        background: camError ? '#CBD5E1' : 'var(--cb-primary)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        cursor: camError ? 'not-allowed' : 'pointer',
        boxShadow: '0 4px 0 0 #430A21, 0 6px 14px rgba(200,92,119,0.4)',
      }}
    >
      <Camera size={28} strokeWidth={2.4} />
    </button>
  );

  const cardEditor = (
    <div style={cardEditorShellStyle}>
      <div
        style={{
          ...cardFramePreviewStyle,
          width: `min(100%, ${(currentFrame.width / currentFrame.height) * 100}cqh)`,
          aspectRatio: `${currentFrame.width} / ${currentFrame.height}`,
          background: currentFrame.bg,
        }}
      >
        {currentFrame.slots.map((slot, index) => {
          const slotPhoto = cardPhotos[index];
          const slotStyle: React.CSSProperties = {
            position: 'absolute',
            left: `${(slot.x / currentFrame.width) * 100}%`,
            top: `${(slot.y / currentFrame.height) * 100}%`,
            width: `${(slot.w / currentFrame.width) * 100}%`,
            height: `${(slot.h / currentFrame.height) * 100}%`,
            zIndex: 1,
          };
          return (
            <div key={`${currentFrame.key}-${index}`} style={slotStyle}>
              <input
                ref={(node) => { slotInputRefs.current[index] = node; }}
                type="file"
                accept="image/*"
                onChange={(e) => handleSlotFileChange(index, e)}
                style={{ display: 'none' }}
                aria-hidden
                tabIndex={-1}
              />
              <button
                type="button"
                onClick={() => slotInputRefs.current[index]?.click()}
                aria-label={`${index + 1}번째 사진 ${slotPhoto ? '바꾸기' : '선택'}`}
                style={{
                  ...cardSlotButtonStyle,
                  borderStyle: slotPhoto ? 'solid' : 'dashed',
                  borderColor: slotPhoto ? 'rgba(255,255,255,0.36)' : 'rgba(255,255,255,0.82)',
                }}
              >
                {slotPhoto ? (
                  <img src={slotPhoto.url} alt="" style={cardSlotImageStyle} />
                ) : (
                  <span style={cardSlotEmptyStyle}>
                    <ImageIcon size={22} strokeWidth={2.4} />
                    <span>{index + 1}</span>
                  </span>
                )}
              </button>
            </div>
          );
        })}
        <img src={currentFrame.src} alt="" style={cardFrameOverlayStyle} />
      </div>
      {camError && (
        <p style={cardCameraHintStyle}>카메라를 열 수 없어요. 슬롯을 눌러 사진을 선택해 주세요.</p>
      )}
    </div>
  );

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <input ref={fileInputRef} type="file" accept="image/*" multiple={isCard} capture={isCard ? undefined : 'environment'} onChange={handleFileChange} style={{ display: 'none' }} aria-hidden tabIndex={-1} />
      <StatusBar bg="#fff" />

      {/* 헤더 — 흰색 풀폭(상태바까지): 중앙 토글 + 우측 전후면 전환. 크기 통일 + 둥근 테두리 */}
      <div style={{ flexShrink: 0, background: '#fff', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 10px' }}>
        <div style={{ width: 40, flexShrink: 0 }} aria-hidden />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', height: 40, padding: '0 4px', gap: 2, border: '2px solid #430A21', borderRadius: 9999, background: '#F0E8E7' }}>
            {MODES.map((o) => {
              const active = cameraPurpose === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setCameraPurpose(o.v)}
                  aria-pressed={active}
                  style={{
                    height: 32, padding: '0 14px', border: 'none', borderRadius: 9999,
                    fontSize: 13, fontWeight: 800,
                    background: active ? 'var(--cb-primary)' : 'transparent',
                    color: active ? '#fff' : '#8C6B73', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {o.t}
                </button>
              );
            })}
          </div>
        </div>
        {view === 'camera' && !camError ? (
          <button
            type="button"
            onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            aria-label="전후면 전환"
            style={{ width: 40, height: 40, flexShrink: 0, border: '2px solid #430A21', borderRadius: 9999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <SwitchCamera size={19} color="#430A21" strokeWidth={2.4} />
          </button>
        ) : (
          <div style={{ width: 40, flexShrink: 0 }} aria-hidden />
        )}
      </div>

      {/* ── 카메라 뷰 ── */}
      {view === 'camera' && (
        <>
	          {/* 풀블리드 뷰파인더 — 영역 전체를 촬영 화면으로 (검정 배경 없이 흰 제어부와 자연스럽게 연결) */}
	          <div style={{ flex: 1, minHeight: 0, containerType: 'size', position: 'relative', overflow: 'hidden' }}>
	            {isCard ? (
	              <>
	                {!camError && (
	                  <video
	                    ref={videoRef}
	                    autoPlay
	                    muted
	                    playsInline
	                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
	                  />
	                )}
	                {cardEditor}
	              </>
	            ) : camError ? (
	              <div style={{ position: 'absolute', inset: 0, background: '#430A21', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, textAlign: 'center', color: '#fff' }}>
	                <Camera size={30} strokeWidth={2.2} />
	                <p style={{ fontSize: 12, fontWeight: 700, margin: 0, lineHeight: 1.5 }}>카메라를 열 수 없어요.<br />권한을 허용하거나 사진을 선택해 주세요.</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} style={{ border: '2px solid #fff', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 800, padding: '10px 16px', cursor: 'pointer' }}>사진 선택</button>
              </div>
	            ) : (
	              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: facing === 'user' ? 'scaleX(-1)' : 'none' }} />
	            )}
	          </div>

          {/* 촬영 제어부 — 풀폭, 카메라 뷰는 선 없이 네비와 연결 */}
          <div style={{ flexShrink: 0, background: '#fff', padding: '8px 0 4px' }}>
            {isCard && bottomMode === 'frames' ? (
              <div style={{ padding: '0 14px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#430A21' }}>프레임</span>
                  <button type="button" onClick={() => setBottomMode('controls')} aria-label="프레임 닫기" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}>
                    <X size={18} color="#430A21" strokeWidth={2.6} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 2 }}>
                  {FRAMES.map((f) => {
                    const active = frameKey === f.key;
                    return (
                      <button key={f.key} type="button" onClick={() => selectCardFrame(f)} aria-pressed={active}
                        style={{ flexShrink: 0, scrollSnapAlign: 'center', width: 92, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 6px', border: active ? `2px solid ${f.accent}` : '2px solid #430A21', background: active ? 'var(--cb-primary-soft)' : '#fff', boxShadow: active ? `0 3px 0 0 ${f.accent}` : '0 2px 0 0 #430A21', cursor: 'pointer' }}>
                        <span style={{ width: 28, height: 48, border: '1px solid #430A21', background: f.bg, overflow: 'hidden', display: 'flex' }}>
                          <img src={f.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: active ? 'var(--cb-primary-deep)' : '#430A21', whiteSpace: 'nowrap' }}>{f.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: active ? 'var(--cb-primary-deep)' : '#8C6B73', whiteSpace: 'nowrap' }}>{f.countLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : isCard ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--cb-primary-deep)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ImageIcon size={14} strokeWidth={2.4} /> 사진 {cardPhotoCount}/{currentFrame.slots.length}
                  </span>
                  <button type="button" onClick={() => showToast('2초 비디오는 준비 중이에요')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontSize: 13, fontWeight: 700, color: '#B59CA3', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Video size={14} strokeWidth={2.4} /> 비디오
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
                  <button type="button" onClick={() => setBottomMode('frames')} aria-label="프레임" style={ctrlSquareStyle}>
                    <Frame size={20} color="#430A21" strokeWidth={2.4} />
                    <span style={ctrlLabelStyle}>프레임</span>
                  </button>
                  {captureBtn}
	                  <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="사진 선택" style={ctrlSquareStyle}>
	                    <ImageIcon size={20} color="#430A21" strokeWidth={2.4} />
	                    <span style={ctrlLabelStyle}>사진</span>
	                  </button>
                </div>
                {isCardComplete && (
                  <div style={{ padding: '8px 24px 0' }}>
                    <button type="button" onClick={handleDownload} disabled={!cardUrl || busy}
                      style={{ width: '100%', height: 48, border: '2px solid #430A21', borderRadius: 14, background: !cardUrl || busy ? '#CBD5E1' : 'var(--cb-primary)', color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: cardUrl && !busy ? 'pointer' : 'not-allowed', boxShadow: '0 3px 0 0 #430A21, 0 4px 8px rgba(200,92,119,0.32)' }}>
                      <Download size={18} strokeWidth={2.6} />
                      {busy ? '저장 중' : cardUrl ? '저장' : '카드 생성 중'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              // 인증 — 촬영 버튼만
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>{captureBtn}</div>
            )}
          </div>
        </>
      )}

      {/* ── 결과: 직관카드 ── */}
      {view === 'result' && isCard && (
        <>
          <div style={{ flex: 1, minHeight: 0, containerType: 'size', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 16px', overflow: 'hidden' }}>
            <div style={{ position: 'relative', width: `min(100%, ${(currentFrame.width / currentFrame.height) * 100}cqh)`, aspectRatio: `${currentFrame.width} / ${currentFrame.height}`, border: '2px solid #430A21', boxShadow: '4px 4px 0 0 #430A21', overflow: 'hidden', background: currentFrame.bg }}>
              {cardUrl ? (
                <img src={cardUrl} alt="직관카드 미리보기" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>카드 생성 중...</div>
              )}
            </div>
          </div>
          <div style={{ flexShrink: 0, background: '#fff', padding: '10px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" onClick={retake} aria-label="다시 찍기" style={ctrlSquareStyle}>
              <RotateCcw size={20} color="#430A21" strokeWidth={2.4} />
              <span style={ctrlLabelStyle}>다시</span>
            </button>
            <button type="button" onClick={handleDownload} disabled={!cardUrl || busy}
              style={{ flex: 1, height: 56, border: '2px solid #430A21', background: !cardUrl || busy ? '#CBD5E1' : 'var(--cb-primary)', color: '#fff', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: cardUrl && !busy ? 'pointer' : 'not-allowed', boxShadow: '0 3px 0 0 #430A21, 0 4px 8px rgba(200,92,119,0.32)' }}>
              <Download size={18} strokeWidth={2.6} />
              {busy ? '저장 중' : '저장'}
            </button>
            <div style={{ width: 56 }} aria-hidden />
          </div>
        </>
      )}

      {/* ── 결과: 인증(AI 분석) ── */}
      {view === 'result' && !isCard && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '12px 16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 촬영 사진 */}
          <div style={{ width: '100%', aspectRatio: '1 / 1', border: '2px solid #430A21', boxShadow: '3px 3px 0 0 #430A21', overflow: 'hidden', flexShrink: 0, background: '#000' }}>
            {photo && <img src={photo.url} alt="촬영한 용기" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
          </div>

          {/* 사용/반납 (분석 전만) */}
          {vStep === 'idle' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {V_MODES.map((m) => {
                const active = m.id === vMode;
                return (
                  <button key={m.id} type="button" onClick={() => setVMode(m.id)} aria-pressed={active}
                    style={{ border: active ? '2px solid var(--cb-primary)' : '2px solid #430A21', background: active ? 'var(--cb-primary-soft)' : '#fff', color: active ? 'var(--cb-primary-deep)' : '#430A21', padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: active ? '0 3px 0 0 var(--cb-primary)' : '0 2px 0 0 #430A21' }}>
                    {m.t}
                  </button>
                );
              })}
            </div>
          )}

          {vStep === 'idle' && (
            <button type="button" onClick={handleAnalyze} disabled={busy}
              style={{ border: '2px solid #430A21', background: 'var(--cb-primary)', color: '#fff', padding: '15px 12px', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 3px 0 0 #430A21, 0 4px 8px rgba(200,92,119,0.32)' }}>
              <ScanLine size={18} strokeWidth={2.4} /> AI 인증
            </button>
          )}

          {vStep === 'analyzing' && (
            <p style={{ textAlign: 'center', color: '#8C6B73', fontSize: 13, fontWeight: 700, padding: '12px 0' }}>AI 판독 중...</p>
          )}

          {(vStep === 'labeling' || vStep === 'submitting') && (
            <div style={{ background: '#fff', border: '2px solid #430A21', boxShadow: '0 3px 0 0 #430A21', padding: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#430A21', margin: 0 }}>라벨 확정</p>
              <p style={{ marginTop: 4, fontSize: 11, color: '#8C6B73', lineHeight: 1.5 }}>
                {ai ? `AI 예측: ${ai.isReusable ? '다회용기' : '일회용기'} · ${ai.confidence.toFixed(1)}%` : 'AI가 판단하지 못했어요. 직접 선택해주세요.'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                {LABELS.map((opt) => {
                  const active = opt.value === label;
                  return (
                    <button key={opt.value} type="button" onClick={() => !busy && setLabel(opt.value)} aria-pressed={active}
                      style={{ border: active ? `2px solid ${opt.tone}` : '2px solid #430A21', background: '#fff', color: active ? opt.tone : '#430A21', padding: '14px 0', fontSize: 14, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', boxShadow: active ? `0 3px 0 0 ${opt.tone}` : '0 2px 0 0 #430A21' }}>
                      {opt.t}
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={handleConfirm} disabled={busy}
                style={{ width: '100%', marginTop: 12, border: '2px solid #430A21', background: busy ? '#CBD5E1' : 'var(--cb-primary)', color: '#fff', padding: '14px 12px', fontSize: 14, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', boxShadow: '0 3px 0 0 #430A21, 0 4px 8px rgba(200,92,119,0.32)' }}>
                {vStep === 'submitting' ? '확정 중...' : `${label === 'REUSABLE' ? '다회용기' : '일회용기'}로 인증 확정`}
              </button>
            </div>
          )}

          {vStep === 'done' && vResult && (
            <div style={{ background: '#fff', border: `2px solid ${toneColor(vResult.tone)}`, boxShadow: `0 3px 0 0 ${toneColor(vResult.tone)}`, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <CheckCircle size={22} color={toneColor(vResult.tone)} />
                <p style={{ fontSize: 16, fontWeight: 800, color: '#430A21', margin: 0 }}>{vResult.title}</p>
              </div>
              <p style={{ marginTop: 8, fontSize: 12, color: '#5E1530', lineHeight: 1.55, textAlign: 'center' }}>{vResult.reason}</p>
              <button type="button" onClick={retake}
                style={{ width: '100%', marginTop: 12, border: '2px solid #430A21', background: '#fff', color: '#430A21', padding: '13px 12px', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 0 0 #430A21' }}>
                새로 촬영하기
              </button>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 150, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ background: '#430A21', color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 16px', border: '2px solid #430A21', boxShadow: '3px 3px 0 0 rgba(67,10,33,0.25)' }}>{toast}</div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

const ctrlSquareStyle: React.CSSProperties = {
  width: 56, height: 56, flexShrink: 0, border: '2px solid #430A21', background: '#fff',
  borderRadius: 16,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
  cursor: 'pointer', boxShadow: '0 2px 0 0 #430A21',
};
const ctrlLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 800, color: '#430A21' };

const cardEditorShellStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '10px 16px',
  background: 'linear-gradient(180deg, #430A21 0%, #5E1530 55%, #C85C77 100%)',
  boxSizing: 'border-box',
};

const cardFramePreviewStyle: React.CSSProperties = {
  position: 'relative',
  maxHeight: '100%',
  overflow: 'hidden',
  border: '2px solid rgba(255,255,255,0.72)',
  boxShadow: '0 5px 0 0 #430A21, 0 10px 20px rgba(0,0,0,0.24)',
};

const cardSlotButtonStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  borderWidth: 2,
  background: 'rgba(15, 23, 42, 0.68)',
  color: '#fff',
  padding: 0,
  overflow: 'hidden',
  cursor: 'pointer',
};

const cardSlotImageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const cardSlotEmptyStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontSize: 15,
  fontWeight: 900,
  color: 'rgba(255,255,255,0.88)',
};

const cardFrameOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'fill',
  zIndex: 2,
  pointerEvents: 'none',
};

const cardCameraHintStyle: React.CSSProperties = {
  margin: 0,
  padding: '7px 10px',
  border: '2px solid rgba(255,255,255,0.64)',
  borderRadius: 9999,
  background: 'rgba(67,10,33,0.72)',
  color: '#fff',
  fontSize: 11,
  fontWeight: 800,
  textAlign: 'center',
};
