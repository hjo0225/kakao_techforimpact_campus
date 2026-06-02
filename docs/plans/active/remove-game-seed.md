# Plan: 경기(games) 시드 제거

## 배경
- KBO 경기 일정은 이제 운영 데이터로 **프로덕션 DB에서 직접 관리**(2026-06 일정 prod 반영 완료).
- `prisma/seed.ts`의 `SCHEDULE_RAW`는 월별로 소스가 드리프트(예: 소스 5월 vs prod 6월)되는 유지보수 부담이 됨.
- 시드는 정적 부트스트랩 데이터(teams, stadium food map)만 담당하도록 정리.

## 변경
- `backend/prisma/seed.ts`에서 경기 전용 코드 제거:
  - `TEAM_NAME_TO_CODE`, `SCHEDULE_RAW`, `SCHEDULE_YEAR`, `TEAM_TOKEN`, `MATCH_PATTERN`, `VENUES`
  - `ParsedGame`, `preprocessLines()`, `parseSchedule()`, `seedGames()`
  - `main()`의 `await seedGames()` 호출
- 유지: `KBO_TEAMS` / `seedTeams()`(teams 시드), `seedStadiumFoodMap()`.

## 영향
- 신규/리셋 DB는 시드 시 경기 데이터가 채워지지 않음 → 경기는 별도 운영 경로(prod DB 직접 입력/관리)로 적재.
- 외부 참조/테스트 없음(검증 완료). API·스키마 변경 없음(games 테이블 유지).

## 후속
- 로컬 개발용 경기 데이터가 필요하면 별도 스크립트/픽스처로 분리 검토.
