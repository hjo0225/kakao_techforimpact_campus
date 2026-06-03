import { Home, Map, Calendar, UserRound, Camera, type LucideIcon } from 'lucide-react';
import { useNavigation, type Route } from '../navigation';
import { useApp } from '../AppContext';

interface Tab {
  label: string;
  icon: LucideIcon;
  path: Route;
}

const LEFT_TABS: Tab[] = [
  { label: '홈', icon: Home, path: 'home' },
  { label: '지도', icon: Map, path: 'map' },
];

const RIGHT_TABS: Tab[] = [
  { label: '캘린더', icon: Calendar, path: 'calendar' },
  { label: '프로필', icon: UserRound, path: 'profile' },
];

// 촬영 링 하늘색 (카메라 촬영 모드 한정)
const SKY = '#5BA7E5';

export function BottomNav() {
  const { currentRoute, navigate } = useNavigation();
  const { triggerCameraAction, captureMode } = useApp();

  const handleCamera = () => {
    // 홈(home = 카메라 화면)이거나 report에 이미 있으면 촬영 트리거, 아니면 이동
    if (currentRoute === 'home' || currentRoute === 'report') {
      triggerCameraAction();
    } else {
      navigate('report');
    }
  };

  const renderTab = (tab: Tab) => {
    const active = currentRoute === tab.path;
    const Icon = tab.icon;
    return (
      <button
        key={tab.path}
        type="button"
        aria-current={active ? 'page' : undefined}
        onClick={() => navigate(tab.path)}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          padding: '8px 0 6px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: active ? 'var(--cb-primary-deep)' : '#94A3B8',
        }}
      >
        <Icon size={22} strokeWidth={active ? 2.6 : 2} />
        <span style={{ fontSize: 10, fontWeight: active ? 800 : 600 }}>{tab.label}</span>
      </button>
    );
  };

  return (
    <nav
      aria-label="주요 화면"
      style={{
        position: 'relative',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'flex-end',
        background: '#fff',
        // 촬영 모드: 선 제거 → 위 촬영 제어부와 한 덩어리로 연결
        borderTop: captureMode ? 'none' : '2px solid #430A21',
        paddingTop: 8,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
      }}
    >
      {LEFT_TABS.map(renderTab)}

      {/* 중앙 FAB — 촬영 모드면 하늘색 링(촬영 버튼), 아니면 로즈 카메라 */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        {captureMode ? (
          <button
            type="button"
            aria-label="촬영"
            onClick={handleCamera}
            style={{
              width: 72,
              height: 72,
              marginTop: -24,
              borderRadius: '9999px',
              border: `6px solid ${SKY}`,
              background: '#fff',
              cursor: 'pointer',
              boxShadow: '0 4px 0 0 #430A21, 0 6px 14px rgba(67,10,33,0.22)',
            }}
          />
        ) : (
          <button
            type="button"
            aria-label="카메라"
            aria-current={currentRoute === 'report' ? 'page' : undefined}
            onClick={handleCamera}
            style={{
              width: 62,
              height: 62,
              marginTop: -26,
              borderRadius: '9999px',
              border: '2px solid #430A21',
              background: 'var(--cb-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 0 0 #430A21, 0 6px 14px rgba(200, 92, 119, 0.4)',
            }}
          >
            <Camera size={28} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {RIGHT_TABS.map(renderTab)}
    </nav>
  );
}
