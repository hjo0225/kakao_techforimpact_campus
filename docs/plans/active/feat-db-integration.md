# feat: DB 연동 (Cloud SQL + Prisma)

## 목표
PostgreSQL(Cloud SQL)과 Prisma ORM을 연결해 실제 데이터를 저장하고,
기존 더미 데이터를 대체할 API를 구현한다.

## 결정 사항
- ORM: Prisma
- DB: GCP Cloud SQL (PostgreSQL 16, db-f1-micro, asia-northeast3)
- 인스턴스명: `cleanballtrio-db`
- DB명: `cleanballtrio`
- 로컬 개발: Cloud SQL Auth Proxy (또는 Docker PostgreSQL)

## 스키마 (DATA_MODEL.md 기반)
- `users`: kakao_id, nickname, profile_image, team_code, avatar_config
- `teams`: code(PK), display_name, primary_color — KBO 10개팀 시드
- `usages`: user_id, qr_payload, stadium_code, scanned_at, lat, lng, score

## 구현 단계

### Phase A — 인프라
- [x] Cloud SQL Admin API 활성화
- [x] Cloud SQL 인스턴스 생성 (PostgreSQL 16, db-f1-micro)
- [x] DB/사용자 생성, 비밀번호 설정

### Phase B — 백엔드 Prisma 세팅
- [x] `prisma`, `@prisma/client` 설치
- [x] `prisma/schema.prisma` 작성 (users, teams, usages)
- [x] `PrismaService` + `PrismaModule` (전역) 생성
- [x] 마이그레이션 실행 (`prisma migrate dev`) — `20260511130625_init`
- [x] teams 시드 데이터 스크립트 (`prisma/seed.ts`)

### Phase C — API 구현
- [x] `UsersModule`: `findById`, `updateTeam`, `updateAvatar`
- [x] `AuthService.kakaoLogin` 수정: 카카오 프로필 → DB upsert → JWT에 DB id 포함
- [x] `GET /me`, `PATCH /me/team`, `PATCH /me/avatar` (JwtAuthGuard + UsersService)
- [x] `JwtAuthGuard` + `JwtStrategy` 구현

### Phase D — Cloud Run 연결 및 배포
- [x] `deploy-backend.ps1` Cloud SQL 인스턴스 연결 + `DATABASE_URL` 주입
- [ ] Cloud Run 재배포 (Phase E~F 적용 후 수행)

### Phase E — 보안 강화 (사후 발견 이슈)
- [ ] `scripts/deploy-backend.ps1`의 DB 비밀번호 평문 제거 → `backend/.env`에서 읽기
- [ ] `JWT_SECRET` 폴백 `'dev-secret'` 제거 (auth.module / jwt.strategy) — 누락 시 throw
- [ ] (운영) DB 비밀번호 git history에 노출됐다면 로테이션 필요

### Phase F — 배포 가능 상태로 마무리
- [ ] Cloud Run 컨테이너 시작 시 `prisma migrate deploy` 실행 (entrypoint)
- [ ] `package.json`에 prisma seed 설정 추가 (`"prisma": { "seed": "..." }`) + npm script
- [ ] CI 백엔드 잡에 `prisma generate` 단계 추가 (.github/workflows/deploy.yml)

### Phase G — 기능 정합 (Frontend ↔ Backend)
- [ ] `frontend/src/store/authStore.ts`의 `User.id`를 `string`으로 통일 + `teamCode` 필드 추가
- [ ] `OAuthCallbackPage`의 `getTeamFor` 흐름을 백엔드 `teamCode` SSOT로 교체
- [ ] 토큰 헤더 자동 부착 fetch wrapper (`frontend/src/lib/apiClient.ts`)
- [ ] JWT `sub` 의미 변경(kakao_id → DB id) 정책: 기존 토큰 무효 → 강제 재로그인 (문서화)

### Phase H — 문서 동기화
- [ ] `docs/api-spec.md`: `/auth/kakao` 응답 스키마, `sub` 의미, `GET /me`, `PATCH /me/team|avatar` 추가
- [ ] `docs/DATA_MODEL.md`: "DB 미도입" 제거, Prisma 채택 반영, Open Questions 정리
- [ ] `docs/ARCHITECTURE.md`: Cloud SQL/JWT Strategy/Users 모듈 반영
- [ ] `CHANGELOG.md` 추가 (API 시그니처 변경)

### Phase I — 위생
- [ ] `main.ts`에 `ValidationPipe` 글로벌 등록 + `class-validator`/`class-transformer` 설치
- [ ] `/me/team`, `/me/avatar` DTO 작성 (teamCode 화이트리스트, avatarConfig 스키마)
- [ ] `scripts/verify.sh`에 lint + test 단계 추가
- [ ] `docs/plans/active/`의 완료된 plan을 `completed/`로 이동

## 범위 외 (다음 plan)
- `POST /qr/scan`
- `GET /rankings/teams` (Redis)
- `GET /stats/me`
- Secret Manager 이전 (현재 평문 env vars 유지)
