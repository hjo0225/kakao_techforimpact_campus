# feat: 경기 일정 DB 이전

## 목표
프론트엔드 `GameSelectScreen.tsx`에 하드코딩된 mock 4경기를 제거하고,
사용자가 제공한 2026-05-20 ~ 05-31 KBO 정규시즌 55경기를 DB에 적재.
프론트엔드는 `GET /games`를 호출해 표시.

## 결정 사항
- **테이블**: `games` (BIGSERIAL PK, FK to `teams.code` × 2: away/home)
- **고유성**: `(date, away_team_code, home_team_code)` — 같은 카드의 더블헤더는 현재 없음
- **time**: `TEXT` "HH:MM" 로 단순 저장 (timezone-free, 한국 경기 시각은 명시적으로 KST)
- **status**: `TEXT` 기본값 "-". 추후 라이브 스코어/이닝 정보가 들어올 자리. 현재 정적 일정만 적재
- **시드**: `prisma/seed.ts`의 `seedGames()` 함수에서 `createMany({ skipDuplicates: true })`. teams 시드 후 실행

## 입력 데이터 (사용자 제공)
`5/20(수)` ~ `5/31(일)` × 5경기/일 = 55경기 (5/25 월요일 휴식일).
포맷: `MM.DD(요일)  HH:MM  AwayvsHome  Venue  Status`

기존 시드의 KBO team code 매핑 (불일치 있음 — 본 PR 범위 외):
- 롯데 → `OB`, 키움 → `HB`, SSG → `SK` (백엔드 SSOT; 프론트 teamBrand는 LT/KW/SSG 사용 — 별도 plan에서 정리)

Venue 매핑:
잠실, 광주, 고척, 대전, 포항, 사직, 수원, 문학, 창원, 대구

## 구현 단계

### Phase A — DB 스키마
- [ ] `schema.prisma`에 `Game` 모델 추가 + `Team`에 awayGames/homeGames 관계
- [ ] `prisma migrate dev --name add_games_table`
- [ ] `DATA_MODEL.md`에 `games` 섹션 추가

### Phase B — 시드
- [ ] `prisma/seed.ts`에 `seedGames()` 함수 추가 (55경기 텍스트 → 객체 배열)
- [ ] `npm run db:seed`로 로컬 검증

### Phase C — Backend API
- [ ] `GamesModule` (Controller/Service)
- [ ] `GET /games?from=&to=` (날짜 범위, ISO date)
- [ ] 응답에 team display name join 포함 (frontend가 short name 사용)
- [ ] `api-spec.md` 갱신

### Phase D — Frontend
- [ ] `GameSelectScreen.tsx`의 `const GAMES` 제거 → `apiClient`로 fetch
- [ ] 날짜 그룹핑 + "오늘/내일/날짜 선택" 탭에서 실제 날짜 매핑
- [ ] inning/score 표시는 스케줄 단계에서 숨김 (status === '-'면 미표시)

### Phase E — 배포
- [ ] `verify.sh` 로컬 통과
- [ ] commit, push, PR
- [ ] CI auto-deploy → 컨테이너 시작 시 `migrate deploy`가 prod에 games 테이블 생성
- [ ] prod에서 `npm run db:seed` 1회 (또는 Cloud SQL Proxy로 데이터 적재)

## 범위 외
- 라이브 스코어/이닝 (별도 plan: KBO API 연동 또는 운영자 입력)
- 팀 코드 정규화 (OB→LT 등) — 별도 plan
- 더블헤더 / 우천취소 처리
- `POST /games` 운영자 입력 인터페이스
