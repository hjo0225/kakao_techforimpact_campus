const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize'
const KAKAO_LOGOUT_URL = 'https://kauth.kakao.com/oauth/logout'

export function getKakaoLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_KAKAO_REST_API_KEY,
    redirect_uri: import.meta.env.VITE_KAKAO_REDIRECT_URI,
    response_type: 'code',
  })
  return `${KAKAO_AUTH_URL}?${params.toString()}`
}

export function getKakaoLogoutUrl(): string {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_KAKAO_REST_API_KEY,
    logout_redirect_uri: import.meta.env.VITE_KAKAO_LOGOUT_REDIRECT_URI,
  })
  return `${KAKAO_LOGOUT_URL}?${params.toString()}`
}
