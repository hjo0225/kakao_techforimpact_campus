import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { getMyStats, getMyLogs, type MyStats, type MyUsageLog } from '../lib/statsApi';
import {
  getMyAttendance,
  selectAttendance,
  cancelAttendance,
} from '../lib/attendanceApi';
import { summaryToGameInfo, type GameSummary } from '../lib/gameSummary';

export interface GameInfo {
  home: string;
  away: string;
  venue: string;
  time: string;
  inning: string;
  score: string;
  gameId?: string; // 백엔드 games.id — 직관(attendance) 영속화에 사용
  date?: string;   // YYYY-MM-DD — '그날'이 지났는지 판정에 사용
}

export interface SeatInfo {
  section: string;
  seatNumber: string;
}

export interface VisitRecord {
  date: string;
  game: GameInfo;
  seat: SeatInfo;
  result: '승' | '패' | '무' | '미정';
  score: string;
  seatCertified: boolean;
  reusableUsed: boolean;
  memo: string;
  shareCardCreated: boolean;
}

export type CertificationType = 'use' | 'return';

export interface CertificationLog {
  id: string;
  type: CertificationType;
  label: string;
  time: string;
  game: string;
  bonus: boolean;
}

export interface MissionProgress {
  useDone: boolean;
  returnDone: boolean;
  shared: boolean;
  completed: number;
  total: number;
  percent: number;
}

export interface EcoImpact {
  containers: number;
  wasteKg: number;
  carbonKg: number;
  seoulContributionPct: number;
}

interface AppState {
  selectedTeam: string | null;
  setSelectedTeam: (team: string | null) => void;
  selectedGame: GameInfo | null;
  setSelectedGame: (game: GameInfo | null) => void;
  // 경기 선택/해제 (백엔드 attendance에 영속) — 그날이 지나도록 해제 안 하면 직관으로 확정
  selectGame: (game: GameInfo) => void;
  cancelSelectedGame: () => void;
  seatInfo: SeatInfo;
  setSeatInfo: (seat: SeatInfo) => void;
  certificationLogs: CertificationLog[];
  addCertification: (type: CertificationType) => void;
  refreshStats: () => void;
  todayMission: MissionProgress;
  reusableUseCount: number;
  reusableReturnCount: number;
  totalCertCount: number;
  isTimesaleActive: boolean;
  ecoImpact: EcoImpact;
  visits: VisitRecord[];
  todaySeatCertified: boolean;
  setTodaySeatCertified: (v: boolean) => void;
  shareCardShared: boolean;
  setShareCardShared: (v: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

const EMPTY_STATS: MyStats = { points: 0, useCount: 0, returnCount: 0, totalCount: 0 };

function mapUsageLog(log: MyUsageLog): CertificationLog {
  return {
    id: log.id,
    type: log.kind === 'USE' ? 'use' : 'return',
    label: log.kind === 'USE' ? '사용 인증' : '반납 인증',
    time: new Date(log.scannedAt).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    game: log.gameLabel ?? '오늘 경기',
    bonus: false,
  };
}

// 직관 확정된 경기 요약 → 방문 기록. 좌석/메모/승패는 캡처 흐름이 없어 기본값.
function summaryToVisit(summary: GameSummary): VisitRecord {
  const game = summaryToGameInfo(summary);
  return {
    date: summary.date,
    game,
    seat: { section: '', seatNumber: '' },
    result: '미정',
    score: '',
    seatCertified: false,
    reusableUsed: false,
    memo: '',
    shareCardCreated: false,
  };
}

function getTimesaleStatus(game: GameInfo | null) {
  if (!game) return false;
  return game.inning.includes('7회') || game.inning.includes('8회');
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(() => {
    const { user, teamsByUserId } = useAuthStore.getState();
    return user ? teamsByUserId[user.id] ?? null : null;
  });
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null);
  const [seatInfo, setSeatInfo] = useState<SeatInfo>({ section: '', seatNumber: '' });
  const token = useAuthStore((s) => s.token);

  // 계정별 집계/타임라인의 단일 소스 — /stats/me, /stats/me/logs (JWT 기준 서버 데이터)
  const [stats, setStats] = useState<MyStats>(EMPTY_STATS);
  const [certificationLogs, setCertificationLogs] = useState<CertificationLog[]>([]);

  const refreshStats = useCallback(() => {
    if (!token) {
      setStats(EMPTY_STATS);
      setCertificationLogs([]);
      return;
    }
    getMyStats()
      .then(setStats)
      .catch(() => {});
    getMyLogs()
      .then((logs) => setCertificationLogs(logs.map(mapUsageLog)))
      .catch(() => {});
  }, [token]);

  // 토큰(계정) 변경 시 이전 계정 데이터가 남지 않도록 초기화 후 재조회
  useEffect(() => {
    setStats(EMPTY_STATS);
    setCertificationLogs([]);
    refreshStats();
  }, [refreshStats]);

  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [todaySeatCertified, setTodaySeatCertified] = useState(false);
  const [shareCardShared, setShareCardShared] = useState(false);

  // 계정별 직관(attendance) — 현재 선택 복원 + 직관 확정 방문 목록
  const refreshAttendance = useCallback(() => {
    if (!token) {
      setSelectedGame(null);
      setVisits([]);
      return;
    }
    getMyAttendance()
      .then((data) => {
        setSelectedGame(data.current ? summaryToGameInfo(data.current) : null);
        setVisits(data.visits.map(summaryToVisit));
      })
      .catch(() => {});
  }, [token]);

  // 로그인/계정 변경 시 서버에서 현재 선택과 방문 기록 복원
  useEffect(() => {
    refreshAttendance();
  }, [refreshAttendance]);

  // 경기 선택 — 즉시 로컬 반영 후 백엔드 영속화
  const selectGame = useCallback((game: GameInfo) => {
    setSelectedGame(game);
    if (game.gameId) {
      selectAttendance(game.gameId).catch(() => {});
    }
  }, []);

  // 선택 해제 — 직관 미인정
  const cancelSelectedGame = useCallback(() => {
    const gameId = selectedGame?.gameId;
    setSelectedGame(null);
    if (gameId) {
      cancelAttendance(gameId).catch(() => {});
    }
  }, [selectedGame]);

  const isTimesaleActive = getTimesaleStatus(selectedGame);

  const addCertification = useCallback((type: CertificationType) => {
    const bonus = getTimesaleStatus(selectedGame);
    const newLog: CertificationLog = {
      id: `cert-${Date.now()}`,
      type,
      label: type === 'use' ? '사용 인증' : '반납 인증',
      time: '방금',
      game: selectedGame ? `${selectedGame.home} vs ${selectedGame.away}` : '오늘 경기',
      bonus,
    };

    setCertificationLogs((prev) => [newLog, ...prev]);
    setVisits((prev) =>
      prev.map((v, index) => index === 0 ? { ...v, reusableUsed: true } : v)
    );
    // 서버 재조회 전까지 즉시 반영 (refreshStats가 서버 값으로 정합화)
    setStats((prev) => ({
      ...prev,
      useCount: prev.useCount + (type === 'use' ? 1 : 0),
      returnCount: prev.returnCount + (type === 'return' ? 1 : 0),
      totalCount: prev.totalCount + 1,
    }));
    refreshStats();
  }, [selectedGame, refreshStats]);

  const reusableUseCount = stats.useCount;
  const reusableReturnCount = stats.returnCount;
  const totalCertCount = stats.totalCount;
  const todayMission = useMemo<MissionProgress>(() => {
    const useDone = certificationLogs.some((log) => log.type === 'use');
    const returnDone = certificationLogs.some((log) => log.type === 'return');
    const steps = [useDone, returnDone, shareCardShared];
    const completed = steps.filter(Boolean).length;
    const total = steps.length;

    return {
      useDone,
      returnDone,
      shared: shareCardShared,
      completed,
      total,
      percent: Math.round((completed / total) * 100),
    };
  }, [certificationLogs, shareCardShared]);
  const ecoImpact = useMemo<EcoImpact>(() => {
    // 사용·반납 인증이 모두 된 짝만 1개의 다회용기로 카운트
    const containers = Math.min(reusableReturnCount, reusableUseCount);
    return {
      containers,
      wasteKg: Number((containers * 0.034).toFixed(2)),
      carbonKg: Number((containers * 0.11).toFixed(2)),
      seoulContributionPct: Number(((containers * 0.034) / 9800 * 100).toFixed(4)),
    };
  }, [reusableReturnCount, reusableUseCount]);

  const value = useMemo<AppState>(() => ({
    selectedTeam, setSelectedTeam,
    selectedGame, setSelectedGame,
    selectGame, cancelSelectedGame,
    seatInfo, setSeatInfo,
    certificationLogs, addCertification,
    refreshStats,
    todayMission,
    reusableUseCount, reusableReturnCount,
    totalCertCount,
    isTimesaleActive,
    ecoImpact,
    visits,
    todaySeatCertified, setTodaySeatCertified,
    shareCardShared, setShareCardShared,
  }), [
    addCertification,
    cancelSelectedGame,
    certificationLogs,
    ecoImpact,
    isTimesaleActive,
    refreshStats,
    reusableReturnCount,
    reusableUseCount,
    selectGame,
    totalCertCount,
    seatInfo,
    selectedGame,
    selectedTeam,
    shareCardShared,
    todaySeatCertified,
    todayMission,
    visits,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
