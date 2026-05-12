# Changelog

`docs/api-spec.md`의 시그니처를 바꿀 때 이 파일도 같이 갱신합니다. 날짜는 한국 시간 기준.

형식: `[YYYY-MM-DD] <type>(<scope>): <subject>` — type은 commit convention과 동일 (feat/fix/chore/...).

---

## [Unreleased]

### feat(api): `GET /stats/me`, `GET /rankings/teams` — 개인·팀 누적 점수 집계

- `GET /stats/me` (JWT 필수) — `usages.score` SUM-on-read로 `{points, useCount, returnCount, totalCount}` 반환
- `GET /rankings/teams` (인증 불필요) — `teams LEFT JOIN users LEFT JOIN usages` aggregate. `[{teamCode, displayName, totalPoints, memberCount}]` 점수 desc 정렬. 점수 0인 팀도 포함되어 항상 10행
- 프론트엔드 하드코딩 제거: `points = 850` 시드, `LEAGUE_RANKING`/`CONTRIBUTION_DATA` mock, `TEAM_PREVIEW` mock, weekly/monthly/season 탭, 개인순위 매직 공식(`2410 - points`, `310 - points/3`), 리워드 카운트다운, "전주 대비 N계단" 류 가짜 메시지, 공유 +3P, 신고 +5P
- `addCertification(type, score)` 시그니처 변경 — verify 응답의 `usage.score`를 호출자가 전달, 직후 `/stats/me` refetch로 reconcile
- 신규 단위 테스트 `rankings.service.spec.ts` 4건 (Prisma `$queryRaw` mock)
- 스키마 변경 없음 (SUM-on-read 방식)

### feat(vision): `/verify/use`·`/verify/return` + usages 적재 + 반납 가드

- 기존 `/verify/reusable` 제거(Breaking) → `POST /verify/use`, `POST /verify/return`으로 분리
- 검증 통과 시 `usages` row 자동 적재 (USE=50점, RETURN=100점)
- confidence < 70% 또는 single_use → `400 LOW_CONFIDENCE` / `400 NOT_REUSABLE`
- RETURN 가드: 같은 사용자의 12시간 내 USE가 없으면 `409 NO_RECENT_USE`
- 스키마: `usages.kind` enum 추가, `qr_payload` nullable로 완화, `game_id`/`confidence` 컬럼 추가, UNIQUE(user_id, qr_payload) 제거
- 마이그레이션: `20260511190055_extend_usages_for_vision`
- 단위 테스트 7건 (`verify.service.spec.ts`) — Prisma + axios mock 기반

### feat(vision): 다회용기/일회용기 분류 Vision API 도입

- `vision/` 신규 디렉토리 — Python FastAPI · MobileNetV2 (PyTorch), `best_model.pth` 가중치
- 별도 Cloud Run 서비스 `cleanballtrio-vision`으로 배포 (Dockerfile, deploy-vision.ps1)
- NestJS `VerifyModule` 추가: `POST /verify/reusable` (JWT 필수) — multipart `image`를 Vision API로 forward, `{isReusable, classIndex, confidence}` 반환
- 환경 변수 `VISION_API_URL` 추가 (deploy-backend.ps1 필수)

### feat(api): KBO 경기 일정 DB 이전 + `GET /games`

- 신규 테이블 `games` (PK `id`, FK `away_team_code`/`home_team_code` → `teams.code`, 유니크 `(date, away, home)`)
- `prisma/seed.ts`의 `seedGames()`가 2026-05-20 ~ 05-31 KBO 정규시즌 55경기를 적재
- `GET /games?from=YYYY-MM-DD&to=YYYY-MM-DD` — 날짜 범위 조회, team displayName join 포함
- 프론트엔드 `GameSelectScreen`의 하드코딩 mock 4경기 제거 → API 호출로 대체

### feat(api): DB 연동 + `/me` 엔드포인트 도입

- `POST /auth/kakao` 응답 변경 (Breaking)
  - `user.id`: 카카오 `id`(number) → **백엔드 DB id**(string, BigInt → string 직렬화)
  - `user`에 `teamCode: string | null` 필드 추가
  - JWT payload `sub`: `kakao_id` → **DB user.id (string)**
  - 영향: 기존 발급된 모든 JWT 무효. 프론트엔드는 zustand persist `version: 2`로 강제 재로그인됨
- 신규 엔드포인트 (모두 `Authorization: Bearer <JWT>` 필수)
  - `GET /me` — 프로필 조회
  - `PATCH /me/team` — 응원팀 변경 (body: `{ teamCode }`)
  - `PATCH /me/avatar` — 아바타 설정 저장 (body: `{ avatarConfig }`)

### chore(security): 비밀 노출 차단

- `scripts/deploy-backend.ps1`의 DB 비밀번호 하드코딩 제거 → `backend/.env`의 `DB_PASSWORD`에서 읽도록 변경
- `JWT_SECRET` 폴백 `'dev-secret'` 제거 — 누락 시 `ConfigService.getOrThrow`가 부팅 차단

### chore(infra): 배포 자동화

- Cloud Run 컨테이너 시작 시 `prisma migrate deploy` 자동 실행 (Dockerfile `CMD`)
- `package.json`에 `prisma.seed` 설정 + `db:seed`/`db:migrate:*` npm scripts 추가
- CI 워크플로우(`.github/workflows/deploy.yml`) backend 잡에 `prisma generate` 단계 추가
