import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type EcoGrade,
  type EcoGradeProgress,
  getEcoGrade,
  getNextGradePoints,
} from './ecoGrades';
import { DEFAULT_AVATAR_CONFIG, type AvatarConfig } from './avatar';
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
  date: string; // 'YYYY-MM-DD'
  game: GameInfo;
  seat: SeatInfo;
  result: '승' | '패' | '무' | '미정';
  score: string;
  reportCount: number;
  seatCertified: boolean;
  reusableUsed: boolean;
  memo: string;
  shareCardCreated: boolean;
}

export interface ReportLog {
  id: string;
  location: string;
  status: string;
  time: string;
  pts: number;
}

export type CertificationType = 'use' | 'return';

export interface CertificationLog {
  id: string;
  type: CertificationType;
  label: string;
  time: string;
  game: string;
  pts: number;
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
  points: number;
  reportCount: number;
  addReport: () => void;
  reportLogs: ReportLog[];
  certificationLogs: CertificationLog[];
  addCertification: (type: CertificationType, score: number) => number;
  refreshStats: () => void;
  todayMission: MissionProgress;
  reusableUseCount: number;
  reusableReturnCount: number;
  isTimesaleActive: boolean;
  ecoImpact: EcoImpact;
  ecoGrade: EcoGrade;
  getNextGradeInfo: () => EcoGradeProgress;
  visits: VisitRecord[];
  todaySeatCertified: boolean;
  setTodaySeatCertified: (v: boolean) => void;
  shareCardShared: boolean;
  setShareCardShared: (v: boolean) => void;
  avatarConfig: AvatarConfig;
  setAvatarConfig: (config: AvatarConfig) => void;
}

const AppContext = createContext<AppState | null>(null);

const SAMPLE_VISITS: VisitRecord[] = [
  {
    date: '2026-04-21',
    game: { home: 'LG', away: '두산', venue: '잠실 야구장', time: '18:30', inning: '7회말', score: '5 : 3' },
    seat: { section: '1루 외야', seatNumber: 'A-12' },
    result: '승', score: '5 : 3',
    reportCount: 2, seatCertified: false, reusableUsed: true,
    memo: '오늘 치킨이 맛있었음',
    shareCardCreated: false,
  },
  {
    date: '2026-04-15',
    game: { home: 'LG', away: 'SSG', venue: '잠실 야구장', time: '18:30', inning: '9회', score: '3 : 1' },
    seat: { section: '3루 응원석', seatNumber: 'B-5' },
    result: '승', score: '3 : 1',
    reportCount: 1, seatCertified: true, reusableUsed: false,
    memo: '',
    shareCardCreated: true,
  },
  {
    date: '2026-04-08',
    game: { home: '두산', away: 'LG', venue: '잠실 야구장', time: '18:30', inning: '9회', score: '2 : 4' },
    seat: { section: '1루 내야', seatNumber: 'C-22' },
    result: '패', score: '2 : 4',
    reportCount: 0, seatCertified: true, reusableUsed: true,
    memo: '비 와서 힘들었지만 좋았음',
    shareCardCreated: true,
  },
];

const SAMPLE_REPORT_LOGS: ReportLog[] = [
  { id: '1', location: '3루 통로 쓰레기통', status: '가득 찼어요', time: '방금', pts: 5 },
  { id: '2', location: '1루 게이트 옆 수거함', status: '거의 다 찼어요', time: '1시간 전', pts: 5 },
  { id: '3', location: '3번 게이트 쓰레기통', status: '넘쳐흘러요', time: '어제', pts: 5 },
];

const SAMPLE_CERTIFICATION_LOGS: CertificationLog[] = [
  {
    id: 'cert-1',
    type: 'use',
    label: '사용 인증',
    time: '18:42',
    game: 'LG vs 두산',
    pts: 50,
    bonus: false,
  },
  {
    id: 'cert-2',
    type: 'return',
    label: '반납 인증',
    time: '20:18',
    game: 'LG vs 두산',
    pts: 100,
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
  const [points, setPoints] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const token = useAuthStore((s) => s.token);

  const refreshStats = useCallback(() => {
    if (!token) {
      setPoints(0);
      return;
    }
    getMyStats()
      .then((stats) => setPoints(stats.points))
      .catch(() => setPoints(0));
  }, [token]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);
  const [reportLogs, setReportLogs] = useState<ReportLog[]>(SAMPLE_REPORT_LOGS);
  const [certificationLogs, setCertificationLogs] = useState<CertificationLog[]>(SAMPLE_CERTIFICATION_LOGS);
  const [visits, setVisits] = useState<VisitRecord[]>(SAMPLE_VISITS);
  const [todaySeatCertified, setTodaySeatCertified] = useState(false);
  const [shareCardShared, setShareCardShared] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);

  const isTimesaleActive = getTimesaleStatus(selectedGame);

  const addCertification = useCallback((type: CertificationType, score: number) => {
    const bonus = getTimesaleStatus(selectedGame);
    const newLog: CertificationLog = {
      id: `cert-${Date.now()}`,
      type,
      label: type === 'use' ? '사용 인증' : '반납 인증',
      time: '방금',
      game: selectedGame ? `${selectedGame.home} vs ${selectedGame.away}` : '오늘 경기',
      pts: score,
      bonus,
    };

    setPoints((prev) => prev + score);
    setCertificationLogs((prev) => [newLog, ...prev]);
    setVisits((prev) =>
      prev.map((v, index) => index === 0 ? { ...v, reusableUsed: true } : v)
    );
    refreshStats();

    return score;
  }, [selectedGame, refreshStats]);

  const addReport = useCallback(() => {
    setReportCount((prev) => prev + 1);
    const newLog: ReportLog = {
      id: Date.now().toString(),
      location: seatInfo.section ? `${seatInfo.section} 쓰레기통` : '3루 통로 쓰레기통',
      status: '가득 찼어요',
      time: '방금',
      pts: 0,
    };
    setReportLogs((prev) => [newLog, ...prev]);
    // Update today's visit if exists
    const today = new Date().toISOString().split('T')[0];
    setVisits((prev) =>
      prev.map((v) => v.date === today ? { ...v, reportCount: v.reportCount + 1 } : v)
    );
  }, [seatInfo.section]);

  const ecoGrade = getEcoGrade(points);
  const getNextGradeInfo = useCallback(() => getNextGradePoints(points), [points]);
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
    const containers = reusableReturnCount + reusableUseCount;
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
    points,
    reportCount, addReport, reportLogs,
    certificationLogs, addCertification,
    refreshStats,
    todayMission,
    reusableUseCount, reusableReturnCount,
    isTimesaleActive,
    ecoImpact,
    ecoGrade, getNextGradeInfo,
    visits,
    todaySeatCertified, setTodaySeatCertified,
    shareCardShared, setShareCardShared,
    avatarConfig, setAvatarConfig,
  }), [
    addCertification,
    addReport,
    avatarConfig,
    certificationLogs,
    ecoImpact,
    ecoGrade,
    getNextGradeInfo,
    isTimesaleActive,
    points,
    refreshStats,
    reportCount,
    reportLogs,
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

export { getEcoGrade };
