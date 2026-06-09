import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { getMyStats, getMyLogs, type MyStats, type MyUsageLog } from '../lib/statsApi';

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

// 홈 중앙 카메라 버튼의 용도 (BeReal 스타일 토글)
export type CameraPurpose = 'verify' | 'visit-card';

interface AppState {
  selectedTeam: string | null;
  setSelectedTeam: (team: string | null) => void;
  certificationLogs: CertificationLog[];
  addCertification: (type: CertificationType) => void;
  refreshStats: () => void;
  todayMission: MissionProgress;
  reusableUseCount: number;
  reusableReturnCount: number;
  totalCertCount: number;
  ecoImpact: EcoImpact;
  shareCardShared: boolean;
  setShareCardShared: (v: boolean) => void;
  cameraPurpose: CameraPurpose;
  setCameraPurpose: (p: CameraPurpose) => void;
  // 중앙 카메라 버튼이 호출할 화면별 촬영 액션 (예: 직관카드 파일 선택)
  registerCameraAction: (fn: (() => void) | null) => void;
  triggerCameraAction: () => void;
  // 라이브 카메라 촬영 모드 — true면 BottomNav가 선을 없애고 FAB를 하늘색 촬영 링으로 전환
  captureMode: boolean;
  setCaptureMode: (v: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

const EMPTY_STATS: MyStats = { useCount: 0, returnCount: 0, totalCount: 0 };

function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;

  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return `${Math.floor(diffMin / 60)}시간 전`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    const t = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `어제 ${t}`;
  }

  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 7) return `${diffDays}일 전`;

  const sameYear = date.getFullYear() === now.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return sameYear ? `${m}.${d}` : `${date.getFullYear()}.${m}.${d}`;
}

function mapUsageLog(log: MyUsageLog): CertificationLog {
  return {
    id: log.id,
    type: log.kind === 'USE' ? 'use' : 'return',
    label: log.kind === 'USE' ? '사용 인증' : '반납 인증',
    time: formatRelativeTime(log.scannedAt),
    game: log.gameLabel ?? '오늘 경기',
    bonus: false,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(() => {
    const { user, teamsByUserId } = useAuthStore.getState();
    return user ? teamsByUserId[user.id] ?? null : null;
  });
  const token = useAuthStore((s) => s.token);

  // 계정별 집계/타임라인의 단일 소스 — /stats/me, /stats/me/logs (JWT 기준 서버 데이터)
  const [stats, setStats] = useState<MyStats>(EMPTY_STATS);
  const [certificationLogs, setCertificationLogs] = useState<CertificationLog[]>([]);
  const [shareCardShared, setShareCardShared] = useState(false);
  // 기본 토글: 야구네컷(visit-card). 단, 용기인증을 해야 잠금 해제됨.
  const [cameraPurpose, setCameraPurpose] = useState<CameraPurpose>('visit-card');
  const [captureMode, setCaptureMode] = useState(false);

  const cameraActionRef = useRef<(() => void) | null>(null);
  const registerCameraAction = useCallback((fn: (() => void) | null) => {
    cameraActionRef.current = fn;
  }, []);
  const triggerCameraAction = useCallback(() => {
    cameraActionRef.current?.();
  }, []);

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

  const addCertification = useCallback((type: CertificationType) => {
    const newLog: CertificationLog = {
      id: `cert-${Date.now()}`,
      type,
      label: type === 'use' ? '사용 인증' : '반납 인증',
      time: '방금',
      game: '오늘 경기',
      bonus: false,
    };
    setCertificationLogs((prev) => [newLog, ...prev]);
    // 서버 재조회 전까지 즉시 반영 (refreshStats가 서버 값으로 정합화)
    setStats((prev) => ({
      useCount: prev.useCount + (type === 'use' ? 1 : 0),
      returnCount: prev.returnCount + (type === 'return' ? 1 : 0),
      totalCount: prev.totalCount + 1,
    }));
    refreshStats();
  }, [refreshStats]);

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
    certificationLogs, addCertification,
    refreshStats,
    todayMission,
    reusableUseCount, reusableReturnCount,
    totalCertCount,
    ecoImpact,
    shareCardShared, setShareCardShared,
    cameraPurpose, setCameraPurpose,
    registerCameraAction, triggerCameraAction,
    captureMode, setCaptureMode,
  }), [
    addCertification,
    certificationLogs,
    ecoImpact,
    refreshStats,
    reusableReturnCount,
    reusableUseCount,
    totalCertCount,
    selectedTeam,
    shareCardShared,
    todayMission,
    cameraPurpose,
    registerCameraAction,
    triggerCameraAction,
    captureMode,
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
