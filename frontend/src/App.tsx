import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import MobileFrame from './app/MobileFrame'
import LoginPage from './pages/LoginPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'

const TeamSelectScreen = lazy(() =>
  import('./app/components/screens/TeamSelectScreen').then((m) => ({ default: m.TeamSelectScreen })),
)
const HomeScreen = lazy(() =>
  import('./app/components/screens/HomeScreen').then((m) => ({ default: m.HomeScreen })),
)
const GameSelectScreen = lazy(() =>
  import('./app/components/screens/GameSelectScreen').then((m) => ({ default: m.GameSelectScreen })),
)
const MapScreen = lazy(() =>
  import('./app/components/screens/MapScreen').then((m) => ({ default: m.MapScreen })),
)
const ReportScreen = lazy(() =>
  import('./app/components/screens/ReportScreen').then((m) => ({ default: m.ReportScreen })),
)
const RecordScreen = lazy(() =>
  import('./app/components/screens/RecordScreen').then((m) => ({ default: m.RecordScreen })),
)
const RankingScreen = lazy(() =>
  import('./app/components/screens/RankingScreen').then((m) => ({ default: m.RankingScreen })),
)
const AccountScreen = lazy(() =>
  import('./app/components/screens/AccountScreen').then((m) => ({ default: m.AccountScreen })),
)
const AvatarCustomizeScreen = lazy(() =>
  import('./app/components/screens/AvatarCustomizeScreen').then((m) => ({
    default: m.AvatarCustomizeScreen,
  })),
)

function ScreenFallback() {
  return <div className="cb-screen-fallback">불러오는 중...</div>
}

function PrivateLayout() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const teamsByUserId = useAuthStore((s) => s.teamsByUserId)
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace />
  const team = user ? teamsByUserId[user.id] : null
  if (!team && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  if (team && location.pathname === '/onboarding') {
    return <Navigate to="/home" replace />
  }
  return <Outlet />
}

function RootRedirect() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const teamsByUserId = useAuthStore((s) => s.teamsByUserId)
  if (!token) return <Navigate to="/login" replace />
  const team = user ? teamsByUserId[user.id] : null
  return <Navigate to={team ? '/home' : '/onboarding'} replace />
}

export default function App() {
  return (
    <MobileFrame>
      <Suspense fallback={<ScreenFallback />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route element={<PrivateLayout />}>
            <Route path="/onboarding" element={<TeamSelectScreen />} />
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/game-select" element={<GameSelectScreen />} />
            <Route path="/map" element={<MapScreen />} />
            <Route path="/report" element={<ReportScreen />} />
            <Route path="/record" element={<RecordScreen />} />
            <Route path="/ranking" element={<RankingScreen />} />
            <Route path="/account" element={<AccountScreen />} />
            <Route path="/avatar" element={<AvatarCustomizeScreen />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </MobileFrame>
  )
}
