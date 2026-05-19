import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { getMyStats } from '../lib/statsApi';

export interface GameInfo {
  home: string;
  away: string;
  venue: string;
  time: string;
  inning: string;
  score: string;
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
  seatInfo: SeatInfo;
  setSeatInfo: (seat: SeatInfo) => void;
  certificationLogs: CertificationLog[];
  addCertification: (type: CertificationType) => void;
  refreshStats: () => void;
  todayMission: MissionProgress;
  reusableUseCount: number;
  reusableReturnCount: number;
  isTimesaleActive: boolean;
  ecoImpact: EcoImpact;
  visits: VisitRecord[];
  todaySeatCertified: boolean;
  setTodaySeatCertified: (v: boolean) => void;
  shareCardShared: boolean;
  setShareCardShared: (v: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

const SAMPLE_VISITS: VisitRecord[] = [
  {
    date: '2026-04-21',
    game: { home: 'LG', away: '두산', venue: '잠실 야구장', time: '18:30', inning: '7회말', score: '5 : 3' },
    seat: { section: '1루 외야', seatNumber: 'A-12' },
    result: '승', score: '5 : 3',
    seatCertified: false, reusableUsed: true,
    memo: '오늘 치킨이 맛있었음',
    shareCardCreated: false,
  },
  {
    date: '2026-04-15',
    game: { home: 'LG', away: 'SSG', venue: '잠실 야구장', time: '18:30', inning: '9회', score: '3 : 1' },
    seat: { section: '3루 응원석', seatNumber: 'B-5' },
    result: '승', score: '3 : 1',
    seatCertified: true, reusableUsed: false,
    memo: '',
    shareCardCreated: true,
  },
  {
    date: '2026-04-08',
    game: { home: '두산', away: 'LG', venue: '잠실 야구장', time: '18:30', inning: '9회', score: '2 : 4' },
    seat: { section: '1루 내야', seatNumber: 'C-22' },
    result: '패', score: '2 : 4',
    seatCertified: true, reusableUsed: true,
    memo: '비 와서 힘들었지만 좋았음',
    shareCardCreated: true,
  },
];

const SAMPLE_CERTIFICATION_LOGS: CertificationLog[] = [
  {
    id: 'cert-1',
    type: 'use',
    label: '사용 인증',
    time: '18:42',
    game: 'LG vs 두산',
    bonus: false,
  },
  {
    id: 'cert-2',
    type: 'return',
    label: '반납 인증',
    time: '20:18',
    game: 'LG vs 두산',
    bonus: true,
  },
];

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

  const refreshStats = useCallback(() => {
    if (!token) return;
    getMyStats().catch(() => {});
  }, [token]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const [certificationLogs, setCertificationLogs] = useState<CertificationLog[]>(SAMPLE_CERTIFICATION_LOGS);
  const [visits, setVisits] = useState<VisitRecord[]>(SAMPLE_VISITS);
  const [todaySeatCertified, setTodaySeatCertified] = useState(false);
  const [shareCardShared, setShareCardShared] = useState(false);

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
    refreshStats();
  }, [selectedGame, refreshStats]);

  const reusableUseCount = certificationLogs.filter((log) => log.type === 'use').length;
  const reusableReturnCount = certificationLogs.filter((log) => log.type === 'return').length;
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
    seatInfo, setSeatInfo,
    certificationLogs, addCertification,
    refreshStats,
    todayMission,
    reusableUseCount, reusableReturnCount,
    isTimesaleActive,
    ecoImpact,
    visits,
    todaySeatCertified, setTodaySeatCertified,
    shareCardShared, setShareCardShared,
  }), [
    addCertification,
    certificationLogs,
    ecoImpact,
    isTimesaleActive,
    refreshStats,
    reusableReturnCount,
    reusableUseCount,
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
