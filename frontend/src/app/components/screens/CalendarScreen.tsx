import { useEffect, useMemo, useState } from 'react';
import {
  X,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  Share2,
  LayoutGrid,
  List as ListIcon,
} from 'lucide-react';
import { BottomNav } from '../BottomNav';
import { StatusBar } from '../StatusBar';
import {
  getVerificationHistory,
  fetchVerificationImageUrl,
} from '../../../lib/verifyApi';
import { getVisitCards, sharedCardImageUrl } from '../../../lib/visitCardApi';
import { isInWebView, shareTextViaBridge } from '../../../lib/webviewBridge';
import calendarMascot from '../../../assets/calendar-mascot.png';

// ── 공통 정규화 모델 ──────────────────────────────────────────────
// 'auth'  : 인증 필요. src=id → fetchVerificationImageUrl로 blob 생성 후 revoke
// 'public': 공개 URL. src를 <img src>에 바로 사용
type ImageMode = 'auth' | 'public';
interface CalEntry {
  id: string;
  createdAt: string;
  imageMode: ImageMode;
  src: string;
}

type TabId = 'reuse' | 'card';
type ViewMode = 'grid' | 'list';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'reuse', label: '다회용기 인증' },
  { id: 'card', label: '야구네컷' },
];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const BORDER = '2px solid #430A21';
const SUNDAY = '#C2362C';

// ── 날짜 헬퍼 ────────────────────────────────────────────────────
function dayKey(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function dayKeyFromYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function prettyDay(key: string): string {
  const [y, m, d] = key.split('-');
  return `${y}.${m}.${d}`;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ── 이미지 썸네일 (auth blob / public URL 모두 지원) ─────────────────
function EntryImage({
  entry,
  alt,
  rounded,
}: {
  entry: CalEntry;
  alt: string;
  rounded?: boolean;
}) {
  const isAuth = entry.imageMode === 'auth';
  const [url, setUrl] = useState<string | null>(isAuth ? null : entry.src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isAuth) {
      setUrl(entry.src);
      return;
    }
    let cancelled = false;
    let created: string | null = null;
    fetchVerificationImageUrl(entry.src)
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
  }, [entry.src, isAuth]);

  const base: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  };

  if (url) {
    return (
      <img
        className="cb-photo"
        src={url}
        alt={alt}
        onError={() => setFailed(true)}
        style={base}
      />
    );
  }
  if (failed) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: '#F0E8E7',
        }}
      >
        <ImageOff size={16} color="#B59CA3" />
      </div>
    );
  }
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#F0E8E7',
        borderRadius: rounded ? 0 : undefined,
      }}
    />
  );
}

// ── 풀스크린 라이트박스 ───────────────────────────────────────────
function Lightbox({ entry, onClose }: { entry: CalEntry; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(67, 10, 33, 0.94)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000, // 모달류는 무조건 최상위
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
          background: 'rgba(255,255,255,0.16)',
          border: 'none',
          borderRadius: '9999px',
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

      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90%', maxHeight: '75vh', display: 'flex' }}
      >
        <EntryImage entry={entry} alt="기록 사진" />
      </div>

      <p
        style={{
          position: 'absolute',
          bottom: 32,
          color: 'rgba(255,255,255,0.6)',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.04em',
          margin: 0,
        }}
      >
        {prettyDay(dayKey(entry.createdAt))} {timeLabel(entry.createdAt)}
      </p>
    </div>
  );
}

// ── 날짜 상세 페이지 (그 날의 모든 사진) ───────────────────────────
function DayDetail({
  dayK,
  entries,
  tabLabel,
  onBack,
}: {
  dayK: string;
  entries: CalEntry[];
  tabLabel: string;
  onBack: () => void;
}) {
  const [lightbox, setLightbox] = useState<CalEntry | null>(null);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <StatusBar centerLabel={prettyDay(dayK)} />

      {/* 헤더: 뒤로 + 날짜 */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 14px 12px',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="뒤로"
          style={{
            width: 36,
            height: 36,
            border: BORDER,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '2px 2px 0 0 #430A21',
          }}
        >
          <ChevronLeft size={20} color="#430A21" strokeWidth={2.6} />
        </button>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#430A21' }}>
            {prettyDay(dayK)}
          </p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#8C6B73' }}>
            {tabLabel} · {entries.length}장
          </p>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '0 14px 18px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {entries.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setLightbox(e)}
              style={{
                padding: 0,
                border: BORDER,
                background: '#F0E8E7',
                aspectRatio: '1 / 1',
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: '2px 2px 0 0 #430A21',
              }}
            >
              <EntryImage entry={e} alt={`${prettyDay(dayK)} 기록`} />
            </button>
          ))}
        </div>
      </div>

      {lightbox && <Lightbox entry={lightbox} onClose={() => setLightbox(null)} />}

      <BottomNav />
    </div>
  );
}

// ── 메인 화면 ────────────────────────────────────────────────────
export function CalendarScreen() {
  const [tab, setTab] = useState<TabId>('reuse');
  const [view, setView] = useState<ViewMode>('grid');

  const [reuseEntries, setReuseEntries] = useState<CalEntry[] | null>(null);
  const [cardEntries, setCardEntries] = useState<CalEntry[] | null>(null);
  const [error, setError] = useState(false);

  const now = new Date();
  const [viewY, setViewY] = useState(now.getFullYear());
  const [viewM, setViewM] = useState(now.getMonth()); // 0-based

  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<CalEntry | null>(null);

  // 두 데이터 소스 동시 로드
  useEffect(() => {
    let cancelled = false;
    getVerificationHistory()
      .then((items) => {
        if (cancelled) return;
        setReuseEntries(
          items.map((it) => ({
            id: it.id,
            createdAt: it.createdAt,
            imageMode: 'auth' as const,
            src: it.id,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    getVisitCards()
      .then((cards) => {
        if (cancelled) return;
        setCardEntries(
          cards.map((c) => ({
            id: c.id,
            createdAt: c.createdAt,
            imageMode: 'public' as const,
            src: sharedCardImageUrl(c.shareToken),
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setCardEntries([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const entries = tab === 'reuse' ? reuseEntries : cardEntries;
  const tabLabel = TABS.find((t) => t.id === tab)!.label;

  // 날짜별 그룹 (전체 탭 데이터)
  const byDay = useMemo(() => {
    const map = new Map<string, CalEntry[]>();
    if (!entries) return map;
    for (const e of entries) {
      const k = dayKey(e.createdAt);
      const arr = map.get(k);
      if (arr) arr.push(e);
      else map.set(k, [e]);
    }
    // 각 날짜 내부는 시간 내림차순
    for (const arr of map.values()) {
      arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }
    return map;
  }, [entries]);

  // 탭/데이터가 처음 로드될 때, 데이터가 있는 가장 최근 달로 점프 (현재 달이 비었으면)
  useEffect(() => {
    if (!entries || entries.length === 0) return;
    const curKeyPrefix = `${viewY}-${String(viewM + 1).padStart(2, '0')}`;
    const hasCurrentMonth = entries.some((e) => dayKey(e.createdAt).startsWith(curKeyPrefix));
    if (hasCurrentMonth) return;
    const latest = entries.reduce((a, b) =>
      +new Date(a.createdAt) > +new Date(b.createdAt) ? a : b,
    );
    const d = new Date(latest.createdAt);
    setViewY(d.getFullYear());
    setViewM(d.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, entries]);

  // 선택한 달의 셀 구성
  const cells = useMemo(() => {
    const firstWeekday = new Date(viewY, viewM, 1).getDay(); // 0=일
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const out: Array<{ day: number; key: string } | null> = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ day: d, key: dayKeyFromYmd(viewY, viewM, d) });
    }
    return out;
  }, [viewY, viewM]);

  // 선택한 달의 날짜별 리스트 (리스트 뷰용, 내림차순)
  const monthDays = useMemo(() => {
    const prefix = `${viewY}-${String(viewM + 1).padStart(2, '0')}`;
    return Array.from(byDay.keys())
      .filter((k) => k.startsWith(prefix))
      .sort((a, b) => (a < b ? 1 : -1));
  }, [byDay, viewY, viewM]);

  const monthCount = useMemo(
    () => monthDays.reduce((sum, k) => sum + (byDay.get(k)?.length ?? 0), 0),
    [monthDays, byDay],
  );

  const goPrevMonth = () => {
    setViewM((m) => {
      if (m === 0) {
        setViewY((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };
  const goNextMonth = () => {
    setViewM((m) => {
      if (m === 11) {
        setViewY((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  // 연.월 드롭다운 옵션: 데이터 최소달 ~ 현재달 (현재달 포함, 최소 12개월)
  const monthOptions = useMemo(() => {
    const cur = new Date(now.getFullYear(), now.getMonth(), 1);
    let earliest = new Date(cur.getFullYear(), cur.getMonth() - 11, 1);
    const allEntries = [...(reuseEntries ?? []), ...(cardEntries ?? [])];
    for (const e of allEntries) {
      const d = new Date(e.createdAt);
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      if (first < earliest) earliest = first;
    }
    // 화살표로 이동한 현재 보기 달이 범위를 벗어나면 경계 확장
    const viewFirst = new Date(viewY, viewM, 1);
    let end = cur;
    if (viewFirst > end) end = viewFirst;
    if (viewFirst < earliest) earliest = viewFirst;

    const opts: Array<{ y: number; m: number }> = [];
    const cursor = new Date(earliest);
    while (cursor <= end) {
      opts.push({ y: cursor.getFullYear(), m: cursor.getMonth() });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return opts.reverse(); // 최신 먼저
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reuseEntries, cardEntries, viewY, viewM]);

  const handleShare = async () => {
    const monthText = `${viewY}.${String(viewM + 1).padStart(2, '0')}`;
    const text = `${monthText} ${tabLabel} ${monthCount}건 기록 🌱`;
    try {
      // WebView는 navigator.share 미지원이 흔함 → 네이티브 공유 시트로 위임
      if (isInWebView() && shareTextViaBridge(text)) return;
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: tabLabel, text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      /* 사용자 취소 등 무시 */
    }
  };

  // 상세 페이지로 전환
  if (detailKey) {
    return (
      <DayDetail
        dayK={detailKey}
        entries={byDay.get(detailKey) ?? []}
        tabLabel={tabLabel}
        onBack={() => setDetailKey(null)}
      />
    );
  }

  const loading = entries === null;
  const empty = entries !== null && entries.length === 0;

  return (
    <div className="cb-calendar-bg" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <StatusBar centerLabel="캘린더" />

      {/* 상단 탭 토글 */}
      <div
        style={{
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          padding: '12px 14px 10px',
        }}
      >
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={active}
              style={{
                border: active ? '2px solid var(--cb-primary)' : BORDER,
                borderRadius: 14,
                background: active ? 'var(--cb-primary-soft)' : '#fff',
                color: active ? 'var(--cb-primary-deep)' : '#430A21',
                padding: '11px 0',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: active ? '0 3px 0 0 var(--cb-primary)' : '0 2px 0 0 #430A21',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 컨트롤 바: 연.월 (좌) + 공유/보기전환 (우) */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px 10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="이전 달"
            style={iconBtnStyle}
          >
            <ChevronLeft size={18} color="#430A21" strokeWidth={2.6} />
          </button>
          <div style={{ position: 'relative' }}>
            <select
              value={`${viewY}-${viewM}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                setViewY(y);
                setViewM(m);
              }}
              aria-label="연월 선택"
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                border: BORDER,
                borderRadius: 9999, // 알약 — 상단 탭/아이콘 버튼 라운드와 통일
                background: '#fff',
                color: '#430A21',
                fontSize: 16,
                fontWeight: 800,
                padding: '7px 30px 7px 14px',
                cursor: 'pointer',
                boxShadow: '0 2px 0 0 #430A21',
              }}
            >
              {monthOptions.map((o) => (
                <option key={`${o.y}-${o.m}`} value={`${o.y}-${o.m}`}>
                  {o.y}.{String(o.m + 1).padStart(2, '0')}
                </option>
              ))}
            </select>
            <ChevronRight
              size={14}
              color="#430A21"
              strokeWidth={2.6}
              style={{
                position: 'absolute',
                right: 9,
                top: '50%',
                transform: 'translateY(-50%) rotate(90deg)',
                pointerEvents: 'none',
              }}
            />
          </div>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label="다음 달"
            style={iconBtnStyle}
          >
            <ChevronRight size={18} color="#430A21" strokeWidth={2.6} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={handleShare}
            aria-label="공유"
            style={iconBtnStyle}
          >
            <Share2 size={17} color="#430A21" strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={() => setView('grid')}
            aria-label="그리드 보기"
            aria-pressed={view === 'grid'}
            style={view === 'grid' ? iconBtnActiveStyle : iconBtnStyle}
          >
            <LayoutGrid size={17} color={view === 'grid' ? '#fff' : '#430A21'} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            aria-label="리스트 보기"
            aria-pressed={view === 'list'}
            style={view === 'list' ? iconBtnActiveStyle : iconBtnStyle}
          >
            <ListIcon size={17} color={view === 'list' ? '#fff' : '#430A21'} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* 본문 — 그리드 뷰는 남는 높이를 캘린더가 모두 차지 (아랫선이 마스코트 바로 위) */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '0 14px 10px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {error && (
          <p style={emptyTextStyle}>기록을 불러오지 못했습니다.</p>
        )}
        {!error && loading && <p style={emptyTextStyle}>불러오는 중...</p>}
        {!error && empty && (
          <p style={emptyTextStyle}>
            {tab === 'reuse'
              ? '아직 인증 사진이 없습니다. 카메라로 첫 인증을 남겨보세요.'
              : '아직 야구네컷이 없습니다. 카메라로 첫 야구네컷을 만들어보세요.'}
          </p>
        )}

        {!error && !loading && !empty && view === 'grid' && (
          <MonthGrid cells={cells} byDay={byDay} onPickDay={setDetailKey} />
        )}

        {!error && !loading && !empty && view === 'list' && (
          <MonthList
            monthDays={monthDays}
            byDay={byDay}
            onPickDay={setDetailKey}
            onPickPhoto={setLightbox}
          />
        )}
      </div>

      {lightbox && <Lightbox entry={lightbox} onClose={() => setLightbox(null)} />}

      {/* 왼쪽 아래 장식 마스코트 — 캘린더 본문 아래, 바텀내비 위 */}
      <div
        aria-hidden
        style={{
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'flex-start',
          paddingLeft: 8,
          pointerEvents: 'none',
        }}
      >
        <img
          src={calendarMascot}
          alt=""
          style={{ width: 140, height: 'auto', display: 'block' }}
        />
      </div>

      <BottomNav />
    </div>
  );
}

// ── 월간 그리드 뷰 ───────────────────────────────────────────────
function MonthGrid({
  cells,
  byDay,
  onPickDay,
}: {
  cells: Array<{ day: number; key: string } | null>;
  byDay: Map<string, CalEntry[]>;
  onPickDay: (key: string) => void;
}) {
  return (
    <div style={{ border: BORDER, background: '#fff', boxShadow: '3px 3px 0 0 #430A21', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            style={{
              textAlign: 'center',
              padding: '7px 0',
              fontSize: 11,
              fontWeight: 800,
              color: i === 0 ? SUNDAY : '#5E1530',
              borderBottom: '2px solid #430A21',
              background: '#F8EAC9',
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 셀 — 남는 높이를 행이 균등 분배 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', flex: 1, minHeight: 0 }}>
        {cells.map((cell, idx) => {
          const col = idx % 7;
          const isSun = col === 0;
          if (!cell) {
            return <div key={`b-${idx}`} style={{ minHeight: 44, background: '#FAF5EF' }} />;
          }
          const dayEntries = byDay.get(cell.key);
          const rep = dayEntries?.[0];
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => dayEntries && onPickDay(cell.key)}
              disabled={!dayEntries}
              style={{
                position: 'relative',
                minHeight: 44,
                padding: 0,
                border: 'none',
                borderRight: col === 6 ? 'none' : '1px solid rgba(67,10,33,0.12)',
                borderBottom: '1px solid rgba(67,10,33,0.12)',
                background: rep ? '#F0E8E7' : '#fff',
                overflow: 'hidden',
                cursor: dayEntries ? 'pointer' : 'default',
              }}
            >
              {rep && (
                <span style={{ position: 'absolute', inset: 0 }}>
                  <EntryImage entry={rep} alt={`${prettyDay(cell.key)} 기록`} />
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(180deg, rgba(67,10,33,0.34) 0%, rgba(67,10,33,0) 42%)',
                    }}
                  />
                </span>
              )}
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  left: 4,
                  fontSize: 11,
                  fontWeight: 800,
                  color: rep ? '#fff' : isSun ? SUNDAY : '#5E1530',
                  textShadow: rep ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
                }}
              >
                {cell.day}
              </span>
              {dayEntries && dayEntries.length > 1 && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 3,
                    right: 4,
                    fontSize: 9,
                    fontWeight: 800,
                    color: '#fff',
                    background: 'var(--cb-primary)',
                    padding: '1px 4px',
                    border: '1px solid #430A21',
                  }}
                >
                  {dayEntries.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── 리스트 뷰 ────────────────────────────────────────────────────
function MonthList({
  monthDays,
  byDay,
  onPickDay,
  onPickPhoto,
}: {
  monthDays: string[];
  byDay: Map<string, CalEntry[]>;
  onPickDay: (key: string) => void;
  onPickPhoto: (entry: CalEntry) => void;
}) {
  if (monthDays.length === 0) {
    return <p style={emptyTextStyle}>이 달에는 기록이 없습니다.</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {monthDays.map((k) => {
        const dayEntries = byDay.get(k)!;
        return (
          <div key={k}>
            <button
              type="button"
              onClick={() => onPickDay(k)}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                background: 'transparent',
                border: 'none',
                padding: '0 2px 8px',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 800, color: '#430A21', letterSpacing: '0.04em' }}>
                {prettyDay(k)}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#8C6B73' }}>
                {dayEntries.length}장 ›
              </span>
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {dayEntries.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onPickPhoto(e)}
                  style={{
                    padding: 0,
                    border: BORDER,
                    background: '#F0E8E7',
                    aspectRatio: '1 / 1',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                >
                  <EntryImage entry={e} alt={`${prettyDay(k)} 기록`} />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 공유 스타일 ──────────────────────────────────────────────────
const iconBtnStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  border: BORDER,
  borderRadius: 9999, // 다른 화면 아이콘 버튼(원형)과 통일
  background: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: '0 2px 0 0 #430A21',
  padding: 0,
};

const iconBtnActiveStyle: React.CSSProperties = {
  ...iconBtnStyle,
  background: 'var(--cb-primary)',
  border: '2px solid var(--cb-primary)',
  boxShadow: '0 2px 0 0 #430A21',
};

const emptyTextStyle: React.CSSProperties = {
  textAlign: 'center',
  color: '#8C6B73',
  fontSize: 12,
  fontWeight: 600,
  padding: '40px 16px',
};
