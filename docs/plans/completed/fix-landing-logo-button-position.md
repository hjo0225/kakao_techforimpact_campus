# Fix: 로그인 화면 로고/버튼 위치 조정

## 배경
폰 실기기에서 로그인 화면을 보니 로고가 너무 낮고 "카카오로 시작하기" 버튼이 너무 높게 붙어 있음.

## 변경
`frontend/src/styles/design-system.css`
- `.cb-login-logo` `top: 6% → 3%` (로고를 위로 올림)
- `.cb-login-actions` `bottom: 2.8cm → 1.6cm` (버튼을 아래로 내림)

CSS 값 2개만 조정. 마크업/로직 변경 없음.

## 검증
- `./scripts/verify.sh` (build 통과)
- 폰/반응형 뷰에서 로고·버튼 간격 육안 확인

## 배포
main 푸시 → `deploy-frontend.yml` (시크릿 키 주입 빌드 + 카카오 SDK 임베드 가드 + Firebase Hosting).
