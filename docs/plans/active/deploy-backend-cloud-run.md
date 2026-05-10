# Plan: Backend GCP Cloud Run 배포

## 목표
NestJS backend를 GCP Cloud Run에 배포해서 공개 HTTPS URL 확보. Firebase Hosting에 올릴 frontend가 prod에서 카카오 로그인까지 동작하게 만든다.

## 결정 사항 (확정)
- **GCP 프로젝트 ID**: `cleanballtrio` (신규 생성, 점유됐을 시 `cleanballtrio-2026` 등 suffix)
- **서비스 이름**: `cleanballtrio-api`
- **Region**: `asia-northeast3` (서울)
- **GCP 계정**: `jeongoheo0225@gmail.com` (이미 `gcloud auth login` 완료)
- **Container 베이스**: `node:22-alpine` (multi-stage)
- **빌드 방식**: Cloud Build (`gcloud run deploy --source backend`) — Dockerfile 자동 인식, Artifact Registry 자동 푸시
- **시크릿 관리**: 1차는 `--set-env-vars` 평문 주입(빠름). 2차에서 Secret Manager로 이전
- **CORS**: `CORS_ORIGIN` 환경변수, 콤마 구분 다중 origin (dev + prod 동시 허용)

---

## 📍 현재 진행 상황 (2026-05-10)

### ✅ 완료 — 코드 준비
- [x] `backend/src/main.ts` — CORS origin을 `CORS_ORIGIN` env에서 읽음 (콤마 구분 다중 허용)
- [x] `backend/Dockerfile` — multi-stage (deps → build → runtime), node:22-alpine, USER node, EXPOSE 8080
- [x] `backend/.dockerignore` — node_modules, dist, .env, test, *.spec.ts 등 제외
- [x] `backend/.env.example` — `CORS_ORIGIN` 자리 + PORT 주석 추가
- [x] 로컬 `npm run build` 통과 확인
- [x] `gcloud --version` = 564.0.0 확인, `jeongoheo0225@gmail.com` 인증 OK

### ⏳ 대기 중 — 사용자 인터랙티브 (auto mode classifier가 차단해서 직접 실행 필요)

다음 세션을 시작할 때, **세션 프롬프트에 `!` 접두사로 한 줄씩 실행**:

```
! gcloud projects create cleanballtrio --name="CleanBallTrio"
```

> 만약 ID가 점유됐다면 `cleanballtrio-2026` 같은 suffix로 재시도. 성공한 ID를 이 plan의 "결정 사항" 섹션에 갱신.

```
! gcloud billing accounts list
```
→ 출력에서 본인 ACCOUNT_ID 확인 후:
```
! gcloud billing projects link cleanballtrio --billing-account=<ACCOUNT_ID>
```
> 또는 https://console.cloud.google.com/billing 에서 GUI로 연결.

```
! gcloud config set project cleanballtrio
! gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

### ⏳ 그 다음 — 배포 명령 (사용자 직접 실행)

`backend/.env`의 실제 값을 `<...>` 자리에 채워서 한 번에 실행. PowerShell이면 `\` 대신 한 줄로 풀거나 백틱 사용:

```bash
gcloud run deploy cleanballtrio-api \
  --source backend \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "KAKAO_REST_API_KEY=<KAKAO_REST_API_KEY값>,KAKAO_CLIENT_SECRET=<KAKAO_CLIENT_SECRET값>,JWT_SECRET=<JWT_SECRET값>,CORS_ORIGIN=http://localhost:5173"
```

PowerShell 한 줄 버전:
```powershell
gcloud run deploy cleanballtrio-api --source backend --region asia-northeast3 --platform managed --allow-unauthenticated --set-env-vars "KAKAO_REST_API_KEY=<...>,KAKAO_CLIENT_SECRET=<...>,JWT_SECRET=<...>,CORS_ORIGIN=http://localhost:5173"
```

> ⚠️ **첫 배포는 5~10분 걸림** (Cloud Build가 이미지 빌드 + Artifact Registry 푸시 + Cloud Run 배포 순차 진행). 출력 끝에 `Service URL: https://cleanballtrio-api-xxxxx-an.a.run.app` 형식으로 URL 나옴 — **이걸 메모해두고 plan에 기록**.

### ⏳ 배포 후 검증

```bash
# AppController 헬로 확인
curl https://cleanballtrio-api-xxxxx-an.a.run.app/

# 카카오 인증 라우트 reachable + dummy code로 401 받는지
curl -X POST https://cleanballtrio-api-xxxxx-an.a.run.app/auth/kakao \
  -H "Content-Type: application/json" \
  -d '{"code":"dummy","redirectUri":"http://localhost:5173/oauth/callback"}'
# → 401 "카카오 토큰 교환 실패" (정상 — dummy code라 카카오가 거절)
```

### ⏳ 카카오 콘솔 작업 (frontend 배포 후 함께)

- 카카오 디벨로퍼스 → 카카오 로그인 → Redirect URI에 prod URL 추가 (frontend가 Firebase에 올라간 다음):
  - `https://cleanballtrio.web.app/oauth/callback` (예시)
- backend prod URL은 카카오에 등록할 필요 **없음** (백엔드가 카카오 호출하는 쪽이지 카카오로부터 받는 쪽 아님)

### ⏳ CORS 갱신 (frontend 배포 후)

frontend Firebase URL이 정해지면:
```bash
gcloud run services update cleanballtrio-api --region asia-northeast3 \
  --update-env-vars "CORS_ORIGIN=http://localhost:5173,https://cleanballtrio.web.app"
```

---

## 범위 외 (별도 plan)

- Frontend Firebase Hosting 배포 → `docs/plans/active/deploy-frontend-firebase.md` (다음 세션에서 작성)
- Cloud SQL / Memorystore 연동 → DB 도입 plan
- Secret Manager 이전 → ops-hardening plan
- Custom domain 연결 (예: api.cleanballtrio.com)
- CI/CD 파이프라인 (GitHub Actions → Cloud Build trigger)
- Rate limiting, observability (Cloud Logging/Monitoring), alerting
- WebView 래핑 시 카카오 OAuth 분기 (`@react-native-seoul/kakao-login` + postMessage 브릿지)

## 위험

- **결제 계정 미연결**: Cloud Run은 무료 티어 있지만(월 200만 요청까지) 결제 계정 연결은 필수. 안 하면 배포 실패
- **Cold start**: Node.js 콜드 스타트 ~2초. 한국 사용자는 체감 가능. min-instances=1 옵션으로 회피 가능 (단 항상 비용 발생)
- **시크릿 평문 노출**: `gcloud run services describe`로 프로젝트 권한자가 평문 조회 가능. 초기 배포는 OK지만 운영 시작 시 Secret Manager 이전 필수
- **프로젝트 ID 점유**: `cleanballtrio`가 이미 사용 중이면 suffix 추가. 결정한 ID로 plan 갱신 필요
