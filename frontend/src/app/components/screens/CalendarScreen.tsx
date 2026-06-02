import { useEffect, useMemo, useState } from 'react';
import { X, ImageOff } from 'lucide-react';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import {
  getVerificationHistory,
  fetchVerificationImageUrl,
  type VerificationHistoryItem,
} from '../../../lib/verifyApi';

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

function PhotoThumb({ id, onClick }: { id: string; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    fetchVerificationImageUrl(id)
      .then((u) => {
        if (cancelled) { URL.revokeObjectURL(u); return; }
        created = u;
        setUrl(u);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [id]);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        padding: 0,
        margin: 0,
        border: 'none',
        background: '#1E293B',
        aspectRatio: '1 / 1',
        overflow: 'hidden',
        cursor: 'pointer',
        width: '100%',
      }}
    >
      {url ? (
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : failed ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <ImageOff size={18} color="#475569" />
        </div>
      ) : (
        <div style={{ width: '100%', height: '100%', background: '#1E293B' }} />
      )}
    </button>
  );
}

function PhotoLightbox({ item, onClose }: { item: VerificationHistoryItem; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    fetchVerificationImageUrl(item.id)
      .then((u) => {
        if (cancelled) { URL.revokeObjectURL(u); return; }
        created = u;
        setUrl(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [item.id]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.92)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(255,255,255,0.14)',
          border: 'none',
          borderRadius: '50%',
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <X size={20} color="#fff" />
      </button>

      {url ? (
        <img
          src={url}
          alt="인증 사진"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>불러오는 중...</div>
      )}

      <p style={{
        position: 'absolute',
        bottom: 32,
        color: 'rgba(255,255,255,0.55)',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.04em',
        margin: 0,
      }}>
        {dateKey(item.createdAt)} {timeLabel(item.createdAt)}
      </p>
    </div>
  );
}

export function CalendarScreen() {
  const [items, setItems] = useState<VerificationHistoryItem[] | null>(null);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVerificationHistory()
      .then((data) => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

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

  const selectedItem = useMemo(
    () => items?.find((it) => it.id === selectedId) ?? null,
    [items, selectedId],
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <StatusBar centerLabel="사진 기록" />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 18,
        }}
      >
        {error && (
          <p style={{ textAlign: 'center', color: '#64748B', fontSize: 12, padding: '32px 16px' }}>
            기록을 불러오지 못했습니다.
          </p>
        )}
        {!error && items && items.length === 0 && (
          <p style={{ textAlign: 'center', color: '#64748B', fontSize: 12, padding: '32px 16px' }}>
            아직 인증 사진이 없습니다. 카메라로 첫 인증을 남겨보세요.
          </p>
        )}
        {!error && !items && (
          <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: '32px 16px' }}>
            불러오는 중...
          </p>
        )}

        {groups.map(([day, dayItems]) => (
          <div key={day} style={{ marginBottom: 20 }}>
            <p style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#64748B',
              letterSpacing: '0.06em',
              padding: '12px 14px 6px',
              margin: 0,
            }}>
              {day}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {dayItems.map((it) => (
                <PhotoThumb key={it.id} id={it.id} onClick={() => setSelectedId(it.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <PhotoLightbox item={selectedItem} onClose={() => setSelectedId(null)} />
      )}

      <BottomNav />
    </div>
  );
}
