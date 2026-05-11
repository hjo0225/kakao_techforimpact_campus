# Changelog

`docs/api-spec.md`의 시그니처를 바꿀 때 이 파일도 같이 갱신합니다. 날짜는 한국 시간 기준.

형식: `[YYYY-MM-DD] <type>(<scope>): <subject>` — type은 commit convention과 동일 (feat/fix/chore/...).

---

## [Unreleased]

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
