import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, ScanLine } from 'lucide-react';
import { useApp } from '../../AppContext';
import { VisitCard } from './VisitCard';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import { CameraPurposeToggle } from '../CameraPurposeToggle';
import { ApiError } from '../../../lib/apiClient';
import {
  analyzeImage,
  confirmLabel,
  type AiPrediction,
  type ContainerLabel,
} from '../../../lib/verifyApi';

type CertificationMode = 'use' | 'return';
type Step = 'photo' | 'analyzing' | 'labeling' | 'submitting' | 'done';
type ResultTone = 'success' | 'neutral' | 'error';

interface ResultInfo {
  tone: ResultTone;
  title: string;
  reason: string;
}

const MODES: Array<{ id: CertificationMode; title: string }> = [
  { id: 'use', title: '사용 인증' },
  { id: 'return', title: '반납 인증' },
];

const LABELS: Array<{ value: ContainerLabel; title: string; tone: string; tint: string }> = [
  { value: 'REUSABLE', title: '다회용기', tone: '#15803D', tint: '#F0FDF4' },
  { value: 'SINGLE_USE', title: '일회용기', tone: '#C2410C', tint: '#FFF7ED' },
];

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 'var(--cb-radius-lg)',
  padding: 16,
  border: '2px solid #430A21',
  boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
};

function resultPalette(tone: ResultTone) {
  if (tone === 'success') return { main: '#15803D', bg: '#F0FDF4' };
  if (tone === 'neutral') return { main: '#1D4ED8', bg: '#EFF6FF' };
  return { main: '#E11D48', bg: '#FFF1F2' };
}

export function ReportScreen() {
  const { addCertification, cameraPurpose, registerCameraAction } = useApp();

  const [mode, setMode] = useState<CertificationMode>('use');
  const [step, setStep] = useState<Step>('photo');
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [ai, setAi] = useState<AiPrediction | null>(null);
  const [label, setLabel] = useState<ContainerLabel>('REUSABLE');
  const [result, setResult] = useState<ResultInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 중앙 카메라 버튼이 이 화면의 촬영(파일 선택)을 열도록 등록
  useEffect(() => {
    registerCameraAction(() => fileInputRef.current?.click());
    return () => registerCameraAction(null);
  }, [registerCameraAction]);

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url);
    };
  }, [photo]);

  // 홈에서 '직관카드'로 카메라 용도를 바꾼 경우
  if (cameraPurpose === 'visit-card') return <VisitCard />;

  const busy = step === 'analyzing' || step === 'submitting';

  const reset = () => {
    setPhoto((cur) => {
      if (cur) URL.revokeObjectURL(cur.url);
      return null;
    });
    setSampleId(null);
    setAi(null);
    setLabel('REUSABLE');
    setResult(null);
    setStep('photo');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResult(null);
      setSampleId(null);
      setAi(null);
      setPhoto((cur) => {
        if (cur) URL.revokeObjectURL(cur.url);
        return { file, url: URL.createObjectURL(file) };
      });
      setStep('photo');
    }
    e.target.value = '';
  };

  const errorResult = (err: unknown): ResultInfo => {
    if (err instanceof ApiError) {
      const body = err.body as { code?: string; message?: string } | null;
      if (body?.code === 'ALREADY_CONFIRMED')
        return { tone: 'error', title: '이미 확정됨', reason: '새로 촬영해 다시 시도해주세요.' };
      if (err.status === 503)
        return { tone: 'error', title: '저장 실패', reason: '잠시 후 다시 시도해주세요.' };
      return { tone: 'error', title: `오류 ${err.status}`, reason: body?.message ?? err.message };
    }
    return { tone: 'error', title: '네트워크 오류', reason: '연결을 확인하고 다시 시도해주세요.' };
  };

  // 1단계: 사진 → AI 인증
  const handleAnalyze = async () => {
    if (!photo || busy) return;
    setResult(null);
    setStep('analyzing');
    try {
      const res = await analyzeImage(mode, photo.file);
      setSampleId(res.sampleId);
      setAi(res.ai);
      setLabel(res.suggestedLabel);
      setStep('labeling');
    } catch (err) {
      setResult(errorResult(err));
      setStep('done');
    }
  };

  // 2단계: 라벨 확정
  const handleConfirm = async () => {
    if (!sampleId || busy) return;
    setStep('submitting');
    try {
      const res = await confirmLabel(sampleId, label);
      const detected = label === 'REUSABLE' ? '다회용기' : '일회용기';
      if (res.scored) {
        addCertification(mode);
        setResult({
          tone: 'success',
          title: mode === 'use' ? '사용 인증 완료' : '반납 인증 완료',
          reason: ai ? `${detected} · AI ${ai.confidence.toFixed(1)}%` : detected,
        });
      } else if (res.reason === 'SINGLE_USE_LABEL') {
        setResult({
          tone: 'neutral',
          title: '일회용기로 기록',
          reason: '학습 데이터로 저장했어요. 점수는 반영되지 않습니다.',
        });
      } else {
        setResult({
          tone: 'error',
          title: '사용 인증 필요',
          reason: '최근 12시간 내 사용 인증이 없어 반납 점수가 반영되지 않았습니다.',
        });
      }
      setStep('done');
    } catch (err) {
      setResult(errorResult(err));
      setStep('done');
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
        {/* 맨 위 — 용도 설정 (인증 / 직관카드) */}
        <CameraPurposeToggle />

        {/* 사용/반납 토글 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {MODES.map((m) => {
            const active = m.id === mode;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  if (busy) return;
                  setMode(m.id);
                }}
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: active ? '0 3px 0 0 var(--cb-primary)' : '0 2px 0 0 #430A21',
                }}
              >
                <Camera size={18} color={active ? 'var(--cb-primary-deep)' : '#64748B'} />
                {m.title}
              </button>
            );
          })}
        </div>

        {/* 사진 프리뷰 */}
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', flexShrink: 0 }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
              background: photo ? '#000' : 'var(--cb-primary-deep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {photo ? (
              <img src={photo.url} alt="촬영한 용기" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                <Camera size={34} />
                <p style={{ marginTop: 8, fontSize: 12, fontWeight: 700 }}>중앙 카메라 버튼으로 촬영</p>
              </div>
            )}

            {step === 'analyzing' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(8, 15, 28, 0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  color: '#fff',
                }}
              >
                <ScanLine size={28} />
                <p style={{ fontSize: 13, fontWeight: 700 }}>AI 판독 중...</p>
              </div>
            )}
          </div>
        </div>

        {/* 1단계: AI 인증 버튼 (사진 있고 라벨링 전) */}
        {photo && (step === 'photo' || step === 'analyzing') && (
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={busy}
            style={{
              borderRadius: 'var(--cb-radius-md)',
              border: '2px solid #430A21',
              background: busy ? '#CBD5E1' : 'var(--cb-primary)',
              color: '#fff',
              padding: '15px 12px',
              fontSize: 15,
              fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 3px 0 0 #430A21, 0 4px 8px rgba(200, 92, 119, 0.32)',
            }}
          >
            <ScanLine size={18} />
            {step === 'analyzing' ? '판독 중...' : 'AI 인증'}
          </button>
        )}

        {/* 2단계: 라벨링 */}
        {(step === 'labeling' || step === 'submitting') && (
          <div style={cardStyle}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>라벨 확정</p>
            <p style={{ marginTop: 4, fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>
              {ai
                ? `AI 예측: ${ai.isReusable ? '다회용기' : '일회용기'} · ${ai.confidence.toFixed(1)}%`
                : 'AI가 판단하지 못했어요. 직접 선택해주세요.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              {LABELS.map((opt) => {
                const active = opt.value === label;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => !busy && setLabel(opt.value)}
                    aria-pressed={active}
                    style={{
                      borderRadius: 'var(--cb-radius-md)',
                      border: active ? `2px solid ${opt.tone}` : '2px solid #430A21',
                      background: active ? opt.tint : '#fff',
                      padding: '14px 0',
                      fontSize: 14,
                      fontWeight: 700,
                      color: active ? opt.tone : '#0F172A',
                      cursor: busy ? 'not-allowed' : 'pointer',
                      boxShadow: active ? `0 3px 0 0 ${opt.tone}` : '0 2px 0 0 #430A21',
                    }}
                  >
                    {opt.title}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              style={{
                width: '100%',
                marginTop: 12,
                borderRadius: 'var(--cb-radius-md)',
                border: '2px solid #430A21',
                background: busy ? '#CBD5E1' : 'var(--cb-primary)',
                color: '#fff',
                padding: '14px 12px',
                fontSize: 14,
                fontWeight: 700,
                cursor: busy ? 'not-allowed' : 'pointer',
                boxShadow: '0 3px 0 0 #430A21, 0 4px 8px rgba(200, 92, 119, 0.32)',
              }}
            >
              {step === 'submitting' ? '확정 중...' : `${label === 'REUSABLE' ? '다회용기' : '일회용기'}로 인증 확정`}
            </button>
          </div>
        )}

        {/* 결과 */}
        {step === 'done' && result && (
          <div
            style={{
              ...cardStyle,
              border: `2px solid ${resultPalette(result.tone).main}`,
              boxShadow: `0 3px 0 0 ${resultPalette(result.tone).main}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <CheckCircle size={22} color={resultPalette(result.tone).main} />
              <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{result.title}</p>
            </div>
            <p style={{ marginTop: 8, fontSize: 12, color: '#475569', lineHeight: 1.55, textAlign: 'center' }}>{result.reason}</p>
            <button
              type="button"
              onClick={reset}
              style={{
                width: '100%',
                marginTop: 12,
                borderRadius: 'var(--cb-radius-md)',
                border: '2px solid #430A21',
                background: '#fff',
                color: '#430A21',
                padding: '13px 12px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 0 0 #430A21',
              }}
            >
              새 인증하기
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
