# Plan: 카카오 로그인 구현

## 목표
빈 페이지에 카카오 로그인 버튼 하나. 로그인 후 홈으로 이동.

## 흐름
1. /login 페이지 → 카카오 버튼 클릭
2. 카카오 OAuth 페이지로 redirect
3. /oauth/callback 으로 돌아옴 (code 파라미터 포함)
4. 백엔드 POST /auth/kakao 로 code 전송
5. 백엔드가 카카오 API로 토큰 교환 → 유저 정보 조회 → JWT 발급
6. 프론트엔드 JWT 저장 → / 홈으로 이동

## 범위
- [ ] frontend: LoginPage, OAuthCallbackPage, HomePage, authStore, kakaoAuth 유틸
- [ ] backend: AuthModule (AuthController, AuthService), JWT 발급
- [ ] .env.example 양쪽 작성

## 범위 외
- DB 연동 (유저 저장은 다음 plan)
- 토큰 갱신 (refresh token)
- WebView 브릿지 (앱 래핑 단계에서)
