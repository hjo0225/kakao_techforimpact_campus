import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { isTokenExpired } from './lib/jwt'
import MobileFrame from './app/MobileFrame'
import { TutorialOverlay } from './app/components/tutorial/TutorialOverlay'
import LoginPage from './pages/LoginPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import SharedCardPage from './pages/SharedCardPage'

const HomeScreen = lazy(() =>
  import('./app/components/screens/HomeScreen').then((m) => ({ default: m.HomeScreen })),
)
const MapScreen = lazy(() =>
  import('./app/components/screens/MapScreen').then((m) => ({ default: m.MapScreen })),
)
const CalendarScreen = lazy(() =>
  import('./app/components/screens/CalendarScreen').then((m) => ({ default: m.CalendarScreen })),
)
const ProfileScreen = lazy(() =>
  import('./app/components/screens/ProfileScreen').then((m) => ({ default: m.ProfileScreen })),
)
const AdminStoresScreen = lazy(() =>
  import('./app/components/screens/AdminStoresScreen').then((m) => ({ default: m.AdminStoresScreen })),
)

function ScreenFallback() {
  return <div className="cb-screen-fallback">불러오는 중...</div>
}

function PrivateLayout() {
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const expired = !!token && isTokenExpired(token)

  // 만료 토큰 정리 + WebView가 백그라운드에 오래 있다 돌아온 경우 재검사
  useEffect(() => {
    if (expired) logout()
    const recheck = () => {
      if (document.visibilityState !== 'visible') return
      const current = useAuthStore.getState().token
      if (current && isTokenExpired(current)) useAuthStore.getState().logout()
    }
    document.addEventListener('visibilitychange', recheck)
    return () => document.removeEventListener('visibilitychange', recheck)
  }, [expired, logout])

  if (!token || expired) return <Navigate to="/login" replace />
  return (
    <div className="cb-app-bg">
      <Outlet />
      <TutorialOverlay />
    </div>
  )
}

function RootRedirect() {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <Navigate to="/home" replace />
}

export default function App() {
  return (
    <MobileFrame>
      <Suspense fallback={<ScreenFallback />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/card/:token" element={<SharedCardPage />} />
          <Route element={<PrivateLayout />}>
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/map" element={<MapScreen />} />
            <Route path="/calendar" element={<CalendarScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/admin/stores" element={<AdminStoresScreen />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </MobileFrame>
  )
}
