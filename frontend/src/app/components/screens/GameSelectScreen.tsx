import { useEffect, useMemo, useState } from 'react';
import { useApp, type GameInfo } from '../../AppContext';
import { X, CheckCircle } from 'lucide-react';
import { useNavigation } from '../../navigation';
import { TeamBadge } from '../TeamBadge';
import { cx } from '../../classNames';
import { Button, Screen, ScreenHeader, ScrollArea } from '../design-system';
import { api, ApiError } from '../../../lib/apiClient';
import { getTeamBrand } from '../../teamBrand';

interface ApiTeam {
  code: string;
  displayName: string;
}

interface ApiGame {
  id: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM
  awayTeam: ApiTeam;
  homeTeam: ApiTeam;
  venue: string;
  status: string;
}

interface UiGame extends GameInfo {
  id: string;
  date: string;
}

// 백엔드의 짧은 venue("잠실")을 화면용 풀네임으로 매핑
const VENUE_LABEL: Record<string, string> = {
  잠실: '잠실 야구장',
  광주: '광주 KIA챔피언스필드',
  고척: '고척 스카이돔',
  대전: '대전 한화생명이글스파크',
  포항: '포항 야구장',
  사직: '사직 야구장',
  수원: '수원 KT위즈파크',
  문학: '인천 SSG랜더스필드',
  창원: 'NC파크',
  대구: '대구 삼성라이온즈파크',
};

function toIsoDate(d: Date): string {
  // 로컬 시간 기준 YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function formatDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${days[d.getDay()]}) · KBO 리그`;
}

function mapApiToUi(g: ApiGame): UiGame {
  const homeBrand = getTeamBrand(g.homeTeam.displayName);
  const awayBrand = getTeamBrand(g.awayTeam.displayName);
  return {
    id: g.id,
    date: g.date,
    home: homeBrand.shortName,
    away: awayBrand.shortName,
    venue: VENUE_LABEL[g.venue] ?? g.venue,
    time: g.startTime,
    inning: '',          // 스케줄 단계 — 라이브 데이터 없음
    score: '',
  };
}

type DateTab = 'today' | 'tomorrow' | 'all';

function formatShort(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
}

export function GameSelectScreen() {
  const { navigate } = useNavigation();
  const { selectedTeam, setSelectedGame } = useApp();
  const [activeTab, setActiveTab] = useState<DateTab>('all');
  const [games, setGames] = useState<UiGame[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // `now`를 state로 보관 → 자정마다 갱신해 today/tomorrow가 자동으로 다음 날로 이동
  const [now, setNow] = useState<Date>(() => new Date());

  const todayIso = toIsoDate(now);
  const tomorrowIso = toIsoDate(new Date(now.getTime() + 86_400_000));

  // 다음 자정에 now를 다시 찍어서 모든 파생값(라벨/필터/fetch)을 새 날짜로 갱신
  useEffect(() => {
    const next = new Date(now);
    next.setHours(24, 0, 1, 0); // 00:00:01 of next day (1초 여유)
    const ms = next.getTime() - Date.now();
    const t = setTimeout(() => setNow(new Date()), Math.max(ms, 1000));
    return () => clearTimeout(t);
  }, [now]);

  // 날짜가 바뀌면 from을 새 today로 다시 가져옴
  useEffect(() => {
    let cancelled = false;
    setGames(null);
    setError(null);
    api
      .get<ApiGame[]>(`/games?from=${todayIso}`)
      .then((data) => {
        if (!cancelled) setGames(data.map(mapApiToUi));
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof ApiError ? `${err.status} ${err.message}` : String(err);
        console.error('[GameSelect] /games 호출 실패:', err);
        setError(msg);
      });
    return () => {
      cancelled = true;
    };
  }, [todayIso]);

  const tabs: { id: DateTab; label: string }[] = [
    { id: 'today', label: `오늘 ${formatShort(todayIso)}` },
    { id: 'tomorrow', label: `내일 ${formatShort(tomorrowIso)}` },
    { id: 'all', label: '일정' },
  ];

  const filtered = useMemo(() => {
    if (!games) return null;
    if (activeTab === 'today') return games.filter((g) => g.date === todayIso);
    if (activeTab === 'tomorrow') return games.filter((g) => g.date === tomorrowIso);
    return games;
  }, [games, activeTab, todayIso, tomorrowIso]);

  // 응원팀 매칭 — selectedTeam은 풀네임 또는 단축명
  const isFavorite = (game: UiGame) => {
    if (!selectedTeam) return false;
    const brand = getTeamBrand(selectedTeam);
    return game.home === brand.shortName || game.away === brand.shortName;
  };

  const handleSelect = (game: UiGame) => {
    setSelectedGame({
      home: game.home,
      away: game.away,
      venue: game.venue,
      time: game.time,
      inning: '',
      score: '',
    });
    navigate('home');
  };

  // 날짜별 그룹핑 (전체 일정 탭에서 사용)
  const grouped = useMemo(() => {
    if (!filtered) return [];
    const buckets = new Map<string, UiGame[]>();
    for (const g of filtered) {
      const arr = buckets.get(g.date) ?? [];
      arr.push(g);
      buckets.set(g.date, arr);
    }
    return Array.from(buckets.entries()).map(([date, items]) => ({ date, items }));
  }, [filtered]);

  return (
    <Screen>
      <ScreenHeader
        title="관람 경기 선택"
        actions={(
          <button
            type="button"
            onClick={() => navigate('home')}
            className="cb-icon-button"
            aria-label="닫기"
          >
            <X size={22} />
          </button>
        )}
      />

      <div className="cb-chip-row" role="tablist" aria-label="경기 날짜">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cx('cb-chip', activeTab === tab.id && 'is-active')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ScrollArea stack>
        {error && (
          <p className="cb-game-date" style={{ color: '#b91c1c' }}>
            일정을 불러오지 못했습니다 — {error}
          </p>
        )}

        {!error && games === null && (
          <p className="cb-game-date">일정 불러오는 중…</p>
        )}

        {!error && filtered && filtered.length === 0 && (
          <p className="cb-game-date">선택한 날짜에 예정된 경기가 없습니다.</p>
        )}

        {grouped.map(({ date, items }) => (
          <div key={date}>
            <p className="cb-game-date">{formatDateLabel(date)}</p>
            {items.map((game) => {
              const fav = isFavorite(game);
              return (
                <div
                  key={game.id}
                  className={cx('cb-game-card', fav && 'is-favorite')}
                >
                  <div className="cb-game-card__head">
                    <div>
                      <div className="cb-game-card__match">
                        <div className="cb-game-card__teams">
                          <TeamBadge teamName={game.home} size={28} />
                          <TeamBadge teamName={game.away} size={28} />
                        </div>
                        <span className="cb-game-card__title">
                          {game.home} vs {game.away}
                        </span>
                        {fav && (
                          <span className="cb-badge">응원팀</span>
                        )}
                      </div>
                      <p className="cb-game-card__meta">{game.venue} · {game.time}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSelect(game)}
                    variant={fav ? 'primary' : 'secondary'}
                    fullWidth
                  >
                    <CheckCircle size={15} />
                    이 경기 선택
                  </Button>
                </div>
              );
            })}
          </div>
        ))}
      </ScrollArea>

      <div className="cb-footer-note">
        <p>선택한 경기는 종료 1시간 후 자동으로 해제됩니다</p>
      </div>
    </Screen>
  );
}
