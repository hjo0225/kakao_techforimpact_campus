import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../AppContext';
import { LockedScreen } from './LockedScreen';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import { Camera, CheckCircle, RotateCcw, ScanLine } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ApiError } from '../../../lib/apiClient';
import {
  analyzeImage,
  confirmLabel,
  type AiPrediction,
  type ContainerLabel,
} from '../../../lib/verifyApi';

type CertificationMode = 'use' | 'return';
type AnalysisState =
  | 'idle'
  | 'captured'
  | 'analyzing'
  | 'labeling'
  | 'submitting'
  | 'success'
  | 'recorded'
  | 'failure';
type ResultTone = 'success' | 'neutral' | 'error';

interface SimulatedResult {
  detected: '다회용기' | '일회용기';
  tone: ResultTone;
  reason: string;
  guide: string;
  statusLabel: string;
}

const LABEL_OPTIONS: Array<{
  value: ContainerLabel;
  title: string;
  subtitle: string;
  tone: string;
  tint: string;
}> = [
  {
    value: 'REUSABLE',
    title: '다회용기',
    subtitle: '점수 반영 대상',
    tone: '#15803D',
    tint: '#F0FDF4',
  },
  {
    value: 'SINGLE_USE',
    title: '일회용기',
    subtitle: '학습용으로만 기록',
    tone: '#C2410C',
    tint: '#FFF7ED',
  },
];

interface HistoryItem {
  id: string;
  mode: CertificationMode;
  label: string;
  time: string;
  detected: '다회용기' | '일회용기';
  passed: boolean;
}

const CERTIFICATION_MODES: Array<{
  id: CertificationMode;
  title: string;
  subtitle: string;
  tone: string;
  tint: string;
}> = [
  {
    id: 'use',
    title: '사용 인증',
    subtitle: '식음 직후 컵·용기 전면 촬영',
    tone: 'var(--cb-primary-deep)',
    tint: 'var(--cb-primary-soft)',
  },
  {
    id: 'return',
    title: '반납 인증',
    subtitle: '반납합 앞에서 용기 촬영',
    tone: '#1565C0',
    tint: '#EEF5FF',
  },
];

const HISTORY_SEED: HistoryItem[] = [
  {
    id: 'seed-1',
    mode: 'return',
    label: '반납 인증',
    time: '오늘 18:42',
    detected: '다회용기',
    passed: true,
  },
  {
    id: 'seed-2',
    mode: 'use',
    label: '사용 인증',
    time: '오늘 17:55',
    detected: '다회용기',
    passed: false,
  },
  {
    id: 'seed-3',
    mode: 'use',
    label: '사용 인증',
    time: '어제 19:08',
    detected: '다회용기',
    passed: true,
  },
];

const srOnlyStyle = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

function isTimeSaleInning(inning: string) {
  return inning.includes('7회') || inning.includes('8회');
}

function tonePalette(tone: ResultTone) {
  if (tone === 'success') {
    return {
      title: '인증 완료!',
      cardMain: '#15803D',
      cardShadow: 'rgba(21, 128, 61, 0.20)',
      iconBg: 'var(--cb-primary-soft)',
      iconBorder: 'var(--cb-primary-border)',
      iconColor: 'var(--cb-primary-deep)',
      noteMain: '#15803D',
      noteBg: '#F0FDF4',
    };
  }
  if (tone === 'neutral') {
    return {
      title: '기록 완료',
      cardMain: '#1D4ED8',
      cardShadow: 'rgba(29, 78, 216, 0.20)',
      iconBg: '#EFF6FF',
      iconBorder: '#1D4ED8',
      iconColor: '#1D4ED8',
      noteMain: '#1D4ED8',
      noteBg: '#EFF6FF',
    };
  }
  return {
    title: '인증 실패',
    cardMain: '#E11D48',
    cardShadow: 'rgba(225, 29, 72, 0.20)',
    iconBg: '#FFF1F2',
    iconBorder: '#FCA5A5',
    iconColor: '#E11D48',
    noteMain: '#C2410C',
    noteBg: '#FFF7ED',
  };
}

function formatNowLabel() {
  const now = new Date();
  const hours = `${now.getHours()}`.padStart(2, '0');
  const minutes = `${now.getMinutes()}`.padStart(2, '0');
  return `오늘 ${hours}:${minutes}`;
}

export function ReportScreen() {
  const {
    selectedGame,
    addCertification,
    totalCertCount,
    ecoImpact,
  } = useApp();
  const [mode, setMode] = useState<CertificationMode>('use');
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [activeResult, setActiveResult] = useState<SimulatedResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(HISTORY_SEED);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [aiPrediction, setAiPrediction] = useState<AiPrediction | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<ContainerLabel>('REUSABLE');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  const timeSaleActive = selectedGame ? isTimeSaleInning(selectedGame.inning) : false;
  const successCount = totalCertCount;

  const modeMeta = CERTIFICATION_MODES.find((item) => item.id === mode) ?? CERTIFICATION_MODES[0];
  const canStartAnalysis = analysisState === 'captured' || analysisState === 'failure';
  const isAnalyzing = analysisState === 'analyzing';
  const isSubmitting = analysisState === 'submitting';
  const isBusy = isAnalyzing || isSubmitting;
  const isLabeling = analysisState === 'labeling' || analysisState === 'submitting';

  if (!selectedGame) return <LockedScreen tabName="인증" />;

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  const handleCapture = () => {
    clearTimers();
    setActiveResult(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setAnalysisState('captured');
    }
    e.target.value = '';
  };

  const handleRetake = () => {
    clearTimers();
    setActiveResult(null);
    setImageFile(null);
    setSampleId(null);
    setAiPrediction(null);
    setAnalysisState('idle');
  };

  const buildResultFromError = (err: unknown): SimulatedResult => {
    if (err instanceof ApiError) {
      const body = err.body as { code?: string; message?: string } | null;
      if (body?.code === 'ALREADY_CONFIRMED') {
        return {
          detected: '다회용기',
          tone: 'error',
          statusLabel: '이미 확정됨',
          reason: '이미 라벨이 확정된 인증입니다.',
          guide: '새로 촬영해 다시 시도해주세요.',
        };
      }
      if (err.status === 503) {
        return {
          detected: '다회용기',
          tone: 'error',
          statusLabel: '저장 실패',
          reason: '이미지 저장에 실패했습니다.',
          guide: '잠시 후 다시 시도해주세요.',
        };
      }
      return {
        detected: '다회용기',
        tone: 'error',
        statusLabel: `오류 ${err.status}`,
        reason: body?.message ?? err.message,
        guide: '잠시 후 다시 시도해주세요.',
      };
    }
    return {
      detected: '다회용기',
      tone: 'error',
      statusLabel: '네트워크 오류',
      reason: '서버에 연결하지 못했습니다.',
      guide: '네트워크 상태를 확인하고 다시 시도해주세요.',
    };
  };

  // 1단계: 이미지 업로드 + AI 예측. 유저 라벨링 단계로 넘어간다.
  const handleAnalyze = async () => {
    if (!canStartAnalysis || isBusy || !imageFile) return;

    clearTimers();
    setActiveResult(null);
    setAnalysisState('analyzing');

    try {
      const res = await analyzeImage(mode, imageFile);
      setSampleId(res.sampleId);
      setAiPrediction(res.ai);
      setSelectedLabel(res.suggestedLabel);
      setAnalysisState('labeling');
    } catch (err) {
      setActiveResult(buildResultFromError(err));
      setAnalysisState('failure');
    }
  };

  const handleSelectLabel = (label: ContainerLabel) => {
    if (isSubmitting) return;
    setSelectedLabel(label);
  };

  // 2단계: 유저가 고른 라벨을 확정. REUSABLE이면 점수 반영.
  const handleConfirm = async () => {
    if (!sampleId || isSubmitting) return;

    clearTimers();
    setAnalysisState('submitting');

    try {
      const res = await confirmLabel(sampleId, selectedLabel);
      const isReusable = selectedLabel === 'REUSABLE';
      const detected: SimulatedResult['detected'] = isReusable
        ? '다회용기'
        : '일회용기';
      const label = mode === 'use' ? '사용 인증' : '반납 인증';

      if (res.scored) {
        addCertification(mode);
        setActiveResult({
          detected,
          tone: 'success',
          statusLabel: mode === 'use' ? '사용 인증 완료' : '반납 인증 완료',
          reason: aiPrediction
            ? `확정 라벨: ${detected} · AI ${aiPrediction.confidence.toFixed(1)}%`
            : `확정 라벨: ${detected}`,
          guide: '',
        });
        setHistory((prev) =>
          [
            {
              id: res.usage?.id ?? `${Date.now()}`,
              mode,
              label,
              time: formatNowLabel(),
              detected,
              passed: true,
            },
            ...prev,
          ].slice(0, 6),
        );
        setAnalysisState('success');
        return;
      }

      const neutral = res.reason === 'SINGLE_USE_LABEL';
      setActiveResult({
        detected,
        tone: neutral ? 'neutral' : 'error',
        statusLabel: neutral ? '일회용기로 기록' : '사용 인증 필요',
        reason: neutral
          ? '일회용기로 라벨링해 학습 데이터로 저장했습니다. 점수는 반영되지 않습니다.'
          : '최근 12시간 내 사용 인증이 없어 반납 점수가 반영되지 않았습니다.',
        guide: neutral
          ? '다회용기를 사용하면 점수가 반영됩니다.'
          : '먼저 사용 인증을 완료해주세요.',
      });
      setHistory((prev) =>
        [
          {
            id: res.sample.id,
            mode,
            label,
            time: formatNowLabel(),
            detected,
            passed: false,
          },
          ...prev,
        ].slice(0, 6),
      );
      setAnalysisState(neutral ? 'recorded' : 'failure');
    } catch (err) {
      setActiveResult(buildResultFromError(err));
      setAnalysisState('failure');
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
        style={srOnlyStyle}
        aria-hidden="true"
        tabIndex={-1}
      />
      <StatusBar centerLabel="인증" />

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
        <div
          style={{
            background: '#fff',
            borderRadius: 'var(--cb-radius-lg)',
            padding: 16,
            border: '2px solid #430A21',
            boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cb-primary-deep)' }}>
                Vision AI 인증
              </p>
              <p style={{ marginTop: 4, fontSize: 17, fontWeight: 700, color: '#0F172A', lineHeight: 1.35 }}>
                다회용기 인증으로 감축에 기여하세요
              </p>
              <p style={{ marginTop: 5, fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>
                사진만 올리면 AI가 용기와 반납 장면을 확인해 서울 감축 지표에 즉시 반영합니다.
              </p>
            </div>
            <div
              style={{
                flexShrink: 0,
                background: timeSaleActive ? '#FFF5D9' : '#F1F5F9',
                color: timeSaleActive ? '#B45309' : '#64748B',
                borderRadius: 'var(--cb-radius-full)',
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 700,
                border: `1.5px solid ${timeSaleActive ? '#B45309' : '#94A3B8'}`,
              }}
            >
              {timeSaleActive ? '7-8회 조기반납' : '경기 중 인증'}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 8,
              marginTop: 14,
            }}
          >
            {[
              { label: '누적 인증', value: `${successCount}건` },
              { label: '줄인 용기', value: `${ecoImpact.containers}개` },
              { label: '폐기물 감량', value: `${ecoImpact.wasteKg}kg` },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  borderRadius: 'var(--cb-radius-md)',
                  background: '#F8FAFC',
                  border: '2px solid #430A21',
                  padding: '10px 8px',
                  boxShadow: '0 2px 0 0 #430A21',
                }}
              >
                <p style={{ fontSize: 10, color: '#64748B' }}>{item.label}</p>
                <p style={{ marginTop: 4, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 12,
              padding: '11px 12px',
              borderRadius: 'var(--cb-radius-md)',
              background: timeSaleActive ? '#FFF8E7' : '#EFF6FF',
              border: `2px solid ${timeSaleActive ? '#B45309' : '#1D4ED8'}`,
              boxShadow: `0 2px 0 0 ${timeSaleActive ? '#B45309' : '#1D4ED8'}`,
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: timeSaleActive ? '#B45309' : '#1D4ED8' }}>
              {selectedGame.inning ? `${selectedGame.venue} ${selectedGame.inning}` : selectedGame.venue}
            </p>
            <p style={{ marginTop: 4, fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
              {timeSaleActive
                ? '7~8회 조기 반납 시간대입니다. 대기 줄이 짧을 때 반납 인증을 완료해보세요.'
                : '경기 중 촬영한 실사용 사진만 인정됩니다.'}
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}
        >
          {CERTIFICATION_MODES.map((item) => {
            const active = item.id === mode;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (isBusy) return;
                  setMode(item.id);
                  setActiveResult(null);
                  setSampleId(null);
                  setAiPrediction(null);
                  if (analysisState !== 'idle') {
                    setAnalysisState(imageFile ? 'captured' : 'idle');
                  }
                }}
                style={{
                  borderRadius: 'var(--cb-radius-md)',
                  border: active ? `2px solid ${item.tone}` : '2px solid #430A21',
                  background: active ? item.tint : '#fff',
                  padding: '12px 12px 11px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: active ? `0 3px 0 0 ${item.tone}` : '0 2px 0 0 #430A21',
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, color: active ? item.tone : '#0F172A' }}>
                  {item.title}
                </p>
                <p style={{ marginTop: 4, fontSize: 10, lineHeight: 1.45, color: '#64748B' }}>
                  {item.subtitle}
                </p>
              </button>
            );
          })}
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 'var(--cb-radius-lg)',
            padding: 16,
            border: '2px solid #430A21',
            boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>카메라 가이드</p>
              <p style={{ marginTop: 3, fontSize: 10, color: '#64748B' }}>{modeMeta.subtitle}</p>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: '#F8FAFC',
                borderRadius: 'var(--cb-radius-full)',
                padding: '6px 12px',
                fontSize: 10,
                color: '#475569',
                fontWeight: 700,
                flexShrink: 0,
                border: '1.5px solid #94A3B8',
              }}
            >
              <ScanLine size={12} color={modeMeta.tone} />
              2-3초 분석
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              borderRadius: 'var(--cb-radius-lg)',
              height: 312,
              overflow: 'hidden',
              background: mode === 'use'
                ? 'var(--cb-primary-deep)'
                : '#1F5AA6',
              border: '2px solid #430A21',
              boxShadow: '0 3px 0 0 #430A21',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 50% 20%, rgba(255,255,255,0.18), transparent 42%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 22,
                right: 22,
                top: 22,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div
                style={{
                  background: 'rgba(255,255,255,0.20)',
                  borderRadius: 'var(--cb-radius-full)',
                  padding: '6px 12px',
                  fontSize: 10,
                  color: '#fff',
                  fontWeight: 700,
                  backdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(255,255,255,0.45)',
                }}
              >
                {mode === 'use' ? '용기 전면 프레임' : '반납함 + 용기'}
              </div>
              <div
                style={{
                  background: 'rgba(255,255,255,0.20)',
                  borderRadius: 'var(--cb-radius-full)',
                  padding: '6px 12px',
                  fontSize: 10,
                  color: '#fff',
                  fontWeight: 700,
                  backdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(255,255,255,0.45)',
                }}
              >
                자동 검수
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: mode === 'use' ? 178 : 214,
                height: mode === 'use' ? 208 : 176,
                transform: 'translate(-50%, -52%)',
                borderRadius: mode === 'use' ? 34 : 24,
                border: '2px solid rgba(255,255,255,0.95)',
                boxShadow: '0 0 0 999px rgba(4, 9, 17, 0.28)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 10,
                  borderRadius: mode === 'use' ? 26 : 18,
                  border: '1.5px dashed rgba(255,255,255,0.6)',
                }}
              />
            </div>

            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 74,
                transform: 'translateX(-50%)',
                width: mode === 'use' ? 112 : 152,
                height: mode === 'use' ? 132 : 96,
                borderRadius: mode === 'use' ? '24px 24px 34px 34px' : 18,
                border: '2px solid rgba(255,255,255,0.78)',
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(4px)',
              }}
            />

            <div
              style={{
                position: 'absolute',
                left: 20,
                right: 20,
                bottom: 22,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.32)',
                  borderRadius: 'var(--cb-radius-md)',
                  padding: '10px 12px',
                  border: '2px solid rgba(255,255,255,0.32)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 }}>
                  {activeResult?.guide ?? (mode === 'use'
                    ? '컵 전체와 로고가 프레임 안에 들어오도록 맞춰주세요.'
                    : '반납 스테이션 안내판과 용기를 함께 담아주세요.')}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCapture}
                disabled={isBusy}
                style={{
                  width: '100%',
                  borderRadius: 'var(--cb-radius-md)',
                  padding: '14px 16px',
                  border: '2px solid #430A21',
                  cursor: isBusy ? 'wait' : 'pointer',
                  background: isBusy ? 'rgba(255,255,255,0.4)' : '#fff',
                  color: '#430A21',
                  fontSize: 14,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 3px 0 0 #430A21',
                }}
              >
                <Camera size={18} color="var(--cb-primary-deep)" />
                사진 촬영 / 갤러리 선택
              </button>
            </div>

            <AnimatePresence>
              {isBusy && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(8, 15, 28, 0.62)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                  }}
                >
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 10, opacity: 0 }}
                    style={{
                      width: '100%',
                      borderRadius: 'var(--cb-radius-lg)',
                      background: '#fff',
                      padding: '22px 18px',
                      textAlign: 'center',
                      border: '2px solid #430A21',
                      boxShadow: '0 4px 0 0 #430A21',
                    }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.2, ease: 'linear' }}
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: '50%',
                        margin: '0 auto 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--cb-primary-soft)',
                      }}
                    >
                      <ScanLine size={24} color={modeMeta.tone} />
                    </motion.div>
                    <p style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
                      {isSubmitting ? '인증 확정 중' : 'Vision AI 판독 중'}
                    </p>
                    <p style={{ marginTop: 8, fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
                      {isSubmitting
                        ? '선택한 라벨을 저장하고 점수를 반영하고 있습니다.'
                        : '용기 종류를 분석하고 결과를 준비하고 있습니다.'}
                    </p>
                    <div
                      style={{
                        marginTop: 14,
                        borderRadius: 'var(--cb-radius-full)',
                        height: 8,
                        background: '#E2E8F0',
                        overflow: 'hidden',
                        border: '1.5px solid #430A21',
                      }}
                    >
                      <motion.div
                        initial={{ width: '18%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2.6, ease: 'easeInOut' }}
                        style={{
                          height: '100%',
                          borderRadius: 'var(--cb-radius-full)',
                          background: 'var(--cb-primary)',
                        }}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={handleRetake}
              disabled={analysisState === 'idle' || isBusy}
              style={{
                flex: 1,
                borderRadius: 'var(--cb-radius-md)',
                border: '2px solid #430A21',
                background: analysisState === 'idle' || isBusy ? '#F8FAFC' : '#fff',
                color: analysisState === 'idle' || isBusy ? '#94A3B8' : '#334155',
                padding: '14px 10px',
                fontSize: 13,
                fontWeight: 700,
                cursor: analysisState === 'idle' || isBusy ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 2px 0 0 #430A21',
              }}
            >
              <RotateCcw size={16} />
              다시 촬영
            </button>
            <button
              type="button"
              aria-label="AI 분석 시작"
              onClick={handleAnalyze}
              disabled={!canStartAnalysis || isBusy}
              style={{
                flex: 1.25,
                borderRadius: 'var(--cb-radius-md)',
                border: '2px solid #430A21',
                background: !canStartAnalysis || isBusy
                  ? '#CBD5E1'
                  : 'var(--cb-primary)',
                color: '#fff',
                padding: '14px 12px',
                fontSize: 14,
                fontWeight: 700,
                cursor: !canStartAnalysis || isBusy ? 'not-allowed' : 'pointer',
                boxShadow: !canStartAnalysis || isBusy
                  ? '0 2px 0 0 #430A21'
                  : '0 3px 0 0 #430A21, 0 4px 8px rgba(200, 92, 119, 0.32)',
              }}
            >
              {isAnalyzing ? '분석 중...' : 'AI 분석 시작'}
            </button>
          </div>
        </div>

        {isLabeling && (
          <div
            style={{
              background: '#fff',
              borderRadius: 'var(--cb-radius-lg)',
              padding: 16,
              border: '2px solid #430A21',
              boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>라벨 확정</p>
            <p style={{ marginTop: 4, fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>
              {aiPrediction
                ? `AI 예측: ${aiPrediction.isReusable ? '다회용기' : '일회용기'} · ${aiPrediction.confidence.toFixed(1)}%`
                : 'AI가 판단하지 못했습니다. 직접 선택해 주세요.'}
            </p>
            <p style={{ marginTop: 4, fontSize: 11, color: '#94A3B8', lineHeight: 1.5 }}>
              최종 선택은 학습 데이터로 저장됩니다. 실제 용기와 같은 것을 골라주세요.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                marginTop: 12,
              }}
            >
              {LABEL_OPTIONS.map((opt) => {
                const active = opt.value === selectedLabel;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectLabel(opt.value)}
                    disabled={isSubmitting}
                    aria-pressed={active}
                    style={{
                      borderRadius: 'var(--cb-radius-md)',
                      border: active ? `2px solid ${opt.tone}` : '2px solid #430A21',
                      background: active ? opt.tint : '#fff',
                      padding: '12px 12px 11px',
                      textAlign: 'left',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      boxShadow: active ? `0 3px 0 0 ${opt.tone}` : '0 2px 0 0 #430A21',
                    }}
                  >
                    <p style={{ fontSize: 14, fontWeight: 700, color: active ? opt.tone : '#0F172A' }}>
                      {opt.title}
                    </p>
                    <p style={{ marginTop: 4, fontSize: 10, color: '#64748B' }}>{opt.subtitle}</p>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              style={{
                width: '100%',
                marginTop: 12,
                borderRadius: 'var(--cb-radius-md)',
                border: '2px solid #430A21',
                background: isSubmitting ? '#CBD5E1' : 'var(--cb-primary)',
                color: '#fff',
                padding: '14px 12px',
                fontSize: 14,
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: isSubmitting
                  ? '0 2px 0 0 #430A21'
                  : '0 3px 0 0 #430A21, 0 4px 8px rgba(200, 92, 119, 0.32)',
              }}
            >
              {isSubmitting
                ? '확정 중...'
                : `${selectedLabel === 'REUSABLE' ? '다회용기' : '일회용기'}로 인증 확정`}
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeResult &&
            (() => {
              const palette = tonePalette(activeResult.tone);
              const isSuccess = activeResult.tone === 'success';
              return (
                <motion.div
                  key={`${analysisState}-${activeResult.statusLabel}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  style={{
                    background: '#fff',
                    borderRadius: 'var(--cb-radius-lg)',
                    padding: 16,
                    border: `2px solid ${palette.cardMain}`,
                    boxShadow: `0 3px 0 0 ${palette.cardMain}, 0 4px 6px ${palette.cardShadow}`,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 'var(--cb-radius-md)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: palette.iconBg,
                        border: `1.5px solid ${palette.iconBorder}`,
                      }}
                    >
                      <CheckCircle size={22} color={palette.iconColor} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                        {palette.title}
                      </p>
                      {isSuccess && <span style={srOnlyStyle}>인증 완료</span>}
                      <p style={{ marginTop: 4, fontSize: 12, color: '#475569', lineHeight: 1.55 }}>
                        {activeResult.reason}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 8,
                      marginTop: 14,
                    }}
                  >
                    <div style={{ borderRadius: 'var(--cb-radius-md)', background: '#F8FAFC', padding: '10px 11px', border: '2px solid #430A21', boxShadow: '0 2px 0 0 #430A21' }}>
                      <p style={{ fontSize: 10, color: '#64748B' }}>확인 결과</p>
                      <p style={{ marginTop: 4, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{activeResult.detected}</p>
                    </div>
                    <div style={{ borderRadius: 'var(--cb-radius-md)', background: '#F8FAFC', padding: '10px 11px', border: '2px solid #430A21', boxShadow: '0 2px 0 0 #430A21' }}>
                      <p style={{ fontSize: 10, color: '#64748B' }}>처리 상태</p>
                      <p style={{ marginTop: 4, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{activeResult.statusLabel}</p>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      borderRadius: 'var(--cb-radius-md)',
                      padding: '11px 12px',
                      background: palette.noteBg,
                      border: `2px solid ${palette.noteMain}`,
                      boxShadow: `0 2px 0 0 ${palette.noteMain}`,
                    }}
                  >
                    <p style={{ fontSize: 12, fontWeight: 700, color: palette.noteMain }}>
                      {isSuccess ? '서울 감축 지표에 반영되었습니다' : activeResult.statusLabel}
                    </p>
                    <p style={{ marginTop: 4, fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                      {isSuccess
                        ? timeSaleActive
                          ? '7-8회 조기 반납 구간에 인증해 대기 줄이 짧았습니다.'
                          : '인증한 다회용기는 줄인 일회용기 개수와 폐기물 감량에 합산됩니다.'
                        : activeResult.guide}
                    </p>
                  </div>
                </motion.div>
              );
            })()}
        </AnimatePresence>

        <div
          style={{
            background: '#fff',
            borderRadius: 'var(--cb-radius-lg)',
            padding: '16px 14px',
            border: '2px solid #430A21',
            boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>인증 히스토리</p>
              <p style={{ marginTop: 3, fontSize: 10, color: '#64748B' }}>최근 인증 내역을 표시합니다.</p>
            </div>
            <div
              style={{
                borderRadius: 'var(--cb-radius-full)',
                padding: '5px 12px',
                fontSize: 10,
                fontWeight: 700,
                background: '#F8FAFC',
                color: '#475569',
                border: '1.5px solid #94A3B8',
              }}
            >
              총 {history.length}건
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {history.map((item) => (
              <div
                key={item.id}
                style={{
                  borderRadius: 'var(--cb-radius-md)',
                  padding: '12px',
                  background: item.passed ? '#F8FFFB' : '#FFF8F5',
                  border: `2px solid ${item.passed ? '#15803D' : '#C2410C'}`,
                  boxShadow: `0 2px 0 0 ${item.passed ? '#15803D' : '#C2410C'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{item.label}</p>
                      <span
                        style={{
                          borderRadius: 'var(--cb-radius-full)',
                          padding: '3px 10px',
                          fontSize: 10,
                          fontWeight: 700,
                          background: item.mode === 'use' ? 'var(--cb-primary-soft)' : '#EEF5FF',
                          color: item.mode === 'use' ? 'var(--cb-primary-deep)' : '#1565C0',
                          border: `1.5px solid ${item.mode === 'use' ? 'var(--cb-primary-border)' : '#1565C0'}`,
                        }}
                      >
                        {item.mode === 'use' ? '사용' : '반납'}
                      </span>
                    </div>
                    <p style={{ marginTop: 4, fontSize: 11, color: '#64748B' }}>
                      {item.time} · {item.detected}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: item.passed ? '#15803D' : '#C2410C' }}>
                      {item.passed ? '인증 완료' : '재촬영'}
                    </p>
                    <p style={{ marginTop: 4, fontSize: 10, color: '#94A3B8' }}>
                      {item.passed ? '감축 지표 반영' : '미반영'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
