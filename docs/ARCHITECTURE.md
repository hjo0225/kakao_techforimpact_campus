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
       │ Authorization: Bearer <JWT>
       ▼
┌─────────────────────────────────────┐
│  GCP Cloud Run (asia-northeast3)     │
│  cleanballtrio-api                   │
│  ─ NestJS, Node 22 alpine            │
│  ─ env: KAKAO_*, JWT_SECRET, CORS,   │
│         DATABASE_URL                  │
│  ─ start: prisma migrate deploy &&    │
│           node dist/main.js           │
└──────┬──────────────────────────────┘
       │ Unix socket
       │ /cloudsql/cleanballtrio:asia-northeast3:cleanballtrio-db
       ▼
┌─────────────────────────────────────┐
│  Cloud SQL (PostgreSQL 16)           │
│  cleanballtrio-db / db cleanballtrio │
│  ─ tables: users, teams, usages,     │
│            games                      │
│                                       │
│  Memorystore (Redis) — TBD            │
└─────────────────────────────────────┘

       NestJS ──(multipart, server→server)──▶ Cloud Run [cleanballtrio-vision]
                                              Python · FastAPI · MobileNetV2
                                              POST /verify-reusable
                                              ─ best_model.pth (2-class)
```

## 모듈 경계

### Frontend (`frontend/`)

| 디렉토리 | 책임 | 의존 |
|---|---|---|
| `pages/` | 라우트별 화면 (LoginPage, OAuthCallbackPage 등) | `lib/`, `store/`, `app/` |
| `lib/` | 외부 API/유틸 — `kakaoAuth.ts` (OAuth URL), `apiClient.ts` (백엔드 fetch wrapper, Authorization 헤더 자동 부착) | `store/` (token 읽기) |
| `store/` | Zustand 클라이언트 상태 (`authStore.ts` — JWT/유저). zustand persist version 2 (이전 schema 강제 폐기) | (없음) |
| `app/` | 화면 공통 컴포넌트, 컨텍스트, 도메인 헬퍼 (avatar, teamBrand, ecoGrades) | `components/` |
| `imports/` | (cleanballtrio 이전 화면 포팅 작업물) | — |
| `assets/`, `styles/` | 정적 자산, Tailwind base | — |

**금지 의존**: `app/` → `pages/` (역참조). `lib/kakaoAuth.ts`는 순수 유지 (`apiClient.ts`만 store 의존 허용).

### Backend (`backend/src/`)

| 모듈 | 책임 | 외부 의존 |
|---|---|---|
| `app.module.ts` | 루트 모듈, `ConfigModule` (전역 env) | — |
| `prisma/` | `PrismaService` + `PrismaModule` (`@Global()`) — DB 연결 lifecycle 관리 | Cloud SQL |
| `auth/` | 카카오 OAuth + JWT 발급/검증 (`AuthController`, `AuthService`, `JwtStrategy`, `JwtAuthGuard`) | `kauth.kakao.com`, `kapi.kakao.com`, `@nestjs/jwt`, `passport-jwt`, `PrismaService` |
| `users/` | `/me` 프로필 조회/팀 변경/아바타 저장 (`UsersController`, `UsersService`) | `PrismaService`, `JwtAuthGuard` (auth 모듈 의존) |
| `games/` | `/games` KBO 일정 조회 (`GamesController`, `GamesService`) | `PrismaService` |
| `verify/` | `/verify/reusable` 이미지 → Vision API forward (`VerifyController`, `VerifyService`) | `axios`, `form-data`, env `VISION_API_URL` |

### Vision (`vision/`, 별도 Cloud Run 서비스)

Python FastAPI · MobileNetV2 (PyTorch). `vision/best_model.pth` 가중치로 2-class 분류 (`reusable` / `single_use`). NestJS만이 내부적으로 호출 (현재 `--allow-unauthenticated` + URL 비공개 의존; 추후 IAM 잠금).

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
     c. Prisma `user.upsert({ where: { kakaoId }, ... })` → DB user row (BigInt id)
     d. JwtService.sign({ sub: user.id.toString(), nickname }) → JWT
     e. 응답: { user: { id, nickname, profileImage, teamCode }, accessToken }
6. [Frontend] authStore에 JWT 저장 → `user.teamCode` 유무로 /home 또는 /onboarding 라우팅
```

> **JWT `sub` 의미 변경 (2026-05)**: 이전에는 `sub = kakao_id`였으나 현재는 `sub = DB user.id`. 이전 토큰은 일괄 무효. 프론트 zustand persist version 2로 강제 재로그인 처리.

> **에러 경로**: Kakao 토큰/유저 호출 실패 시 401 `UnauthorizedException` + 카카오 응답 본문을 그대로 메시지에 포함 (`AuthService.getKakaoToken` catch 블록). 유저 메시지 노출 시 마스킹 필요 (현재 raw).

## 인프라

| 컴포넌트 | 리소스 | 비고 |
|---|---|---|
| GCP Project | `cleanballtrio` (project number 1076044788885) | Firebase + GCP 통합 |
| Cloud Run | `cleanballtrio-api` (asia-northeast3) | min-instances=0 (콜드 스타트 ~2s + migrate deploy) |
| Cloud SQL | `cleanballtrio-db` (PostgreSQL 16, db-f1-micro, asia-northeast3) | DB `cleanballtrio`. Cloud Run에서 Unix socket으로 연결 (`--add-cloudsql-instances`) |
| Cloud Run (vision) | `cleanballtrio-vision` (asia-northeast3, memory 2Gi, concurrency 4) | PyTorch CPU 추론. 콜드 스타트 ~10s (모델 로드 포함) |
| Artifact Registry | `cloud-run-source-deploy` (asia-northeast3) | Cloud Build가 자동 push |
| Firebase Hosting | `cleanballtrio` 사이트 | Spark 플랜 (월 10GB egress) |
| WIF Pool | `github-actions-pool` (global) | OIDC provider for GitHub Actions |
| Service Account | `github-actions-deployer@cleanballtrio.iam.gserviceaccount.com` | 6 roles (run.admin, iam.serviceAccountUser, cloudbuild.builds.editor, artifactregistry.writer, firebasehosting.admin, storage.admin) |

## 시크릿 관리

| 시크릿 | 저장소 | 용도 |
|---|---|---|
| `KAKAO_REST_API_KEY` | Cloud Run env, frontend 번들(공개) | 카카오 OAuth |
| `KAKAO_CLIENT_SECRET` | **Cloud Run env만** | 카카오 토큰 교환 강화 |
| `JWT_SECRET` | **Cloud Run env만** | JWT 서명. 누락 시 `ConfigService.getOrThrow`가 부팅 차단 |
| `DATABASE_URL` | **Cloud Run env만** | Prisma → Cloud SQL Unix socket. `deploy-backend.ps1`이 `backend/.env`의 `DB_PASSWORD`를 URL 인코딩해 조립 |
| `VISION_API_URL` | **Cloud Run env만** | NestJS → Vision Cloud Run 서비스 URL. `deploy-backend.ps1`이 `backend/.env`에서 주입 |
| GitHub Actions | `GCP_WIF_PROVIDER`, `GCP_SA_EMAIL`, `VITE_KAKAO_REST_API_KEY` | CI 인증 + 빌드 시 주입 |

> **현재**: 평문 env vars (1차). **향후**: Secret Manager로 이전 예정.
> **주의**: `scripts/deploy-backend.ps1`은 `backend/.env`(git ignored)에서 `DB_PASSWORD`를 읽음 — 스크립트 자체에 비밀번호 평문 저장 금지.

## 보안 경계

- **CORS**: backend `CORS_ORIGIN` env로 제어. 콤마 구분 다중 origin. Cloud Run에서 dev(`localhost:5173`) + prod(`cleanballtrio.web.app`) 둘 다 허용 중.
- **JWT 검증**: `JwtStrategy` + `JwtAuthGuard` 구현됨. `@UseGuards(JwtAuthGuard)` 데코레이터로 보호 — 현재 `/me/*` 적용. `payload.sub`가 DB user.id (BigInt → string).
- **CSRF**: Bearer 토큰 + CORS allowlist 조합. 쿠키 기반 인증으로 전환 시 SameSite + CSRF token 패턴 필요.
- **WIF attribute condition**: `assertion.repository=='hjo0225/kakao_techforimpact_campus'` — 이 repo에서만 SA 가장 가능. 추가 보강(브랜치 제한)은 plan 참고.

## 변경 이력

이 파일을 갱신할 때는:
1. ADR이 필요한 결정인지 판단 (구조 변경 / 외부 의존성 추가 / 보안 경계 변경)
2. 필요하면 `docs/adr/NNNN-제목.md` 추가하고 여기서 링크
3. plan과 함께 같은 PR에 포함
