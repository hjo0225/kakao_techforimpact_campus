import { getKakaoLoginUrl } from '../lib/kakaoAuth'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">그린스코어</h1>
          <p className="mt-2 text-sm text-gray-500">야구장 다회용기 챌린지</p>
        </div>

        <a
          href={getKakaoLoginUrl()}
          className="flex items-center gap-3 bg-[#FEE500] hover:bg-[#F5DC00] transition-colors rounded-xl px-6 py-3 w-72 justify-center"
        >
          <KakaoIcon />
          <span className="text-[#191919] font-semibold text-sm">카카오로 시작하기</span>
        </a>
      </div>
    </div>
  )
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M9 1C4.582 1 1 3.896 1 7.455c0 2.257 1.498 4.243 3.773 5.374L3.91 15.77a.25.25 0 0 0 .36.283L8.18 13.4c.271.024.546.037.82.037 4.418 0 8-2.896 8-6.455C17 3.896 13.418 1 9 1z"
        fill="#191919"
      />
    </svg>
  )
}
