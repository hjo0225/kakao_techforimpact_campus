import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      {user?.profileImage && (
        <img src={user.profileImage} alt="프로필" className="w-16 h-16 rounded-full" />
      )}
      <p className="text-lg font-semibold text-gray-800">{user?.nickname}님, 환영합니다!</p>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-400 underline"
      >
        로그아웃
      </button>
    </div>
  )
}
