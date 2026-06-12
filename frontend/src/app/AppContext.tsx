import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';

// 홈 중앙 카메라 버튼의 용도 (BeReal 스타일 토글)
export type CameraPurpose = 'verify' | 'visit-card';

interface AppState {
  selectedTeam: string | null;
  setSelectedTeam: (team: string | null) => void;
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(() => {
    const { user, teamsByUserId } = useAuthStore.getState();
    return user ? teamsByUserId[user.id] ?? null : null;
  });

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

  const value = useMemo<AppState>(() => ({
    selectedTeam, setSelectedTeam,
    cameraPurpose, setCameraPurpose,
    registerCameraAction, triggerCameraAction,
    captureMode, setCaptureMode,
  }), [
    selectedTeam,
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
