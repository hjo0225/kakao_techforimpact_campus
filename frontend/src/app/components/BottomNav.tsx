import { Home, Map, Calendar, UserRound, Camera, type LucideIcon } from 'lucide-react';
import { useNavigation, type Route } from '../navigation';

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

export function BottomNav() {
  const { currentRoute, navigate } = useNavigation();

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
        borderTop: '2px solid #430A21',
        paddingTop: 8,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
      }}
    >
      {LEFT_TABS.map(renderTab)}

      {/* 중앙 카메라 FAB — 인증/직관카드 (홈 토글로 용도 전환) */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          aria-label="카메라"
          aria-current={currentRoute === 'report' ? 'page' : undefined}
          onClick={() => navigate('report')}
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
      </div>

      {RIGHT_TABS.map(renderTab)}
    </nav>
  );
}
