import { Home, Map, Calendar, UserRound, type LucideIcon } from 'lucide-react';
import { useNavigation, type Route } from '../navigation';

interface Tab {
  label: string;
  icon: LucideIcon;
  path: Route;
}

// 촬영 버튼은 촬영 제어부로 이동 — 네비는 4개 탭만
const TABS: Tab[] = [
  { label: '홈', icon: Home, path: 'home' },
  { label: '지도', icon: Map, path: 'map' },
  { label: '캘린더', icon: Calendar, path: 'calendar' },
  { label: '프로필', icon: UserRound, path: 'profile' },
];

export function BottomNav() {
  const { currentRoute, navigate } = useNavigation();

  return (
    <nav
      aria-label="주요 화면"
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'flex-end',
        background: '#fff',
        // 전 화면 공통: 상단 실선 없이 흰 배경으로 콘텐츠와 연결
        borderTop: 'none',
        paddingTop: 8,
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
      }}
    >
      {TABS.map((tab) => {
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
      })}
    </nav>
  );
}
