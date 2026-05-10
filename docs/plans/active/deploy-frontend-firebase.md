# Plan: Frontend Firebase Hosting 배포

## 목표
Vite + React frontend를 Firebase Hosting에 배포해서 prod URL 확보. 카카오 OAuth → 새로 배포된 Cloud Run backend(`https://cleanballtrio-api-fpvvjohnta-du.a.run.app`)와 종단 간(end-to-end) 동작.

## 결정 사항 (확정)
- **Firebase 프로젝트 ID**: `cleanballtrio` (기존 GCP 프로젝트에 Firebase 추가 — 같은 프로젝트, 동일 billing/콘솔)
- **호스팅 URL**: `https://cleanballtrio.web.app` + `https://cleanballtrio.firebaseapp.com`
- **빌드 도구**: 기존 Vite (`npm run build` → `frontend/dist`)
- **환경변수 분리**: `frontend/.env.production`로 빌드 시 자동 주입 (`vite build`가 production mode에서 자동 로드)

---

## 📍 진행 상황 (2026-05-10)

### ✅ 배포 완료
- **Hosting URL**: `https://cleanballtrio.web.app` (HTTP 200 확인)
- **Firebase Console**: https://console.firebase.google.com/project/cleanballtrio/overview
- **CORS preflight 검증**: `OPTIONS /auth/kakao` from `https://cleanballtrio.web.app` → 204 ✅

### ✅ 완료 — 코드 준비
- [x] `firebase.json` (repo 루트) — `frontend/dist`를 hosting source로, SPA rewrite 설정
- [x] `.firebaserc` (repo 루트) — default project = `cleanballtrio`
- [x] `frontend/.env.production.example` — prod URL 템플릿
- [x] `frontend/.env.production` — 실제 prod 값으로 생성 (gitignored)
- [x] `.gitignore` — `!.env.*.example` 추가해서 `*.env.example` 패턴 모두 트래킹 가능

### ✅ 완료 — Firebase 셋업
- [x] `firebase projects:addfirebase cleanballtrio` — 기존 GCP 프로젝트에 Firebase 리소스 추가
- [x] `npm run build` (frontend) — `dist/` 생성 (34개 파일, ~570KB gzip 71KB main bundle)
- [x] `firebase deploy --only hosting` — release complete

### ✅ 완료 — Cloud Run 후속 작업
- [x] CORS_ORIGIN 갱신: dev + Firebase 두 URL 추가 (revision 00002-sz8)

### (구) ⏳ 대기 — Firebase 프로젝트 생성 (사용자 인터랙티브)

**옵션 A (권장)**: Firebase Console에서 기존 GCP 프로젝트에 Firebase 추가
1. https://console.firebase.google.com/ 접속 (`jeongoheo0225@gmail.com` 로그인)
2. "프로젝트 추가" → "기존 GCP 프로젝트 가져오기" → `cleanballtrio` 선택
3. Hosting은 무료 Spark 플랜 그대로 사용 가능 (월 10GB egress까지)

**옵션 B (CLI)**: 명령 한 줄
```
! firebase projects:addfirebase cleanballtrio
```

### ⏳ 대기 — 환경변수 파일 생성 (사용자 직접)

`frontend/.env.production` 파일을 생성하고 아래 값 채우기 (KAKAO_REST_API_KEY는 `frontend/.env`와 동일 값):

```env
VITE_KAKAO_REST_API_KEY=<frontend/.env에서 복사>
VITE_KAKAO_REDIRECT_URI=https://cleanballtrio.web.app/oauth/callback
VITE_KAKAO_LOGOUT_REDIRECT_URI=https://cleanballtrio.web.app/login
VITE_API_BASE_URL=https://cleanballtrio-api-fpvvjohnta-du.a.run.app
```

### ⏳ 빌드 + 배포 (사용자 실행)

```
! cd frontend; npm run build; cd ..
! firebase deploy --only hosting
```

> 첫 배포는 ~1분. 출력 끝에 `Hosting URL: https://cleanballtrio.web.app` 나옴.

### ⏳ 배포 후 검증

브라우저에서:
1. `https://cleanballtrio.web.app` 접속 → 메인 페이지 렌더링 확인
2. 카카오 로그인 클릭 → 카카오 동의 화면 → callback → 토큰 교환 → 로그인 완료 확인
3. F12 Network 탭에서 `auth/kakao` 호출이 Cloud Run URL로 가는지 확인 (CORS 에러 없는지)

### ⏳ 배포 후 후속 작업 (3개 동시)

#### 1. Cloud Run CORS 갱신
```
! gcloud run services update cleanballtrio-api --region asia-northeast3 --update-env-vars "CORS_ORIGIN=http://localhost:5173,https://cleanballtrio.web.app,https://cleanballtrio.firebaseapp.com"
```

#### 2. 카카오 콘솔 Redirect URI 등록
- https://developers.kakao.com → 앱 → 카카오 로그인 → Redirect URI에 추가:
  - `https://cleanballtrio.web.app/oauth/callback`
  - `https://cleanballtrio.firebaseapp.com/oauth/callback`
- 카카오 로그인 → 동의 항목에 필요한 사용자 정보 활성화 확인

#### 3. 카카오 콘솔 사이트 도메인 추가
- 카카오 디벨로퍼스 → 앱 → 일반 → 사이트 도메인:
  - `https://cleanballtrio.web.app`

---

## 범위 외 (별도 plan)

- 커스텀 도메인 연결 (cleanballtrio.com 같은 거)
- Firebase Analytics 연동
- PWA 설치 가능하게 (manifest.json 보강)
- WebView 래퍼 (Expo) — 별도 mobile plan
- CI/CD (GitHub Actions → `firebase deploy --token`)

## 위험

- **Vite env는 빌드 타임 주입**: `.env.production`의 값이 번들에 박힘. 빌드 후 URL 바꾸려면 재빌드 + 재배포 필요
- **카카오 KAKAO_REST_API_KEY 노출**: client-side에서 사용하는 키라 번들에 포함됨 (보안상 OK — 카카오에서 client-side 의도로 발급한 키). 단, JS SDK 사용 시 Application key를 사용하는 게 더 정석이지만 현재 구현은 REST 직접 호출.
- **Firebase Spark 플랜 한도**: 월 10GB egress. 트래픽 많아지면 Blaze 플랜으로 업그레이드 필요
- **GCP 프로젝트 ID 충돌**: Firebase 프로젝트는 GCP와 1:1 — `cleanballtrio` 가져오기 시 Firebase ID도 `cleanballtrio`로 고정
