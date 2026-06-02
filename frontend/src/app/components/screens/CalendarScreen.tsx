import { useEffect, useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import {
  getVerificationHistory,
  fetchVerificationImageUrl,
  type VerificationHistoryItem,
} from '../../../lib/verifyApi';

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 'var(--cb-radius-lg)',
  padding: 14,
  border: '2px solid #430A21',
  boxShadow: '0 3px 0 0 #430A21, 0 4px 6px rgba(67, 10, 33, 0.18)',
};

function dateKey(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}.${m}.${day}`;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// 인증 사진 썸네일 — bearer로 받아 blob URL, 언마운트 시 revoke
function VerifyThumb({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    fetchVerificationImageUrl(id)
      .then((u) => {
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        created = u;
        setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [id]);

  const box: React.CSSProperties = {
    width: 56,
    height: 56,
    flexShrink: 0,
    borderRadius: 'var(--cb-radius-md)',
    border: '2px solid #430A21',
    overflow: 'hidden',
    background: '#F1F5F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (failed) {
    return (
      <div style={box}>
        <ImageOff size={20} color="#94A3B8" />
      </div>
    );
  }
  if (!url) {
    return <div style={{ ...box, background: '#E2E8F0' }} />;
  }
  return (
    <div style={box}>
      <img src={url} alt="인증 사진" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}

export function CalendarScreen() {
  const [items, setItems] = useState<VerificationHistoryItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getVerificationHistory()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 날짜별 그룹 (최신순)
  const groups = useMemo(() => {
    if (!items) return [];
    const map = new Map<string, VerificationHistoryItem[]>();
    for (const it of items) {
      const key = dateKey(it.createdAt);
      const arr = map.get(key);
      if (arr) arr.push(it);
      else map.set(key, [it]);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <StatusBar centerLabel="캘린더" />

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
          <p style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>인증 캘린더</p>
          <p style={{ marginTop: 4, fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>
            날짜별 다회용기 인증 기록과 촬영한 사진을 모아봅니다.
          </p>
        </div>

        {error && (
          <div style={{ ...cardStyle, textAlign: 'center', color: '#64748B', fontSize: 12 }}>
            기록을 불러오지 못했습니다.
          </div>
        )}

        {!error && items && items.length === 0 && (
          <div style={{ ...cardStyle, textAlign: 'center', color: '#64748B', fontSize: 12 }}>
            아직 인증 기록이 없습니다. 카메라로 첫 인증을 남겨보세요.
          </div>
        )}

        {!error && !items && (
          <div style={{ ...cardStyle, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
            불러오는 중...
          </div>
        )}

        {groups.map(([day, dayItems]) => (
          <div key={day} style={cardStyle}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--cb-primary-deep)' }}>{day}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {dayItems.map((it) => {
                const kindLabel = it.kind === 'USE' ? '사용 인증' : '반납 인증';
                const labelText =
                  it.userLabel === 'REUSABLE'
                    ? '다회용기'
                    : it.userLabel === 'SINGLE_USE'
                      ? '일회용기'
                      : '미확정';
                const confirmed = it.status === 'CONFIRMED' && it.userLabel === 'REUSABLE';
                return (
                  <div
                    key={it.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 10,
                      borderRadius: 'var(--cb-radius-md)',
                      background: '#F8FAFC',
                      border: '2px solid #430A21',
                      boxShadow: '0 2px 0 0 #430A21',
                    }}
                  >
                    <VerifyThumb id={it.id} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                        {kindLabel} · {labelText}
                      </p>
                      <p style={{ marginTop: 3, fontSize: 11, color: '#64748B' }}>
                        {timeLabel(it.createdAt)}
                        {it.confidence != null ? ` · AI ${it.confidence.toFixed(0)}%` : ''}
                      </p>
                    </div>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        color: confirmed ? '#15803D' : '#C2410C',
                      }}
                    >
                      {confirmed ? '반영' : '미반영'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
