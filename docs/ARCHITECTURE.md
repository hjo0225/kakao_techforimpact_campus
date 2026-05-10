# Architecture

> Single Source of Truth — 모듈 경계, 외부 의존성, 데이터 흐름. 코드와 어긋나면 **여기를 먼저 갱신** 후 코드 수정.

## 시스템 다이어그램 (현재)

```
┌──────────────┐    Kakao OAuth     ┌──────────────────────┐
│  사용자 브라우저  │ ─────────────────▶ │ kauth.kakao.com    │
│  (PWA / Web)  │ ◀────── code ───── │ kapi.kakao.com     │
└──────┬───────┘                    └──────────────────────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────┐
│  Firebase Hosting (CDN)              │
│  https://cleanballtrio.web.app       │   정적 SPA (Vite 번들)
│  ─ frontend/dist                     │
└──────┬──────────────────────────────┘
       │ XHR (fetch) — VITE_API_BASE_URL
       ▼
┌─────────────────────────────────────┐
│  GCP Cloud Run (asia-northeast3)     │
│  cleanballtrio-api                   │
│  ─ NestJS, Node 22 alpine            │
│  ─ env: KAKAO_*, JWT_SECRET, CORS    │
└─────────────────────────────────────┘
       │ (예정)
       ▼
┌─────────────────────────────────────┐
│  Cloud SQL (Postgres) — TBD          │
│  Memorystore (Redis)  — TBD          │
└─────────────────────────────────────┘
```

## 모듈 경계

### Frontend (`frontend/`)

| 디렉토리 | 책임 | 의존 |
|---|---|---|
| `pages/` | 라우트별 화면 (LoginPage, OAuthCallbackPage 등) | `lib/`, `store/`, `app/` |
| `lib/` | 외부 API/유틸 (`kakaoAuth.ts` — 카카오 OAuth URL 생성) | (없음, 순수 함수) |
| `store/` | Zustand 클라이언트 상태 (`authStore.ts` — JWT/유저) | (없음) |
| `app/` | 화면 공통 컴포넌트, 컨텍스트, 도메인 헬퍼 (avatar, teamBrand, ecoGrades) | `components/` |
| `imports/` | (cleanballtrio 이전 화면 포팅 작업물) | — |
| `assets/`, `styles/` | 정적 자산, Tailwind base | — |

**금지 의존**: `app/` → `pages/` (역참조). `lib/` → 다른 어떤 것도 (순수 유지).

### Backend (`backend/src/`)

| 모듈 | 책임 | 외부 의존 |
|---|---|---|
| `app.module.ts` | 루트 모듈, ConfigModule (전역 env) | — |
| `auth/` | 카카오 OAuth + JWT 발급 (`AuthController`, `AuthService`) | `kauth.kakao.com`, `kapi.kakao.com`, `@nestjs/jwt` |

**현재 다른 도메인 모듈 없음** (DB/팀/QR 등 모두 미구현).

## 외부 의존성

| 서비스 | 용도 | 인증 방식 |
|---|---|---|
| Kakao OAuth (`kauth.kakao.com`) | 사용자 인증 token 교환 | `KAKAO_REST_API_KEY` + `KAKAO_CLIENT_SECRET` |
| Kakao API (`kapi.kakao.com/v2/user/me`) | 유저 프로필 조회 | Bearer access_token |
| GCP Cloud Run | Backend 호스팅 | (Firebase Hosting과 동일 GCP 프로젝트) |
| Firebase Hosting | Frontend 배포 | WIF (CI) / `firebase login` (수동) |
| GitHub Actions | CI/CD | WIF → Cloud Run, Firebase Hosting |

## 데이터 흐름 — 카카오 로그인

```
1. [사용자] LoginPage → "카카오 로그인" 클릭
2. [Frontend] kakaoAuth.getAuthUrl()
     → window.location = kauth.kakao.com/oauth/authorize?
                          client_id=VITE_KAKAO_REST_API_KEY
                          &redirect_uri=VITE_KAKAO_REDIRECT_URI
                          &response_type=code
3. [Kakao] 사용자 동의 → redirect_uri로 ?code=XXX&state=...
4. [Frontend] OAuthCallbackPage가 code 추출 →
     POST {VITE_API_BASE_URL}/auth/kakao { code, redirectUri }
5. [Backend] AuthService.kakaoLogin(code, redirectUri)
     a. kauth.kakao.com/oauth/token 교환 → access_token
     b. kapi.kakao.com/v2/user/me 조회 → kakao_id, nickname, profile_image_url
     c. JwtService.sign({ sub: kakao_id, nickname }) → JWT
     d. 응답: { user, accessToken }
6. [Frontend] authStore에 JWT 저장 → 메인 라우트 이동
```

> **에러 경로**: Kakao 토큰/유저 호출 실패 시 401 `UnauthorizedException` + 카카오 응답 본문을 그대로 메시지에 포함 (`AuthService.getKakaoToken` catch 블록). 유저 메시지 노출 시 마스킹 필요 (현재 raw).

## 인프라

| 컴포넌트 | 리소스 | 비고 |
|---|---|---|
| GCP Project | `cleanballtrio` (project number 1076044788885) | Firebase + GCP 통합 |
| Cloud Run | `cleanballtrio-api` (asia-northeast3) | min-instances=0 (콜드 스타트 ~2s) |
| Artifact Registry | `cloud-run-source-deploy` (asia-northeast3) | Cloud Build가 자동 push |
| Firebase Hosting | `cleanballtrio` 사이트 | Spark 플랜 (월 10GB egress) |
| WIF Pool | `github-actions-pool` (global) | OIDC provider for GitHub Actions |
| Service Account | `github-actions-deployer@cleanballtrio.iam.gserviceaccount.com` | 6 roles (run.admin, iam.serviceAccountUser, cloudbuild.builds.editor, artifactregistry.writer, firebasehosting.admin, storage.admin) |

## 시크릿 관리

| 시크릿 | 저장소 | 용도 |
|---|---|---|
| `KAKAO_REST_API_KEY` | Cloud Run env, frontend 번들(공개) | 카카오 OAuth |
| `KAKAO_CLIENT_SECRET` | **Cloud Run env만** | 카카오 토큰 교환 강화 |
| `JWT_SECRET` | **Cloud Run env만** | JWT 서명 |
| GitHub Actions | `GCP_WIF_PROVIDER`, `GCP_SA_EMAIL`, `VITE_KAKAO_REST_API_KEY` | CI 인증 + 빌드 시 주입 |

> **현재**: 평문 env vars (1차). **향후**: Secret Manager로 이전 (`docs/plans/active/`에 ops-hardening plan 추가 예정).

## 보안 경계

- **CORS**: backend `CORS_ORIGIN` env로 제어. 콤마 구분 다중 origin. Cloud Run에서 dev(`localhost:5173`) + prod(`cleanballtrio.web.app`) 둘 다 허용 중.
- **JWT 검증**: 현재 발급만 구현. Guard/Strategy 미구현 (보호된 라우트 추가 시 작성 필요).
- **CSRF**: 현재 인증된 라우트 없음. 추가 시 SameSite cookie 또는 token 헤더 검증 패턴 필요.
- **WIF attribute condition**: `assertion.repository=='hjo0225/kakao_techforimpact_campus'` — 이 repo에서만 SA 가장 가능. 추가 보강(브랜치 제한)은 plan 참고.

## 변경 이력

이 파일을 갱신할 때는:
1. ADR이 필요한 결정인지 판단 (구조 변경 / 외부 의존성 추가 / 보안 경계 변경)
2. 필요하면 `docs/adr/NNNN-제목.md` 추가하고 여기서 링크
3. plan과 함께 같은 PR에 포함
