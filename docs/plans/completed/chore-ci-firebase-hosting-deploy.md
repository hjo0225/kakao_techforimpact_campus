# Plan: 프론트엔드 Firebase Hosting 자동배포 (GitHub Actions + 시크릿)

## 배경 / 문제
배포가 각자 로컬 `npm run build` + `firebase deploy` 수동이라, `frontend/.env.production`(gitignore, 사람마다 다름)에
`VITE_KAKAO_MAPS_JS_KEY`가 없는 사람이 배포하면 Vite가 키를 `undefined`로 상수폴딩 →
지도 SDK 로더가 죽은 코드로 제거됨 → 배포본에 지도 키/코드가 통째로 빠짐. (실측 확인)

## 목표
main 푸시 시 **GitHub Actions가 키를 주입해 빌드+배포**. 누가 푸시해도 동일하게 키 포함 배포되게 한다.

## 이미 갖춰진 것 (재사용)
- SA `github-actions-deployer@cleanballtrio` — `roles/firebasehosting.admin` 보유
- Workload Identity Federation 시크릿: `GCP_WIF_PROVIDER`, `GCP_SA_EMAIL` (키 파일 불필요, 키리스)
- 시크릿 `VITE_KAKAO_REST_API_KEY` 존재

## 추가 작업
1. 시크릿 `VITE_KAKAO_MAPS_JS_KEY` 추가 (값은 `.env.production`과 동일)
2. `.github/workflows/deploy-frontend.yml` 생성
   - trigger: push → main (paths: `frontend/**`, `firebase.json`, 워크플로 자신), `workflow_dispatch`
   - `permissions: id-token: write` (WIF 필수)
   - Node 22 + `npm ci` (frontend)
   - build: VITE_* env 주입 (키 2개는 시크릿, prod URL 3개는 리터럴)
   - `google-github-actions/auth@v2` (WIF) → `firebase deploy --only hosting --project cleanballtrio`

## 비밀로 둘 값 / 공개 값
- 시크릿: `VITE_KAKAO_REST_API_KEY`, `VITE_KAKAO_MAPS_JS_KEY` (클라이언트 공개 키지만 관리 일원화)
- 리터럴(워크플로): redirect URI 2개, `VITE_API_BASE_URL` (prod 상수, 비밀 아님)

## 완료 기준
- main 푸시 시 Actions가 빌드+배포 성공
- 배포본 번들에 `dapi.kakao.com` + 맵 키 포함 (지도 동작)
- 로컬 수동 배포 의존성 제거 (수동도 가능하되 기본은 CI)

## 후속 (선택)
- 백엔드(Cloud Run) 자동배포 워크플로 (SA에 run.admin 등 이미 부여돼 있음)
