import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera, Download, SwitchCamera, Frame, RotateCcw, Video, X, ScanLine, CheckCircle,
  ArrowLeftRight, FlipHorizontal, Move, RefreshCcw, RotateCw, Trash2, ZoomIn,
  Image as ImageIcon,
} from 'lucide-react';
import { useApp, type CameraPurpose } from '../../AppContext';
import { useAuthStore } from '../../../store/authStore';
import { useVerifyGateStore, todayKey } from '../../../store/verifyGateStore';
import { BottomNav } from '../BottomNav';
import { createVisitCard, getVisitCards, sharedCardImageUrl } from '../../../lib/visitCardApi';
import { isInWebView, saveImageViaBridge } from '../../../lib/webviewBridge';
import lockedMascot from '../../../assets/feedback/locked.png';
import reusableMascot from '../../../assets/feedback/reusable.png';
import singleMascot from '../../../assets/feedback/single.png';
import guideMascot from '../../../assets/tutorial/mascot-guide.png';
import { FocusBrackets } from '../tutorial/TutorialDemos';
import {
  analyzeImage, confirmLabel, getVerificationHistory, ApiError,
  type AiPrediction, type ContainerLabel, type CertificationMode,
} from '../../../lib/verifyApi';
import lotteFrame from '../../../assets/card-frames/2cutlotte.png';
import doosan2Frame from '../../../assets/card-frames/2cutdoosan.png';
import hanhwa2Frame from '../../../assets/card-frames/2cuthanhwa.png';
import kia2Frame from '../../../assets/card-frames/2cutkia.png';
import kiwoom2Frame from '../../../assets/card-frames/2cutkiwoom.png';
import kt2Frame from '../../../assets/card-frames/2cutkt.png';
import lg2Frame from '../../../assets/card-frames/2cutlg.png';
import nc2Frame from '../../../assets/card-frames/2cutnc.png';
import samsung2Frame from '../../../assets/card-frames/2cutsamsung.png';
import ssg2Frame from '../../../assets/card-frames/2cutssg.png';
import doosanFrame from '../../../assets/card-frames/3cutdoosan.png';
import hanhwa3Frame from '../../../assets/card-frames/3cuthanhwa.png';
import kia3Frame from '../../../assets/card-frames/3cutkia.png';
import kiwoom3Frame from '../../../assets/card-frames/3cutkiwoom.png';
import kt3Frame from '../../../assets/card-frames/3cutkt.png';
import lg3Frame from '../../../assets/card-frames/3cutlg.png';
import lotte3Frame from '../../../assets/card-frames/3cutlotte.png';
import nc3Frame from '../../../assets/card-frames/3cutnc.png';
import samsung3Frame from '../../../assets/card-frames/3cutsamsung.png';
import ssg3Frame from '../../../assets/card-frames/3cutssg.png';
import sticker1Default from '../../../assets/card-frames/1cutdefault.png';
import sticker1Excited from '../../../assets/card-frames/1cutexcited.png';
import sticker1Victory from '../../../assets/card-frames/1cutvictory.png';
import sticker1Defeat from '../../../assets/card-frames/1cutdefeat.png';
import sticker1Frustrated from '../../../assets/card-frames/1cutfrustrated.png';
import sticker1Grumpy from '../../../assets/card-frames/1cutgrumpy.png';
import sticker1Taunt from '../../../assets/card-frames/1cuttaunt.png';

interface CardSlot { x: number; y: number; w: number; h: number }
// 1컷용 감정 캐릭터 스티커 — 여러 개 추가할 수 있고, 각각 드래그/크기/반전/회전 편집.
interface StickerAsset { key: string; label: string; src: string; width: number; height: number }
interface StickerInstance extends StickerAsset {
  id: number;
  x: number;       // 카드 기준 중심 좌표 (0~1)
  y: number;
  scale: number;   // 1 = 카드 폭의 50%
  rotation: number;
  flipped: boolean;
}
interface CardFrame {
  key: string;
  label: string;
  countLabel: string;
  src?: string;          // 프레임 오버레이 (1컷은 오버레이 없이 스티커만 사용)
  width: number;
  height: number;
  bg: string;
  accent: string;
  slots: CardSlot[];
}
const SLOTS_2CUT: CardSlot[] = [
  { x: 77, y: 186, w: 929, h: 801 },
  { x: 77, y: 1053, w: 929, h: 801 },
];
const SLOTS_3CUT: CardSlot[] = [
  { x: 40, y: 41, w: 1000, h: 550 },
  { x: 40, y: 632, w: 1000, h: 550 },
  { x: 40, y: 1223, w: 1000, h: 550 },
];
// 1컷 — 사진이 카드 전체를 채우고, 그 위에 감정 캐릭터 스티커를 얹는다.
// 3:4 세로 — 에디터 영역 비율에 가까워 화면을 거의 꽉 채운다.
const SLOTS_1CUT: CardSlot[] = [
  { x: 0, y: 0, w: 1080, h: 1440 },
];

// 스티커 기본 transform — scale 1 = 카드 폭의 50%
const STICKER_BASE_RATIO = 0.5;
const DEFAULT_STICKER_POS = { x: 0.5, y: 0.72, scale: 1, rotation: 0, flipped: false };

const FRAMES: CardFrame[] = [
  { key: 'lotte-2cut',   label: '롯데 2컷',  countLabel: '2장', src: lotteFrame,    width: 1084, height: 1924, bg: '#fff',    accent: '#C9152E', slots: SLOTS_2CUT },
  { key: 'doosan-2cut',  label: '두산 2컷',  countLabel: '2장', src: doosan2Frame,  width: 1084, height: 1924, bg: '#fff',    accent: '#C9152E', slots: SLOTS_2CUT },
  { key: 'hanhwa-2cut',  label: '한화 2컷',  countLabel: '2장', src: hanhwa2Frame,  width: 1084, height: 1924, bg: '#fff',    accent: '#C9152E', slots: SLOTS_2CUT },
  { key: 'kia-2cut',     label: '기아 2컷',  countLabel: '2장', src: kia2Frame,     width: 1084, height: 1924, bg: '#fff',    accent: '#C9152E', slots: SLOTS_2CUT },
  { key: 'kiwoom-2cut',  label: '키움 2컷',  countLabel: '2장', src: kiwoom2Frame,  width: 1084, height: 1924, bg: '#fff',    accent: '#C9152E', slots: SLOTS_2CUT },
  { key: 'kt-2cut',      label: 'KT 2컷',    countLabel: '2장', src: kt2Frame,      width: 1084, height: 1924, bg: '#fff',    accent: '#C9152E', slots: SLOTS_2CUT },
  { key: 'lg-2cut',      label: 'LG 2컷',    countLabel: '2장', src: lg2Frame,      width: 1084, height: 1924, bg: '#fff',    accent: '#C9152E', slots: SLOTS_2CUT },
  { key: 'nc-2cut',      label: 'NC 2컷',    countLabel: '2장', src: nc2Frame,      width: 1084, height: 1924, bg: '#fff',    accent: '#C9152E', slots: SLOTS_2CUT },
  { key: 'samsung-2cut', label: '삼성 2컷',  countLabel: '2장', src: samsung2Frame, width: 1084, height: 1924, bg: '#fff',    accent: '#C9152E', slots: SLOTS_2CUT },
  { key: 'ssg-2cut',     label: 'SSG 2컷',   countLabel: '2장', src: ssg2Frame,     width: 1084, height: 1924, bg: '#fff',    accent: '#C9152E', slots: SLOTS_2CUT },
  { key: 'doosan-3cut',  label: '두산 3컷',  countLabel: '3장', src: doosanFrame,   width: 1080, height: 1920, bg: '#fff', accent: '#151047', slots: SLOTS_3CUT },
  { key: 'hanhwa-3cut',  label: '한화 3컷',  countLabel: '3장', src: hanhwa3Frame,  width: 1080, height: 1920, bg: '#fff', accent: '#151047', slots: SLOTS_3CUT },
  { key: 'kia-3cut',     label: '기아 3컷',  countLabel: '3장', src: kia3Frame,     width: 1080, height: 1920, bg: '#fff', accent: '#151047', slots: SLOTS_3CUT },
  { key: 'kiwoom-3cut',  label: '키움 3컷',  countLabel: '3장', src: kiwoom3Frame,  width: 1080, height: 1920, bg: '#fff', accent: '#151047', slots: SLOTS_3CUT },
  { key: 'kt-3cut',      label: 'KT 3컷',    countLabel: '3장', src: kt3Frame,      width: 1080, height: 1920, bg: '#fff', accent: '#151047', slots: SLOTS_3CUT },
  { key: 'lg-3cut',      label: 'LG 3컷',    countLabel: '3장', src: lg3Frame,      width: 1080, height: 1920, bg: '#fff', accent: '#151047', slots: SLOTS_3CUT },
  { key: 'lotte-3cut',   label: '롯데 3컷',  countLabel: '3장', src: lotte3Frame,   width: 1080, height: 1920, bg: '#fff', accent: '#151047', slots: SLOTS_3CUT },
  { key: 'nc-3cut',      label: 'NC 3컷',    countLabel: '3장', src: nc3Frame,      width: 1080, height: 1920, bg: '#fff', accent: '#151047', slots: SLOTS_3CUT },
  { key: 'samsung-3cut', label: '삼성 3컷',  countLabel: '3장', src: samsung3Frame, width: 1080, height: 1920, bg: '#fff', accent: '#151047', slots: SLOTS_3CUT },
  { key: 'ssg-3cut',     label: 'SSG 3컷',   countLabel: '3장', src: ssg3Frame,     width: 1080, height: 1920, bg: '#fff', accent: '#151047', slots: SLOTS_3CUT },
  { key: '1cut',         label: '1컷',       countLabel: '1장', width: 1080, height: 1440, bg: '#fff', accent: '#430A21', slots: SLOTS_1CUT },
];

// 1컷 캐릭터 팔레트 — 탭하면 카드에 "추가"된다 (교체 아님, 여러 개 가능)
const STICKER_ASSETS: StickerAsset[] = [
  { key: 'default',    label: '기본', src: sticker1Default,    width: 684, height: 793 },
  { key: 'excited',    label: '설렘', src: sticker1Excited,    width: 453, height: 794 },
  { key: 'victory',    label: '승리', src: sticker1Victory,    width: 688, height: 728 },
  { key: 'defeat',     label: '패배', src: sticker1Defeat,     width: 620, height: 896 },
  { key: 'frustrated', label: '좌절', src: sticker1Frustrated, width: 736, height: 522 },
  { key: 'grumpy',     label: '불만', src: sticker1Grumpy,     width: 451, height: 791 },
  { key: 'taunt',      label: '조롱', src: sticker1Taunt,      width: 988, height: 676 },
];

// 컷 수(슬롯 개수)별 카테고리 — 1컷 프레임이 추가되면 자동으로 탭에 포함된다.
const FRAME_CUTS: number[] = Array.from(new Set(FRAMES.map((f) => f.slots.length))).sort((a, b) => a - b);

const MODES: Array<{ v: CameraPurpose; t: string }> = [
  { v: 'verify', t: '용기인증' },
  { v: 'visit-card', t: '야구네컷' },
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

interface CardPhoto {
  file: File;
  url: string;
  naturalWidth?: number;
  naturalHeight?: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  flipped: boolean;
}
interface CardInput {
  photos: CardPhoto[];
  frame: CardFrame;
  visitN: number;
  stickers?: StickerInstance[];
}

function makeEmptyCardPhotos(frame: CardFrame): Array<CardPhoto | null> {
  return frame.slots.map(() => null);
}

function revokeCardPhoto(photo: CardPhoto | null) {
  if (photo) URL.revokeObjectURL(photo.url);
}

function createCardPhoto(file: File): CardPhoto {
  return {
    file,
    url: URL.createObjectURL(file),
    naturalWidth: undefined,
    naturalHeight: undefined,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    flipped: false,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function drawPhoto(ctx: CanvasRenderingContext2D, image: HTMLImageElement, photo: CardPhoto, slot: CardSlot) {
  const quarterTurn = Math.abs(photo.rotation % 180) === 90;
  const orientedWidth = quarterTurn ? image.height : image.width;
  const orientedHeight = quarterTurn ? image.width : image.height;
  const coverScale = Math.max(slot.w / orientedWidth, slot.h / orientedHeight) * photo.scale;
  const drawW = image.width * coverScale;
  const drawH = image.height * coverScale;

  ctx.save();
  ctx.beginPath();
  ctx.rect(slot.x, slot.y, slot.w, slot.h);
  ctx.clip();
  ctx.translate(
    slot.x + slot.w / 2 + photo.offsetX * slot.w,
    slot.y + slot.h / 2 + photo.offsetY * slot.h,
  );
  ctx.rotate((photo.rotation * Math.PI) / 180);
  ctx.scale(photo.flipped ? -1 : 1, 1);
  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

async function createCardImage(input: CardInput): Promise<File> {
  const none = Promise.resolve<HTMLImageElement | null>(null);
  const stickers = input.stickers ?? [];
  const [frame, ...rest] = await Promise.all([
    input.frame.src ? loadImage(input.frame.src) : none,
    ...input.photos.map((photo) => loadImage(photo.url)),
    ...stickers.map((s) => loadImage(s.src)),
  ]);
  const photos = rest.slice(0, input.photos.length);
  const stickerImages = rest.slice(input.photos.length);
  const canvas = document.createElement('canvas');
  canvas.width = input.frame.width;
  canvas.height = input.frame.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  ctx.fillStyle = input.frame.bg;
  ctx.fillRect(0, 0, input.frame.width, input.frame.height);
  photos.forEach((photo, index) => {
    if (photo) drawPhoto(ctx, photo, input.photos[index], input.frame.slots[index]);
  });
  if (frame) ctx.drawImage(frame, 0, 0, input.frame.width, input.frame.height);
  stickers.forEach((s, index) => {
    const image = stickerImages[index];
    if (!image) return;
    const drawW = input.frame.width * STICKER_BASE_RATIO * s.scale;
    const drawH = drawW * (s.height / s.width);
    ctx.save();
    ctx.translate(s.x * input.frame.width, s.y * input.frame.height);
    ctx.rotate((s.rotation * Math.PI) / 180);
    ctx.scale(s.flipped ? -1 : 1, 1);
    ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  });
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
  const cardPhotosRef = useRef<Array<CardPhoto | null>>([]);
  const cardUrlRef = useRef<string | null>(null);
  const dragRef = useRef<{
    index: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const cardPreviewRef = useRef<HTMLDivElement>(null);
  const stickerDragRef = useRef<{ id: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const stickerIdRef = useRef(0);

  const [view, setView] = useState<View>('camera');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  // 몰입 촬영 모드 — 셔터 첫 탭에 헤더/네비를 접고 뷰파인더 확장, 다시 탭하면 촬영
  const [immersive, setImmersive] = useState(false);
  // 마지막 촬영 직후 — 저장/나가기만 묻는 시트
  const [savePrompt, setSavePrompt] = useState(false);
  const [camError, setCamError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);

  // 직관카드
  const [bottomMode, setBottomMode] = useState<BottomMode>('controls');
  const [frameKey, setFrameKey] = useState<string | null>(null); // 초기값 없음 — 사용자가 직접 선택
  const [frameCut, setFrameCut] = useState<number>(1); // 프레임 선택지에서 보고 있는 컷 카테고리
  const [cardPhotos, setCardPhotos] = useState<Array<CardPhoto | null>>([]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [stickers, setStickers] = useState<StickerInstance[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<number | null>(null);
  const [visitN, setVisitN] = useState(1);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [savedCard, setSavedCard] = useState<{ id: string; shareToken: string } | null>(null);

  // 인증(verify) — 반납 인증 제거, 사용(use) 인증만
  const vMode: CertificationMode = 'use';
  const [vStep, setVStep] = useState<VStep>('idle');
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [ai, setAi] = useState<AiPrediction | null>(null);
  const [label, setLabel] = useState<ContainerLabel>('REUSABLE');
  const [vResult, setVResult] = useState<VResult | null>(null);
  // 일/다회용기 선택 후 감정 피드백 모달
  const [feedback, setFeedback] = useState<ContainerLabel | null>(null);

  // 야구네컷 게이트 — 오늘 용기인증을 했으면(=lastVerifiedDate가 오늘) 해제
  const lastVerifiedDate = useVerifyGateStore((s) => s.lastVerifiedDate);
  const markVerifiedToday = useVerifyGateStore((s) => s.markVerifiedToday);
  const cardUnlocked = lastVerifiedDate === todayKey();

  // 게이트는 서버가 진실 — 다른 브라우저/기기/WebView에서 로그인해도 오늘 인증 이력이 있으면 해제.
  // (localStorage는 클라이언트별이라 이 동기화가 없으면 기기마다 다시 잠긴 것처럼 보인다)
  useEffect(() => {
    if (cardUnlocked) return;
    let cancelled = false;
    getVerificationHistory()
      .then((items) => {
        if (cancelled) return;
        const today = todayKey();
        const doneToday = items.some((it) => {
          if (it.status !== 'CONFIRMED') return false;
          const d = new Date(it.createdAt);
          return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` === today;
        });
        if (doneToday) markVerifiedToday();
      })
      .catch(() => {}); // 실패 시 로컬 게이트 그대로
    return () => { cancelled = true; };
  }, [cardUnlocked, markVerifiedToday]);

  const currentFrame = frameKey ? FRAMES.find((f) => f.key === frameKey) ?? null : null;
  const isCard = cameraPurpose === 'visit-card';
  // 야구네컷은 오늘 용기인증을 해야 사용 가능 (그날 24시까지)
  const cardLocked = isCard && !cardUnlocked;
  const cardPhotoCount = cardPhotos.filter(Boolean).length;
  const isCardComplete = !!currentFrame && cardPhotoCount === currentFrame.slots.length;
  const selectedPhoto = selectedSlotIndex !== null ? cardPhotos[selectedSlotIndex] : null;
  const isOneCut = currentFrame?.slots.length === 1;
  // 첫 빈 슬롯에 라이브 카메라를 보여준다 — 셔터를 누르면 그 슬롯에 담기고 다음 슬롯으로 이동 (네컷 부스 방식)
  const liveSlotIndex = isCard && !camError && currentFrame ? cardPhotos.findIndex((p) => !p) : -1;
  const liveSlot = liveSlotIndex >= 0 ? currentFrame?.slots[liveSlotIndex] ?? null : null;
  const selectedSticker = selectedStickerId !== null ? stickers.find((s) => s.id === selectedStickerId) ?? null : null;
  // 설정 시트 — 열리면 제어부 + 하단 네비 전체를 교체한다
  const activePanel: 'frames' | 'sticker' | 'slot' | 'save' | null =
    !(isCard && view === 'camera' && !cardLocked) ? null
    : bottomMode === 'frames' ? 'frames'
    : selectedSticker ? 'sticker'
    : selectedPhoto && selectedSlotIndex !== null ? 'slot'
    : savePrompt && isCardComplete ? 'save'
    : null;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  // 비디오 엘리먼트가 리마운트(프레임 선택 전/후 등)돼도 스트림을 다시 붙인다
  const attachVideo = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current && node.srcObject !== streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
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

  // 라이브 카메라 — camera 뷰일 때만 (잠긴 야구네컷에서는 카메라를 켜지 않음)
  useEffect(() => {
    if (view !== 'camera') return;
    if (isCard && !cardUnlocked) return;
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
  }, [view, facing, isCard, cardUnlocked]);

  // 카메라 뷰 = 촬영 모드 → BottomNav 선 제거
  useEffect(() => {
    // 카메라 화면에서는 결과 뷰 포함 항상 네비 상단선 제거 (검은선이 간헐적으로 보이던 문제)
    setCaptureMode(true);
    return () => setCaptureMode(false);
  }, [view, setCaptureMode]);

  // 모드 전환 시 카메라로 복귀 + 상태 초기화
  useEffect(() => {
    setView('camera');
    setBottomMode('controls');
    setImmersive(false);
    setSavePrompt(false);
    setFrameKey(null); // 프레임 초기값 없음 — 직접 선택
    setVStep('idle');
    setSampleId(null);
    setAi(null);
    setVResult(null);
    setPhoto((cur) => { if (cur) URL.revokeObjectURL(cur.url); return null; });
    setSelectedSlotIndex(null);
    setStickers([]);
    setSelectedStickerId(null);
    setCardPhotos((cur) => {
      cur.forEach(revokeCardPhoto);
      return [];
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
    let timer: number | null = null;
    setSavedCard(null);
    if (!isCardComplete || !currentFrame) {
      setCardFile(null);
      setCardUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      return () => { cancelled = true; };
    }
    const baseFrame = currentFrame;
    timer = window.setTimeout(() => {
      // 1컷은 화면(프리뷰 영역) 비율 그대로 출력 — 보이는 화면이 곧 카드
      let frame = baseFrame;
      const rect = cardPreviewRef.current?.getBoundingClientRect();
      if (baseFrame.slots.length === 1 && rect && rect.width > 0 && rect.height > 0) {
        const height = Math.round((1080 * rect.height) / rect.width);
        frame = { ...baseFrame, width: 1080, height, slots: [{ x: 0, y: 0, w: 1080, h: height }] };
      }
      createCardImage({
        photos: cardPhotos as CardPhoto[],
        frame,
        visitN,
        stickers: baseFrame.slots.length === 1 ? stickers : undefined,
      })
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
    }, 180);
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [cardPhotos, currentFrame, isCard, isCardComplete, visitN, stickers]);

  useEffect(() => {
    return () => { if (photo) URL.revokeObjectURL(photo.url); };
  }, [photo]);

  const slotCount = currentFrame?.slots.length ?? 0;

  const updateCardPhotos = useCallback((next: Array<CardPhoto | null>) => {
    setCardPhotos(next);
    setSavedCard(null);
    setBottomMode('controls');
    const filled = next.filter(Boolean).length;
    if (filled === slotCount) {
      showToast('카드가 완성됐어요');
    } else {
      showToast(`${filled}/${slotCount}장 선택했어요`);
    }
  }, [slotCount, showToast]);

  const addCardFiles = useCallback((files: File[], opts?: { continuous?: boolean }) => {
    // 프레임 미선택 상태 — 먼저 프레임을 고르게 유도
    if (slotCount === 0) {
      setFrameCut(1);
      setBottomMode('frames');
      showToast('프레임을 먼저 선택해주세요');
      return;
    }
    const images = files.filter((file) => file.type.startsWith('image/'));
    if (images.length === 0) return;
    const next = [...cardPhotos];
    let cursor = next.findIndex((item) => !item);
    if (cursor === -1) cursor = 0;
    let selectedIndex = cursor;
    images.slice(0, slotCount).forEach((file) => {
      const target = cursor % slotCount;
      revokeCardPhoto(next[target]);
      next[target] = createCardPhoto(file);
      selectedIndex = target;
      cursor += 1;
    });
    setSelectedSlotIndex(selectedIndex);
    updateCardPhotos(next);
    const filled = next.filter(Boolean).length;
    if (filled >= slotCount) {
      // 마지막 촬영 — 편집 대신 저장/나가기만 묻는다
      setSelectedSlotIndex(null);
      setSavePrompt(true);
      setImmersive(false);
    } else if (opts?.continuous) {
      setSelectedSlotIndex(null); // 몰입 연속 촬영 — 시트 없이 다음 슬롯
    }
  }, [cardPhotos, slotCount, updateCardPhotos, showToast]);

  const replaceCardSlot = useCallback((index: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const next = [...cardPhotos];
    revokeCardPhoto(next[index]);
    next[index] = createCardPhoto(file);
    setSelectedSlotIndex(index);
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
    setSelectedStickerId(null); // 스티커들은 유지 — 프레임을 오가도 배치가 그대로
    setSelectedSlotIndex((index) => (index !== null && index < frame.slots.length ? index : null));
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
      return currentFrame ? makeEmptyCardPhotos(currentFrame) : [];
    });
    setSelectedSlotIndex(null);
    setSavePrompt(false);
    setStickers([]);
    setSelectedStickerId(null);
    setCardFile(null);
    setCardUrl((cur) => { if (cur) URL.revokeObjectURL(cur); return null; });
    setSavedCard(null);
  };

  const updateCardPhotoEdit = useCallback((index: number, updater: (photo: CardPhoto) => CardPhoto) => {
    setCardPhotos((cur) => {
      const current = cur[index];
      if (!current) return cur;
      const next = [...cur];
      next[index] = updater(current);
      return next;
    });
    setSavedCard(null);
  }, []);

  const handleSlotClick = (index: number) => {
    setSelectedStickerId(null);
    if (cardPhotos[index]) {
      setSelectedSlotIndex(index);
      setBottomMode('controls');
      return;
    }
    setSelectedSlotIndex(index);
    slotInputRefs.current[index]?.click();
  };

  // 스티커가 카드(프레임) 밖으로 나가지 않게 — 크기/회전을 반영해 중심 좌표를 클램프
  const clampStickerBounds = useCallback((s: StickerInstance): StickerInstance => {
    const rect = cardPreviewRef.current?.getBoundingClientRect();
    const cardRatio = rect && rect.height > 0
      ? rect.width / rect.height
      : (currentFrame ? currentFrame.width / currentFrame.height : 1080 / 1440);
    const ar = s.height / s.width;                      // 스티커 원본 세로/가로
    const quarter = Math.abs(s.rotation % 180) === 90;  // 90/270도 회전이면 가로세로 교체
    const wFrac = STICKER_BASE_RATIO * s.scale;         // 카드 폭 대비 스티커 폭
    const halfW = (quarter ? wFrac * ar : wFrac) / 2;
    const halfH = ((quarter ? wFrac : wFrac * ar) * cardRatio) / 2;
    return {
      ...s,
      x: clamp(s.x, Math.min(halfW, 0.5), Math.max(1 - halfW, 0.5)),
      y: clamp(s.y, Math.min(halfH, 0.5), Math.max(1 - halfH, 0.5)),
    };
  }, [currentFrame]);

  // 캐릭터 스티커 — 팔레트에서 "추가" (교체 아님), 드래그로 이동, 탭으로 편집 패널
  const updateSticker = useCallback((id: number, updater: (s: StickerInstance) => StickerInstance) => {
    setStickers((cur) => cur.map((s) => (s.id === id ? clampStickerBounds(updater(s)) : s)));
    setSavedCard(null);
  }, [clampStickerBounds]);

  const addSticker = (asset: StickerAsset) => {
    // 1컷 프레임이 아니면 1컷으로 전환 (첫 슬롯 사진은 유지됨)
    if (!isOneCut) {
      const oneCutFrame = FRAMES.find((f) => f.slots.length === 1);
      if (oneCutFrame) selectCardFrame(oneCutFrame);
    }
    const id = ++stickerIdRef.current;
    setStickers((cur) => [...cur, clampStickerBounds({
      ...asset,
      id,
      ...DEFAULT_STICKER_POS,
      // 추가할 때마다 살짝 어긋나게 — 같은 자리에 겹쳐 안 보이는 것 방지
      x: DEFAULT_STICKER_POS.x + (cur.length % 3 - 1) * 0.12,
    })]);
    // 기본값은 편집 시트를 띄우지 않는다 — 캐릭터를 탭하면 그때 편집
    setSelectedStickerId(null);
    setSelectedSlotIndex(null);
    setSavedCard(null);
    setBottomMode('controls');
    showToast(`${asset.label} 캐릭터를 추가했어요`);
  };

  const removeSticker = (id: number) => {
    setStickers((cur) => cur.filter((s) => s.id !== id));
    setSelectedStickerId((cur) => (cur === id ? null : cur));
    setSavedCard(null);
  };

  const handleStickerPointerDown = (id: number, event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const sticker = stickers.find((s) => s.id === id);
    if (!sticker) return;
    setSelectedStickerId(id);
    setSelectedSlotIndex(null);
    setBottomMode('controls');
    stickerDragRef.current = { id, startX: event.clientX, startY: event.clientY, x: sticker.x, y: sticker.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleStickerPointerMove = (id: number, event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = stickerDragRef.current;
    if (!drag || drag.id !== id) return;
    const rect = cardPreviewRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const dx = (event.clientX - drag.startX) / rect.width;
    const dy = (event.clientY - drag.startY) / rect.height;
    updateSticker(id, (s) => ({ ...s, x: drag.x + dx, y: drag.y + dy })); // 경계 클램프는 updateSticker가 처리
  };

  const handleStickerPointerEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    stickerDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleSlotPointerDown = (index: number, event: React.PointerEvent<HTMLButtonElement>) => {
    const slotPhoto = cardPhotos[index];
    if (!slotPhoto) return;
    setSelectedSlotIndex(index);
    dragRef.current = {
      index,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: slotPhoto.offsetX,
      offsetY: slotPhoto.offsetY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSlotPointerMove = (index: number, event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.index !== index) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dx = (event.clientX - drag.startX) / rect.width;
    const dy = (event.clientY - drag.startY) / rect.height;
    updateCardPhotoEdit(index, (item) => ({
      ...item,
      offsetX: clamp(drag.offsetX + dx, -0.9, 0.9),
      offsetY: clamp(drag.offsetY + dy, -0.9, 0.9),
    }));
  };

  const handleSlotPointerEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const updateSelectedPhoto = (updater: (photo: CardPhoto) => CardPhoto) => {
    if (selectedSlotIndex === null || !cardPhotos[selectedSlotIndex]) return;
    updateCardPhotoEdit(selectedSlotIndex, updater);
  };

  const resetSelectedPhoto = () => {
    updateSelectedPhoto((item) => ({
      ...item,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      flipped: false,
    }));
  };

  const swapSelectedSlot = (targetIndex: number) => {
    if (selectedSlotIndex === null || selectedSlotIndex === targetIndex || !cardPhotos[selectedSlotIndex]) return;
    setCardPhotos((cur) => {
      const next = [...cur];
      [next[selectedSlotIndex], next[targetIndex]] = [next[targetIndex], next[selectedSlotIndex]];
      return next;
    });
    setSelectedSlotIndex(targetIndex);
    setSavedCard(null);
    showToast(`${targetIndex + 1}번 슬롯으로 옮겼어요`);
  };

  const updateCardPhotoSize = useCallback((index: number, naturalWidth: number, naturalHeight: number) => {
    if (naturalWidth <= 0 || naturalHeight <= 0) return;
    setCardPhotos((cur) => {
      const current = cur[index];
      if (!current || (current.naturalWidth === naturalWidth && current.naturalHeight === naturalHeight)) return cur;
      const next = [...cur];
      next[index] = { ...current, naturalWidth, naturalHeight };
      return next;
    });
  }, []);

  // 1컷은 출력 비율이 화면(프리뷰 영역) 실측 — cover 계산도 같은 비율을 써야 여백이 안 생긴다
  const effectiveSlot = (slot: CardSlot): CardSlot => {
    if (!isOneCut) return slot;
    const rect = cardPreviewRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return slot;
    return { x: 0, y: 0, w: 1080, h: Math.round((1080 * rect.height) / rect.width) };
  };

  const getPhotoPreviewStyle = (photoItem: CardPhoto, slot: CardSlot): React.CSSProperties => {
    if (!photoItem.naturalWidth || !photoItem.naturalHeight) {
      return {
        ...cardSlotImageStyle,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      };
    }

    const quarterTurn = Math.abs(photoItem.rotation % 180) === 90;
    const orientedWidth = quarterTurn ? photoItem.naturalHeight : photoItem.naturalWidth;
    const orientedHeight = quarterTurn ? photoItem.naturalWidth : photoItem.naturalHeight;
    const coverScale = Math.max(slot.w / orientedWidth, slot.h / orientedHeight) * photoItem.scale;
    const previewWidth = (photoItem.naturalWidth * coverScale) / slot.w;

    return {
      ...cardSlotImageStyle,
      position: 'absolute',
      left: `${50 + photoItem.offsetX * 100}%`,
      top: `${50 + photoItem.offsetY * 100}%`,
      width: `${previewWidth * 100}%`,
      height: 'auto',
      maxWidth: 'none',
      maxHeight: 'none',
      objectFit: 'contain',
      transform: `translate(-50%, -50%) rotate(${photoItem.rotation}deg) scaleX(${photoItem.flipped ? -1 : 1})`,
    };
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
        addCardFiles([file], { continuous: immersive });
        return;
      }
      const url = URL.createObjectURL(file);
      setPhoto((cur) => { if (cur) URL.revokeObjectURL(cur.url); return { file, url }; });
      setImmersive(false); // 촬영 완료 — 몰입 모드 해제 (AI 인증 버튼 노출)
      setBottomMode('controls');
      setVStep('idle');
      setSampleId(null);
      setAi(null);
      setVResult(null);
      setView('camera'); // 결과 화면으로 점프하지 않고 카메라 UI 유지
    }, 'image/png');
  }, [addCardFiles, facing, cameraPurpose, immersive]);

  // 셔터: 첫 탭 → 몰입 촬영 모드(헤더/네비 접힘 + 뷰파인더 확장), 몰입 중 탭 → 실제 촬영
  const handleShutter = () => {
    if (camError) return;
    if (!immersive) {
      if (isCard && !currentFrame) {
        setFrameCut(1);
        setBottomMode('frames');
        showToast('프레임을 먼저 선택해주세요');
        return;
      }
      setSelectedSlotIndex(null);
      setSelectedStickerId(null);
      setBottomMode('controls');
      setImmersive(true);
      return;
    }
    capture();
  };

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
      setView('camera'); // 카메라 UI 유지 (사진 미리보기 + AI 인증/다시)
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
    const filename = `야구네컷_${visitN}.png`;
    // 다운로드는 사용자 제스처 체인 안에서 즉시 트리거해야 한다 —
    // 서버 저장(ensureSaved)을 먼저 await하면 Safari가 제스처 만료로 차단함.
    let iosTab = false;
    let bridged = false;
    if (isInWebView()) {
      // WebView: a[download] 미동작 → 네이티브 저장 브릿지
      try { bridged = await saveImageViaBridge(cardUrl, filename); } catch { bridged = false; }
    }
    // 카톡 등 인앱 브라우저: blob 다운로드/새 탭 모두 막힘 → 서버 공개 이미지 URL로 이동해 길게 저장
    if (!bridged && /KAKAOTALK|Instagram|FBAN|FBAV|Line\//i.test(navigator.userAgent)) {
      try {
        const rec = await ensureSaved();
        if (rec) {
          showToast('이미지를 길게 눌러 사진에 저장하세요');
          window.location.href = sharedCardImageUrl(rec.shareToken);
          setBusy(false);
          return;
        }
      } catch { /* 서버 저장 실패 — 아래 일반 경로로 폴백 */ }
    }
    if (!bridged) {
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        // iOS WebKit(사파리/크롬/인앱 전부)은 a[download]를 무시 → 새 탭에서 길게 눌러 저장
        const tab = window.open(cardUrl, '_blank');
        if (!tab) window.location.href = cardUrl; // 팝업 차단 폴백
        iosTab = true;
      } else {
        const a = document.createElement('a');
        a.href = cardUrl;
        a.download = filename;
        document.body.appendChild(a); // Firefox: DOM에 없으면 click 무시
        a.click();
        a.remove();
      }
    }
    let saved = true;
    try { await ensureSaved(); } catch { saved = false; }
    showToast(iosTab
      ? '이미지를 길게 눌러 사진에 저장하세요'
      : saved ? '저장했어요' : '내려받았어요 (기록 저장 실패)');
    setSavePrompt(false);
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
    setView('result'); // AI 인증을 누르면 결과(라벨 선택) 화면으로 이동
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
      // 용기인증 완료 → 그날 24시까지 야구네컷 잠금 해제
      markVerifiedToday();
      if (res.scored) {
        addCertification(vMode);
        setVResult({ tone: 'success', title: '인증 완료', reason: ai ? `${detected} · AI ${ai.confidence.toFixed(1)}%` : detected });
      } else if (res.reason === 'SINGLE_USE_LABEL') {
        setVResult({ tone: 'neutral', title: '일회용기로 기록', reason: '학습 데이터로 저장했어요.' });
      } else {
        setVResult({ tone: 'neutral', title: '인증 기록 완료', reason: detected });
      }
      // 사용자가 고른 용기 종류에 따라 감정 피드백 모달 표시
      setFeedback(label);
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
      onClick={handleShutter}
      disabled={camError}
      aria-label="촬영"
      style={{
        width: 64, height: 64, borderRadius: '9999px', border: '2px solid #430A21',
        background: camError ? '#CBD5E1' : 'var(--cb-primary)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        cursor: camError ? 'not-allowed' : 'pointer',
        boxShadow: 'none',
      }}
    >
      <Camera size={26} strokeWidth={2.4} />
    </button>
  );

  const cardEditor = !currentFrame ? (
    // 프레임 미선택 — 라이브 카메라만 풀로 보여주고 프레임 선택을 유도
    <div style={{ ...cardEditorShellStyle, padding: 0 }}>
      {!camError ? (
        <video
          ref={attachVideo}
          autoPlay
          muted
          playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: facing === 'user' ? 'scaleX(-1)' : 'none' }}
        />
      ) : (
        <p style={cardCameraHintStyle}>카메라를 열 수 없어요. 프레임을 선택하고 사진을 추가해 주세요.</p>
      )}
      <button
        type="button"
        className="cb-no-press"
        onClick={() => { setFrameCut(1); setBottomMode('frames'); }}
        style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 2,
          border: '2px solid #430A21', borderRadius: 9999, background: 'rgba(255,255,255,0.94)',
          color: '#430A21', fontSize: 13, fontWeight: 800, padding: '10px 18px',
          cursor: 'pointer', boxShadow: '0 2px 0 0 #430A21', whiteSpace: 'nowrap',
        }}
      >
        프레임을 선택해 시작하세요
      </button>
    </div>
  ) : (
    <div style={{ ...cardEditorShellStyle, ...(isOneCut ? { padding: 0 } : null) }}>
      <div
        ref={cardPreviewRef}
        style={{
          ...cardFramePreviewStyle,
          // 1컷: 화면 영역을 100% 채움 — 결과물 비율을 화면 비율로 동적으로 맞춰 WYSIWYG 유지
          // 2컷/3컷: 카드 전체가 한 화면에 담기는 contain
          ...(isOneCut
            ? { width: '100%', height: '100%' }
            : {
                height: `min(100%, ${(currentFrame.height / currentFrame.width) * 100}cqw)`,
                aspectRatio: `${currentFrame.width} / ${currentFrame.height}`,
              }),
          background: currentFrame.bg,
        }}
      >
        {/* 카드 모드 공용 비디오 — 첫 빈 슬롯 위치에 라이브 프리뷰, 슬롯이 다 차면 촬영용으로만 유지 */}
        {!camError && (
          <video
            ref={attachVideo}
            autoPlay
            muted
            playsInline
            style={liveSlot ? {
              position: 'absolute',
              left: `${(liveSlot.x / currentFrame.width) * 100}%`,
              top: `${(liveSlot.y / currentFrame.height) * 100}%`,
              width: `${(liveSlot.w / currentFrame.width) * 100}%`,
              height: `${(liveSlot.h / currentFrame.height) * 100}%`,
              objectFit: 'cover', display: 'block', zIndex: 0,
              transform: facing === 'user' ? 'scaleX(-1)' : 'none',
            } : { position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          />
        )}
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
                className="cb-no-press"
                onClick={() => handleSlotClick(index)}
                onPointerDown={(e) => handleSlotPointerDown(index, e)}
                onPointerMove={(e) => handleSlotPointerMove(index, e)}
                onPointerUp={handleSlotPointerEnd}
                onPointerCancel={handleSlotPointerEnd}
                aria-label={`${index + 1}번째 사진 ${slotPhoto ? '편집' : '선택'}`}
                style={{
                  ...cardSlotButtonStyle,
                  background: index === liveSlotIndex ? 'transparent' : cardSlotButtonStyle.background,
                  touchAction: slotPhoto ? 'none' : 'manipulation',
                }}
              >
                {slotPhoto ? (
                  <img
                    className="cb-photo"
                    src={slotPhoto.url}
                    alt=""
                    onLoad={(e) => updateCardPhotoSize(index, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                    style={getPhotoPreviewStyle(slotPhoto, effectiveSlot(slot))}
                  />
                ) : index === liveSlotIndex ? null : (
                  <span style={cardSlotEmptyStyle}>
                    <ImageIcon size={22} strokeWidth={2.4} />
                    <span>{index + 1}</span>
                  </span>
                )}
              </button>
            </div>
          );
        })}
        {currentFrame.src && <img src={currentFrame.src} alt="" style={cardFrameOverlayStyle} />}
        {isOneCut && stickers.map((s) => (
          <button
            key={s.id}
            type="button"
            className="cb-no-press"
            aria-label={`${s.label} 캐릭터 이동 · 편집`}
            onPointerDown={(e) => handleStickerPointerDown(s.id, e)}
            onPointerMove={(e) => handleStickerPointerMove(s.id, e)}
            onPointerUp={handleStickerPointerEnd}
            onPointerCancel={handleStickerPointerEnd}
            style={{
              ...stickerButtonStyle,
              left: `${s.x * 100}%`,
              top: `${s.y * 100}%`,
              width: `${STICKER_BASE_RATIO * s.scale * 100}%`,
              borderColor: selectedStickerId === s.id ? 'rgba(255,255,255,0.85)' : 'transparent',
            }}
          >
            <img
              src={s.src}
              alt=""
              draggable={false}
              style={{
                width: '100%', height: 'auto', display: 'block', pointerEvents: 'none',
                transform: `rotate(${s.rotation}deg) scaleX(${s.flipped ? -1 : 1})`,
              }}
            />
          </button>
        ))}
        {selectedSlotIndex !== null && cardPhotos[selectedSlotIndex] && currentFrame.slots[selectedSlotIndex] && (
          <div
            aria-hidden
            style={{
              ...cardSelectedSlotStyle,
              left: `${(currentFrame.slots[selectedSlotIndex].x / currentFrame.width) * 100}%`,
              top: `${(currentFrame.slots[selectedSlotIndex].y / currentFrame.height) * 100}%`,
              width: `${(currentFrame.slots[selectedSlotIndex].w / currentFrame.width) * 100}%`,
              height: `${(currentFrame.slots[selectedSlotIndex].h / currentFrame.height) * 100}%`,
            }}
          />
        )}
      </div>
      {camError && (
        <p style={cardCameraHintStyle}>카메라를 열 수 없어요. 슬롯을 눌러 사진을 선택해 주세요.</p>
      )}
    </div>
  );

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <input ref={fileInputRef} type="file" accept="image/*" multiple={isCard} capture={isCard ? undefined : 'environment'} onChange={handleFileChange} style={{ display: 'none' }} aria-hidden tabIndex={-1} />

      {/* 헤더 — 몰입 촬영 모드에서는 부드럽게 접힌다 */}
      <div style={{
        flexShrink: 0, background: '#fff', display: 'flex', alignItems: 'center', gap: 8,
        padding: immersive ? '0 12px' : '10px 12px 10px',
        maxHeight: immersive ? 0 : 72,
        opacity: immersive ? 0 : 1,
        overflow: 'hidden',
        pointerEvents: immersive ? 'none' : 'auto',
        transition: 'max-height 260ms ease, opacity 200ms ease, padding 260ms ease',
      }}>
        <div style={{ width: 32, flexShrink: 0 }} aria-hidden />
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
            style={{ width: 32, height: 32, flexShrink: 0, border: '2px solid #430A21', borderRadius: 9999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <SwitchCamera size={19} color="#430A21" strokeWidth={2.4} />
          </button>
        ) : (
          <div style={{ width: 32, flexShrink: 0 }} aria-hidden />
        )}
      </div>

      {/* ── 야구네컷 잠금 화면 (오늘 용기인증 전) ── */}
      {cardLocked && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 28px', gap: 16, background: '#fff' }}>
          <img src={lockedMascot} alt="" aria-hidden="true" style={{ width: '62%', maxWidth: 230, height: 'auto' }} />
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#430A21' }}>용기 인증 후에 이용 가능해요</p>
          <button type="button" onClick={() => setCameraPurpose('verify')}
            style={{ marginTop: 4, border: '2px solid #430A21', borderRadius: 16, background: 'var(--cb-primary)', color: '#fff', padding: '14px 28px', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 3px 0 0 #430A21, 0 4px 8px rgba(200,92,119,0.32)' }}>
            용기 인증하러 가기
          </button>
        </div>
      )}

      {/* ── 카메라 뷰 ── */}
      {view === 'camera' && !cardLocked && (
        <>
	          {/* 풀블리드 뷰파인더 — 영역 전체를 촬영 화면으로 */}
	          <div style={{ flex: 1, minHeight: 0, containerType: 'size', position: 'relative', overflow: 'hidden' }}>
	            {immersive && (
	              <>
	                <button
	                  type="button"
	                  onClick={() => setImmersive(false)}
	                  aria-label="촬영 모드 닫기"
	                  style={{
	                    position: 'absolute', top: 'calc(12px + env(safe-area-inset-top, 0px))', right: 12, zIndex: 6,
	                    width: 34, height: 34, border: '2px solid #430A21', borderRadius: 9999,
	                    background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center',
	                    justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 0 0 #430A21',
	                  }}
	                >
	                  <X size={18} color="#430A21" strokeWidth={2.6} />
	                </button>
	                {/* 네이티브 카메라처럼 — 셔터가 영상 위에 떠 있다 */}
	                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', display: 'flex', justifyContent: 'center', zIndex: 6 }}>
	                  {captureBtn}
	                </div>
	              </>
	            )}
	            {isCard ? (
	              cardEditor
	            ) : camError && !photo ? (
	              <div style={{ position: 'absolute', inset: 0, background: '#430A21', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, textAlign: 'center', color: '#fff' }}>
	                <Camera size={30} strokeWidth={2.2} />
	                <p style={{ fontSize: 12, fontWeight: 700, margin: 0, lineHeight: 1.5 }}>카메라를 열 수 없어요.<br />권한을 허용하거나 사진을 선택해 주세요.</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} style={{ border: '2px solid #fff', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 800, padding: '10px 16px', cursor: 'pointer' }}>사진 선택</button>
              </div>
	            ) : (
	              <>
                {!camError && (
                  <video ref={attachVideo} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: facing === 'user' ? 'scaleX(-1)' : 'none' }} />
                )}
                {/* 촬영한 사진을 뷰파인더 위에 고정 표시 (라이브 스트림 유지) */}
                {photo && (
                  <img className="cb-photo" src={photo.url} alt="촬영한 용기" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#fff' }} />
                )}
              </>
	            )}
	          </div>

          {/* 하단 — 기본: 제어부(+네비). 설정 시트가 열리면 제어부와 네비를 통째로 교체 */}
            {activePanel === 'frames' && !immersive && (
              <div style={{ ...settingsSheetStyle, gap: 6 }}>
                {/* 한 줄 헤더 — 프레임 라벨 + 컷 탭 + 닫기 (세로 공간 절약) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#430A21', flexShrink: 0 }}>프레임</span>
                  <div style={{ display: 'flex', gap: 5, flex: 1 }}>
                    {FRAME_CUTS.map((cut) => {
                      const on = frameCut === cut;
                      return (
                        <button key={cut} type="button" onClick={() => setFrameCut(cut)} aria-pressed={on}
                          style={{ padding: '4px 12px', border: '2px solid #430A21', borderRadius: 9999, fontSize: 11, fontWeight: 800, cursor: 'pointer', background: on ? 'var(--cb-primary)' : '#fff', color: on ? '#fff' : '#430A21', boxShadow: on ? '0 2px 0 0 #430A21' : 'none' }}>
                          {cut}컷
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" onClick={() => setBottomMode('controls')} aria-label="프레임 닫기" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                    <X size={18} color="#430A21" strokeWidth={2.6} />
                  </button>
                </div>
                {frameCut === 1 ? (
                  // 1컷 — 캐릭터 팔레트: 탭하면 카드에 추가 (여러 개 가능)
                  <div className="hide-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 2 }}>
                    {STICKER_ASSETS.map((asset) => (
                      <button key={asset.key} type="button" onClick={() => addSticker(asset)}
                        aria-label={`${asset.label} 캐릭터 추가`}
                        style={{ flexShrink: 0, scrollSnapAlign: 'center', width: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 4px', border: '2px solid #430A21', borderRadius: 12, background: '#fff', boxShadow: '0 2px 0 0 #430A21', cursor: 'pointer' }}>
                        <span style={{ width: 40, height: 40, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={asset.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#430A21', whiteSpace: 'nowrap' }}>{asset.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="hide-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 2 }}>
                    {FRAMES.filter((f) => f.slots.length === frameCut).map((f) => {
                      const active = frameKey === f.key;
                      return (
                        <button key={f.key} type="button" onClick={() => selectCardFrame(f)} aria-pressed={active}
                          style={{ flexShrink: 0, scrollSnapAlign: 'center', width: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 4px', border: active ? `2px solid ${f.accent}` : '2px solid #430A21', borderRadius: 12, background: active ? 'var(--cb-primary-soft)' : '#fff', boxShadow: active ? `0 3px 0 0 ${f.accent}` : '0 2px 0 0 #430A21', cursor: 'pointer' }}>
                          <span style={{ width: 24, height: 40, border: '1px solid #430A21', background: f.bg, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={f.src ?? sticker1Default} alt="" style={{ width: '100%', height: '100%', objectFit: f.src ? 'cover' : 'contain', display: 'block' }} />
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 800, color: active ? 'var(--cb-primary-deep)' : '#430A21', whiteSpace: 'nowrap' }}>{f.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {activePanel === 'sticker' && !immersive && selectedSticker && (
              <div style={settingsSheetStyle}>
                <div style={cardToolPanelStyle}>
                  <div style={cardToolHeaderStyle}>
                    <span style={cardToolTitleStyle}>
                      <Move size={15} strokeWidth={2.5} />
                      {selectedSticker.label} 캐릭터 — 드래그로 이동
                    </span>
                    <button type="button" onClick={() => setSelectedStickerId(null)} aria-label="캐릭터 편집 닫기" style={iconOnlyButtonStyle}>
                      <X size={17} color="#430A21" strokeWidth={2.6} />
                    </button>
                  </div>

                  <div style={zoomControlStyle}>
                    <ZoomIn size={17} color="#430A21" strokeWidth={2.6} />
                    <input
                      type="range"
                      min={0.4}
                      max={2.4}
                      step={0.05}
                      value={selectedSticker.scale}
                      onChange={(e) => {
                        const scale = Number(e.currentTarget.value);
                        updateSticker(selectedSticker.id, (s) => ({ ...s, scale }));
                      }}
                      aria-label="캐릭터 크기"
                      style={zoomSliderStyle}
                    />
                    <span style={zoomValueStyle}>{Math.round(selectedSticker.scale * 100)}%</span>
                  </div>

                  <div style={cardToolScrollerStyle}>
                    <button type="button" onClick={() => { setFrameCut(1); setBottomMode('frames'); }} aria-label="캐릭터 더 추가" style={cardToolButtonStyle}>
                      <Frame size={18} strokeWidth={2.4} />
                      <span>추가</span>
                    </button>
                    <button type="button" onClick={() => updateSticker(selectedSticker.id, (s) => ({ ...s, flipped: !s.flipped }))} aria-label="캐릭터 좌우 반전" style={cardToolButtonStyle}>
                      <FlipHorizontal size={18} strokeWidth={2.4} />
                      <span>반전</span>
                    </button>
                    <button type="button" onClick={() => updateSticker(selectedSticker.id, (s) => ({ ...s, rotation: (s.rotation + 90) % 360 }))} aria-label="캐릭터 90도 회전" style={cardToolButtonStyle}>
                      <RotateCw size={18} strokeWidth={2.4} />
                      <span>90도</span>
                    </button>
                    <button type="button" onClick={() => updateSticker(selectedSticker.id, (s) => ({ ...s, ...DEFAULT_STICKER_POS }))} aria-label="캐릭터 편집 초기화" style={cardToolButtonStyle}>
                      <RefreshCcw size={18} strokeWidth={2.4} />
                      <span>리셋</span>
                    </button>
                    <button type="button" onClick={() => removeSticker(selectedSticker.id)} aria-label="캐릭터 삭제" style={cardToolButtonStyle}>
                      <Trash2 size={18} strokeWidth={2.4} />
                      <span>삭제</span>
                    </button>
                  </div>

                  {isCardComplete && (
                    <button type="button" onClick={handleDownload} disabled={!cardUrl || busy}
                      style={{ ...cardSaveButtonStyle, background: !cardUrl || busy ? '#CBD5E1' : 'var(--cb-primary)', cursor: cardUrl && !busy ? 'pointer' : 'not-allowed' }}>
                      <Download size={17} strokeWidth={2.6} />
                      {busy ? '저장 중' : cardUrl ? '저장' : '카드 생성 중'}
                    </button>
                  )}
                </div>
              </div>
            )}
            {activePanel === 'slot' && !immersive && selectedPhoto && selectedSlotIndex !== null && (
              <div style={settingsSheetStyle}>
                <div style={cardToolPanelStyle}>
                  <div style={cardToolHeaderStyle}>
                    <span style={cardToolTitleStyle}>
                      <Move size={15} strokeWidth={2.5} />
                      위치 · {selectedSlotIndex + 1}번 슬롯
                    </span>
                    <button type="button" onClick={() => setSelectedSlotIndex(null)} aria-label="편집 닫기" style={iconOnlyButtonStyle}>
                      <X size={17} color="#430A21" strokeWidth={2.6} />
                    </button>
                  </div>

                  <div style={zoomControlStyle}>
                    <ZoomIn size={17} color="#430A21" strokeWidth={2.6} />
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={selectedPhoto.scale}
                      onChange={(e) => {
                        const scale = Number(e.currentTarget.value);
                        updateSelectedPhoto((item) => ({ ...item, scale }));
                      }}
                      aria-label="확대"
                      style={zoomSliderStyle}
                    />
                    <span style={zoomValueStyle}>{Math.round(selectedPhoto.scale * 100)}%</span>
                  </div>

                  <div style={cardToolScrollerStyle}>
                    <button type="button" onClick={() => slotInputRefs.current[selectedSlotIndex]?.click()} aria-label="사진 바꾸기" style={cardToolButtonStyle}>
                      <ImageIcon size={18} strokeWidth={2.4} />
                      <span>바꾸기</span>
                    </button>
                    <button type="button" onClick={() => updateSelectedPhoto((item) => ({ ...item, rotation: (item.rotation + 90) % 360 }))} aria-label="90도 회전" style={cardToolButtonStyle}>
                      <RotateCw size={18} strokeWidth={2.4} />
                      <span>90도</span>
                    </button>
                    <button type="button" onClick={() => updateSelectedPhoto((item) => ({ ...item, flipped: !item.flipped }))} aria-label="좌우 반전" style={cardToolButtonStyle}>
                      <FlipHorizontal size={18} strokeWidth={2.4} />
                      <span>반전</span>
                    </button>
                    <button type="button" onClick={resetSelectedPhoto} aria-label="사진 편집 초기화" style={cardToolButtonStyle}>
                      <RefreshCcw size={18} strokeWidth={2.4} />
                      <span>리셋</span>
                    </button>
                    <button type="button" onClick={() => { clearCard(); showToast('전체 초기화했어요'); }} aria-label="전체 초기화" style={cardToolButtonStyle}>
                      <Trash2 size={18} strokeWidth={2.4} />
                      <span>초기화</span>
                    </button>
                  </div>

                  <div style={slotSwapRowStyle}>
                    <span style={slotSwapLabelStyle}>
                      <ArrowLeftRight size={15} strokeWidth={2.5} />
                      슬롯 교체
                    </span>
                    <div style={slotSwapButtonsStyle}>
                      {(currentFrame?.slots ?? []).map((_, index) => (
                        index === selectedSlotIndex ? null : (
                          <button
                            key={index}
                            type="button"
                            onClick={() => swapSelectedSlot(index)}
                            aria-label={`${index + 1}번 슬롯과 교체`}
                            style={slotSwapButtonStyle}
                          >
                            {index + 1}
                          </button>
                        )
                      ))}
                    </div>
                  </div>

                  {isCardComplete && (
                    <button type="button" onClick={handleDownload} disabled={!cardUrl || busy}
                      style={{ ...cardSaveButtonStyle, background: !cardUrl || busy ? '#CBD5E1' : 'var(--cb-primary)', cursor: cardUrl && !busy ? 'pointer' : 'not-allowed' }}>
                      <Download size={17} strokeWidth={2.6} />
                      {busy ? '저장 중' : cardUrl ? '저장' : '카드 생성 중'}
                    </button>
                  )}
                </div>
              </div>
            )}
            {activePanel === 'save' && (
              // 마지막 촬영 직후 — 저장 또는 나가기만
              <div style={settingsSheetStyle}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => { clearCard(); showToast('저장하지 않고 나왔어요'); }}
                    style={{ flex: 1, height: 48, border: '2px solid #430A21', borderRadius: 14, background: '#fff', color: '#430A21', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 0 0 #430A21' }}>
                    나가기
                  </button>
                  <button type="button" onClick={handleDownload} disabled={!cardUrl || busy}
                    style={{ ...cardSaveButtonStyle, flex: 2, height: 48, background: !cardUrl || busy ? '#CBD5E1' : 'var(--cb-primary)', cursor: cardUrl && !busy ? 'pointer' : 'not-allowed' }}>
                    <Download size={17} strokeWidth={2.6} />
                    {busy ? '저장 중' : cardUrl ? '저장' : '카드 생성 중'}
                  </button>
                </div>
              </div>
            )}
            {!activePanel && !immersive && (
            <div style={{ flexShrink: 0, background: '#fff', padding: '6px 0 4px' }}>
            {isCard ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--cb-primary-deep)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ImageIcon size={14} strokeWidth={2.4} /> 사진 {cardPhotoCount}/{currentFrame ? currentFrame.slots.length : '-'}
                    </span>
                    <button type="button" onClick={() => showToast('2초 비디오는 준비 중이에요')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontSize: 13, fontWeight: 700, color: '#B59CA3', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Video size={14} strokeWidth={2.4} /> 비디오
                    </button>
                    {cardPhotoCount > 0 && (
                      <button type="button" onClick={() => { clearCard(); showToast('전체 초기화했어요'); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontSize: 13, fontWeight: 700, color: '#8C6B73', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Trash2 size={14} strokeWidth={2.4} /> 초기화
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
                    <button type="button" onClick={() => { setFrameCut(currentFrame?.slots.length ?? 1); setBottomMode((m) => (m === 'frames' ? 'controls' : 'frames')); }} aria-label="프레임" aria-pressed={bottomMode === 'frames'} style={ctrlSquareStyle}>
                      <Frame size={20} color="#430A21" strokeWidth={2.4} />
                      <span style={ctrlLabelStyle}>프레임</span>
                    </button>
                    {captureBtn}
                    <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="사진 선택" style={ctrlSquareStyle}>
                      <ImageIcon size={20} color="#430A21" strokeWidth={2.4} />
                      <span style={ctrlLabelStyle}>사진</span>
                    </button>
                  </div>
                  {/* 저장 버튼은 편집 시트 안에만 — X로 닫았다면 저장 의도가 없는 것 */}
                </>
            ) : (
              // 인증 — 촬영 전: 셔터 / 촬영 후: 다시 · AI 인증
              photo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' }}>
                  <button type="button" onClick={retake} aria-label="다시 찍기" style={{ ...ctrlSquareStyle, width: 56, height: 56 }}>
                    <RotateCcw size={22} color="#430A21" strokeWidth={2.4} />
                    <span style={ctrlLabelStyle}>다시</span>
                  </button>
                  <button type="button" onClick={handleAnalyze} disabled={busy}
                    style={{ flex: 1, height: 56, border: '2px solid #430A21', borderRadius: 18, background: busy ? '#CBD5E1' : 'var(--cb-primary)', color: '#fff', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: busy ? 'not-allowed' : 'pointer', boxShadow: '0 4px 0 0 #430A21, 0 6px 12px rgba(200,92,119,0.34)' }}>
                    <ScanLine size={19} strokeWidth={2.4} /> AI 인증
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>{captureBtn}</div>
              )
            )}
            </div>
            )}
        </>
      )}

      {/* ── 결과: 야구네컷 ── */}
      {view === 'result' && isCard && currentFrame && (
        <>
          <div style={{ flex: 1, minHeight: 0, containerType: 'size', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 16px', overflow: 'hidden' }}>
            <div style={{ position: 'relative', width: `min(100%, ${(currentFrame.width / currentFrame.height) * 100}cqh)`, aspectRatio: `${currentFrame.width} / ${currentFrame.height}`, border: '2px solid #430A21', boxShadow: '4px 4px 0 0 #430A21', overflow: 'hidden', background: currentFrame.bg }}>
              {cardUrl ? (
                <img className="cb-photo" src={cardUrl} alt="야구네컷 미리보기" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
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

      {/* ── 결과: 인증(AI 분석) — 사진이 남는 영역을 풀로 채우고, 카드는 하단 고정. 배경 흰색 ── */}
      {view === 'result' && !isCard && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          {/* 촬영 사진 — 남는 영역을 채우는 둥근 카드. 분석 중: 어둡게 + 브래킷 + 스캔 바 */}
          <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', background: '#fff', margin: '10px 14px 0', border: '2px solid #430A21', borderRadius: 18 }}>
            {photo && <img className="cb-photo" src={photo.url} alt="촬영한 용기" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            {vStep === 'analyzing' && (
              <>
                <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.38)' }} />
                <div className="cb-scanline" aria-hidden="true" />
                <FocusBrackets color="rgba(255,255,255,0.92)" />
                <span style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: '#430A21', color: '#fff', fontSize: 11, fontWeight: 800, padding: '5px 12px', borderRadius: 9999, whiteSpace: 'nowrap' }}>
                  AI가 다회용기를 확인해요
                </span>
              </>
            )}
          </div>

          <div style={{ flexShrink: 0, background: '#fff', padding: '10px 14px 12px' }}>
          {vStep === 'idle' && (
            <button type="button" onClick={handleAnalyze} disabled={busy}
              style={{ border: '2px solid #430A21', borderRadius: 16, background: 'var(--cb-primary)', color: '#fff', padding: '15px 12px', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 3px 0 0 #430A21, 0 4px 8px rgba(200,92,119,0.32)' }}>
              <ScanLine size={18} strokeWidth={2.4} /> AI 인증
            </button>
          )}

          {vStep === 'analyzing' && (
            <div className="cb-ai-loading" role="status" aria-live="polite">
              <img className="cb-ai-loading__mascot" src={guideMascot} alt="" aria-hidden="true" />
              <p className="cb-ai-loading__label">
                AI가 용기를 살펴보는 중
                <span className="cb-ai-loading__dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
              </p>
              <p className="cb-ai-loading__hint">다회용기인지 꼼꼼하게 확인하고 있어요</p>
            </div>
          )}

          {(vStep === 'labeling' || vStep === 'submitting') && (
            <div style={{ background: '#fff', border: '2px solid #430A21', borderRadius: 18, boxShadow: '0 3px 0 0 #430A21', padding: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#430A21', margin: 0 }}>어떤 용기를 쓰셨나요?</p>
              <p style={{ marginTop: 4, fontSize: 11, color: '#8C6B73', lineHeight: 1.5 }}>
                {ai ? `AI 예측: ${ai.isReusable ? '다회용기' : '일회용기'} · ${ai.confidence.toFixed(1)}%` : 'AI가 판단하지 못했어요. 직접 선택해주세요.'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                {LABELS.map((opt) => {
                  const active = opt.value === label;
                  return (
                    <button key={opt.value} type="button" onClick={() => !busy && setLabel(opt.value)} aria-pressed={active}
                      style={{ border: active ? `2px solid ${opt.tone}` : '2px solid #430A21', borderRadius: 14, background: '#fff', color: active ? opt.tone : '#430A21', padding: '14px 0', fontSize: 14, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', boxShadow: active ? `0 3px 0 0 ${opt.tone}` : '0 2px 0 0 #430A21' }}>
                      {opt.t}
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={handleConfirm} disabled={busy}
                style={{ width: '100%', marginTop: 12, border: '2px solid #430A21', borderRadius: 14, background: busy ? '#CBD5E1' : 'var(--cb-primary)', color: '#fff', padding: '14px 12px', fontSize: 14, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', boxShadow: '0 3px 0 0 #430A21, 0 4px 8px rgba(200,92,119,0.32)' }}>
                {vStep === 'submitting' ? '확정 중...' : `${label === 'REUSABLE' ? '다회용기' : '일회용기'}로 인증 확정`}
              </button>
            </div>
          )}

          {vStep === 'done' && vResult && (
            <div style={{ background: '#fff', border: `2px solid ${toneColor(vResult.tone)}`, borderRadius: 18, boxShadow: `0 3px 0 0 ${toneColor(vResult.tone)}`, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <CheckCircle size={22} color={toneColor(vResult.tone)} />
                <p style={{ fontSize: 16, fontWeight: 800, color: '#430A21', margin: 0 }}>{vResult.title}</p>
              </div>
              <p style={{ marginTop: 8, fontSize: 12, color: '#5E1530', lineHeight: 1.55, textAlign: 'center' }}>{vResult.reason}</p>
              <button type="button" onClick={retake}
                style={{ width: '100%', marginTop: 12, border: '2px solid #430A21', borderRadius: 14, background: '#fff', color: '#430A21', padding: '13px 12px', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 0 0 #430A21' }}>
                새로 촬영하기
              </button>
            </div>
          )}
          </div>
        </div>
      )}

      {/* ── 용기 종류 선택 후 감정 피드백 모달 ── */}
      {feedback && (
        <>
          <div className="cb-modal-backdrop" onClick={() => setFeedback(null)} />
          <div className="cb-modal" role="dialog" aria-modal="true" aria-label="용기 인증 피드백">
            <img
              src={feedback === 'REUSABLE' ? reusableMascot : singleMascot}
              alt=""
              aria-hidden="true"
              style={{ height: 180, width: 'auto', display: 'block', margin: '0 auto 14px' }} // 비율 달라도 높이 통일
            />
            <h3 className="cb-modal__title">
              {feedback === 'REUSABLE' ? '다회용기 최고예요! 🎉' : '이번엔 일회용기였네요'}
            </h3>
            <p className="cb-modal__body">
              {feedback === 'REUSABLE' ? (
                <>지구가 한 뼘 더 깨끗해졌어요.<br />다음에도 함께해요!</>
              ) : (
                <>다음엔 다회용기로 같이 지구를 지켜요.</>
              )}
            </p>
            <div className="cb-modal__actions">
              <button
                type="button"
                onClick={() => setFeedback(null)}
                style={{ width: '100%', border: '2px solid #430A21', borderRadius: 14, background: 'var(--cb-primary)', color: '#fff', padding: '13px 12px', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 3px 0 0 #430A21' }}
              >
                확인
              </button>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 150, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 1000 /* 토스트/모달은 무조건 최상위 */ }}>
          <div style={{ background: '#430A21', color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 16px', border: '2px solid #430A21', boxShadow: '3px 3px 0 0 rgba(67,10,33,0.25)' }}>{toast}</div>
        </div>
      )}

      <div style={{
        flexShrink: 0,
        background: '#fff',
        maxHeight: immersive || activePanel ? 0 : 140,
        overflow: 'hidden',
        transition: 'max-height 260ms ease',
      }}>
        <BottomNav />
      </div>
    </div>
  );
}

const ctrlSquareStyle: React.CSSProperties = {
  width: 52, height: 52, flexShrink: 0, border: '2px solid #430A21', background: '#fff',
  borderRadius: 16,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
  cursor: 'pointer', boxShadow: '0 2px 0 0 #430A21',
};
const ctrlLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 800, color: '#430A21' };

// 흰 배경 — 헤더/제어부와 경계 없이 이어진다 (그라데이션 박스 제거)
const cardEditorShellStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '4px 8px',
  background: '#fff',
  boxSizing: 'border-box',
};

const cardFramePreviewStyle: React.CSSProperties = {
  position: 'relative',
  boxSizing: 'border-box',
  flexShrink: 1,
  maxHeight: '100%',
  maxWidth: '100%',
  overflow: 'hidden',
};

const cardSlotButtonStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  border: 'none', // 점선/실선 테두리 제거 — 선택 표시는 cardSelectedSlotStyle이 담당
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
  transformOrigin: 'center',
  willChange: 'transform',
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

const stickerButtonStyle: React.CSSProperties = {
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  zIndex: 3,
  border: '2px solid transparent',
  background: 'transparent',
  padding: 0,
  cursor: 'grab',
  touchAction: 'none',
};

const cardSelectedSlotStyle: React.CSSProperties = {
  position: 'absolute',
  zIndex: 3,
  pointerEvents: 'none',
  boxSizing: 'border-box',
  border: '2px solid #fff',
  boxShadow: 'inset 0 0 0 2px rgba(67,10,33,0.72), 0 0 0 2px rgba(255,255,255,0.48)',
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

const cardToolPanelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

// 설정 시트 — 열리면 제어부와 하단 네비를 통째로 교체하는 하단 영역 (구분선 없음)
// 설정 시트 — 열리면 제어부와 하단 네비를 통째로 교체 (구분선 없음)
const settingsSheetStyle: React.CSSProperties = {
  flexShrink: 0,
  background: '#fff',
  padding: '8px 12px calc(12px + env(safe-area-inset-bottom, 0px))',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const cardToolHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
};

const cardToolTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  minWidth: 0,
  color: '#430A21',
  fontSize: 12,
  fontWeight: 900,
};

const iconOnlyButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: '2px solid #430A21',
  borderRadius: 9999,
  background: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const zoomControlStyle: React.CSSProperties = {
  height: 38,
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '0 10px',
  border: '2px solid #430A21',
  borderRadius: 12,
  background: '#F8F1F2',
  boxSizing: 'border-box',
};

const zoomSliderStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  accentColor: 'var(--cb-primary)',
};

const zoomValueStyle: React.CSSProperties = {
  width: 42,
  textAlign: 'right',
  color: '#430A21',
  fontSize: 11,
  fontWeight: 900,
};

// 도구 버튼 행 — 스크롤 없이 시트 폭을 균등하게 꽉 채운다
const cardToolScrollerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
};

const cardToolButtonStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 52,
  border: '2px solid #430A21',
  borderRadius: 14,
  background: '#fff',
  color: '#430A21',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  fontSize: 10,
  fontWeight: 900,
  cursor: 'pointer',
  boxShadow: '0 2px 0 0 #430A21',
};

const slotSwapRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
};

const slotSwapLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  color: '#430A21',
  fontSize: 11,
  fontWeight: 900,
  whiteSpace: 'nowrap',
};

const slotSwapButtonsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  overflowX: 'auto',
};

const slotSwapButtonStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  flexShrink: 0,
  border: '2px solid #430A21',
  borderRadius: 9999,
  background: '#fff',
  color: '#430A21',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  boxShadow: '0 2px 0 0 #430A21',
};

const cardSaveButtonStyle: React.CSSProperties = {
  height: 44,
  border: '2px solid #430A21',
  borderRadius: 14,
  color: '#fff',
  fontSize: 14,
  fontWeight: 900,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  boxShadow: '0 3px 0 0 #430A21, 0 4px 8px rgba(200,92,119,0.32)',
};
