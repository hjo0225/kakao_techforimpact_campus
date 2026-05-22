# 홈 점수판 제거 + 계정별 집계 연결

## 배경 / 문제
- 홈 화면에서 경기 선택 시 상단에 점수판(`ScoreCounter/InningCounter/BSOCounter`)이 노출되는데, BSO는 `2,1,1` 하드코딩 mock이라 의미 없는 표시.
- 사용/반납/용기/탄소/폐기물 등 집계치가 `AppContext`의 `SAMPLE_CERTIFICATION_LOGS`(전 계정 공유 mock)에서 파생됨. 정작 계정별 `/stats/me`(`getMyStats`) 결과는 받아서 버림 → 모든 계정이 동일 숫자를 봄.
- 백엔드 `/stats/me`는 JWT 기준 계정별 `useCount/returnCount/totalCount`를 이미 제공.

## 변경 범위
### 1. 홈 점수판 삭제
- `frontend/src/app/components/screens/HomeScreen.tsx`: `selectedGame` 조건부 점수판 블록 제거. `ScoreCounter/InningCounter/BSOCounter`, `parseScore/parseInning` 등 미사용 헬퍼·import 정리.

### 2. 계정별 집계 연결 (AppContext 단일 소스)
- `frontend/src/app/AppContext.tsx`
  - `stats: MyStats` 상태 추가, `refreshStats`가 `getMyStats()` 결과를 `setStats`로 반영.
  - `token` 변경(로그인/로그아웃) 시 stats 초기화 + 재조회.
  - `reusableUseCount = stats.useCount`, `reusableReturnCount = stats.returnCount` (계정별). 기존 `certificationLogs` 파생 제거.
  - `ecoImpact`는 위 카운트에서 파생 → 자동 계정별.
  - 누적 인증 건수용 `totalCertCount = stats.totalCount` 노출.
  - 공유 mock 제거: `SAMPLE_CERTIFICATION_LOGS`, `SAMPLE_VISITS` → 빈 배열로 시작.
  - `addCertification`: 로컬 타임라인(`certificationLogs`) prepend + stats 낙관적 +1 후 `refreshStats()` 재조회.
  - `todayMission`은 오늘 세션 인증 여부(로컬 `certificationLogs`) 기준 유지 — "오늘의 미션" 의미에 부합.

### 3. "누적 인증 N건" 표시 정합화 (certificationLogs.length → totalCertCount)
- `HomeScreen.tsx` (누적 인증)
- `RankingScreen.tsx` (건수)
- `ReportScreen.tsx` (certCount)

### 4. 인증 로그 타임라인 백엔드화 (계정별 영속)
- `Usage` 테이블에 시간/종류/게임/점수가 모두 있으므로 신규 테이블 없이 조회 엔드포인트 추가.
- `backend/src/stats/stats.service.ts`: `getMyLogs(userId, limit)` — 최근 usage를 game(home/away 팀 join) 포함 조회 → `{ id, kind, score, gameLabel, scannedAt }[]`.
- `backend/src/stats/stats.controller.ts`: `GET /stats/me/logs?limit=`.
- `backend/src/stats/stats.service.spec.ts`: 매핑/limit/정렬 테스트.
- `frontend/src/lib/statsApi.ts`: `getMyLogs()` 추가.
- `frontend/src/app/AppContext.tsx`: 계정별 로그를 서버에서 로드해 `certificationLogs` 채움. `addCertification`은 낙관적 prepend 후 서버 재조회로 정합화.
- 문서: `docs/api-spec.md` + `CHANGELOG.md` 갱신.

### 5. 직관(attendance) — 경기 선택 후 그날 지나면 자동 확정 (계정별)
- 캡처 규칙 확정: **경기 선택 후 경기 날짜가 지나도록 취소 안 하면 직관 방문으로 인정** (그날 = 경기 date 다음날 00:00 KST).
- 백엔드: 신규 `attendances` 테이블(`prisma/schema.prisma` + 마이그레이션 `20260522000000_add_attendances`).
  - `attendance.module/service/controller` + `select-game.dto`.
  - `GET /attendance/me`(current/visits), `POST /attendance`(선택, 다른 활성 선택 자동취소), `DELETE /attendance/:gameId`(취소). 확정은 on-read 계산.
  - `attendance.service.spec.ts` 5건.
- 프론트: `GameInfo`에 `gameId/date` 추가. `lib/attendanceApi.ts`, `lib/gameSummary.ts`(summary→GameInfo/VisitRecord 매핑).
  - `AppContext`: 로그인 시 attendance 복원(`selectedGame` 영속), `selectGame`/`cancelSelectedGame` 액션, `visits`를 직관 확정분으로 채움.
  - `GameSelectScreen`: `selectGame` 사용 + 안내문구 갱신. `HomeScreen`: 해제 버튼 → `cancelSelectedGame`.
- 문서: `api-spec.md`, `DATA_MODEL.md`, `CHANGELOG.md` 갱신.

## 비변경 / 한계
- 방문 기록의 **좌석·메모·승패·공유 여부**는 입력→저장 흐름이 없어 직관 확정분에서 기본값으로 채움(좌석/메모 빈 값, 결과 '미정'). 추후 캡처 UI + `attendances` 컬럼 확장으로 분리.

## 검증
- `./scripts/verify.sh` (typecheck + lint + test + build)
- 수동: 서로 다른 계정 로그인 시 집계치 분리 확인, 경기 선택 시 점수판 미노출 확인.
