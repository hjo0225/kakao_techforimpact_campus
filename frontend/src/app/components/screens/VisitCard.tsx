import { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw, Download } from 'lucide-react';
import { useApp } from '../../AppContext';
import { useAuthStore } from '../../../store/authStore';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 'var(--cb-radius-lg)',
  padding: 16,
  border: '2px solid #430A21',
  boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
};

function todayLabel(): string {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${days[d.getDay()]})`;
}

// 직관카드 — 오늘의 직관 순간을 사진 카드로 (클라이언트 전용 MVP)
export function VisitCard() {
  const { selectedTeam } = useApp();
  const user = useAuthStore((s) => s.user);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const teamLabel = selectedTeam ?? user?.teamCode ?? '직관';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setImageUrl(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `직관카드_${Date.now()}.jpg`;
    a.click();
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
            오늘의 직관 순간을 남겨요
          </p>
          <p style={{ marginTop: 5, fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>
            사진을 찍으면 날짜와 응원팀이 담긴 카드로 만들어 저장할 수 있어요.
          </p>
        </div>

        {/* 카드 프리뷰 */}
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '3 / 4',
              background: imageUrl ? '#000' : 'var(--cb-primary-deep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="직관 사진" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}>
                <Camera size={36} />
                <p style={{ marginTop: 8, fontSize: 12 }}>사진을 촬영하면 카드가 만들어져요</p>
              </div>
            )}

            {/* 오버레이 — 날짜 + 팀 */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                padding: '16px 16px 14px',
                background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.6))',
                color: '#fff',
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 700, opacity: 0.9 }}>{todayLabel()}</p>
              <p style={{ marginTop: 2, fontSize: 20, fontWeight: 800 }}>{teamLabel} 직관</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: 1,
              borderRadius: 'var(--cb-radius-md)',
              border: '2px solid #430A21',
              background: imageUrl ? '#fff' : 'var(--cb-primary)',
              color: imageUrl ? '#430A21' : '#fff',
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
            {imageUrl ? <RotateCcw size={16} /> : <Camera size={18} />}
            {imageUrl ? '다시 찍기' : '사진 촬영'}
          </button>
          {imageUrl && (
            <button
              type="button"
              onClick={handleDownload}
              style={{
                flex: 1,
                borderRadius: 'var(--cb-radius-md)',
                border: '2px solid #430A21',
                background: 'var(--cb-primary)',
                color: '#fff',
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
              <Download size={16} />
              저장
            </button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
