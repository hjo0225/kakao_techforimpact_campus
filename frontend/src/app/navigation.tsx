import { createContext, useCallback, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type Route =
  | 'login'
  | 'onboarding'
  | 'home'
  | 'game-select'
  | 'map'
  | 'report'
  | 'record'
  | 'ranking'
  | 'programs'
  | 'account'
  | 'avatar'
  | 'ar';

interface NavigationState {
  currentRoute: Route;
  navigate: (route: Route) => void;
}

const NavigationContext = createContext<NavigationState | null>(null);

export const ROUTE_PATHS: Record<Route, string> = {
  login: '/login',
  onboarding: '/onboarding',
  home: '/home',
  'game-select': '/game-select',
  map: '/map',
  report: '/report',
  record: '/record',
  ranking: '/ranking',
  programs: '/programs',
  account: '/account',
  avatar: '/avatar',
  ar: '/ar',
};

const PATH_ROUTES = Object.entries(ROUTE_PATHS).reduce<Record<string, Route>>((acc, [route, path]) => {
  acc[path] = route as Route;
  return acc;
}, {});

export function getRouteFromPath(pathname: string): Route {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PATH_ROUTES[normalizedPath] ?? 'login';
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const routerNavigate = useNavigate();
  const location = useLocation();

  const currentRoute = getRouteFromPath(location.pathname);
  const navigate = useCallback((route: Route) => {
    routerNavigate(ROUTE_PATHS[route]);
  }, [routerNavigate]);

  const value = useMemo<NavigationState>(() => ({
    currentRoute,
    navigate,
  }), [currentRoute, navigate]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used inside NavigationProvider');
  }
  return context;
}
