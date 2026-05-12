# 프로덕션 전환: 개인·팀 포인트 실누적 + 더미 랭킹 제거 (`GET /stats/me`, `GET /rankings/teams`)

## Context

프로덕션 전환 직전이지만 점수와 랭킹이 전부 프론트 하드코딩에 의존했다:

- `AppContext.tsx:175` — `points = useState(850)` 시드. 새로고침/다른 기기에서 점수가 어긋남.
- `RankingScreen.tsx:30-41` — `LEAGUE_RANKING` 10팀 + 주간/월간/시즌 3종 점수 모두 mock.
- `HomeScreen.tsx:38-42` — `TEAM_PREVIEW` TOP3 mock.
- `RankingScreen.tsx:43-62` — `CONTRIBUTION_DATA` 그래프 mock.
- `RankingScreen.tsx:115-116` — 개인 순위 `2410 - points`, `310 - points/3` 매직 공식.

백엔드는 이미 `usages.score`(USE=50, RETURN=100)에 정확히 적재 중이었다. `GET /stats/me`는 본 브랜치에서 구현했고, **팀 단위 집계 API와 프론트 마이그레이션을 이 PR에서 마무리.**

`usages.score`를 SSOT로 삼아 (1) 개인 점수 프론트 연동, (2) 신규 `GET /rankings/teams`로 팀별 누적 노출, (3) 랭킹 화면의 weekly/monthly/season 탭과 더미 메시지 제거.

## 결정 사항 (사용자 확인 완료)

| 영역 | 결정 |
|---|---|
| PR 스코프 | 개인+팀 포인트만. SAMPLE_VISITS/REPORT_LOGS/CERTIFICATION_LOGS/HISTORY_SEED/MapScreen POI는 별도 plan |
| 기간 구분 | 총 누적 1종. 시즌 정의 확정 전까지 weekly/monthly UI 제거 |
| 캐싱 | PostgreSQL 직조회, Redis 미도입 (부하 시 도입) |
| 점수 SSOT | `usages.score` SUM-on-read. 마이그레이션 없음 |
| 개인 응답 | `{ points, useCount, returnCount, totalCount }` |
| 팀 응답 | `[{ teamCode, displayName, totalPoints, memberCount }]` desc 정렬 |

## 구현 결과

### 백엔드

신규: `backend/src/stats/` (`/stats/me`, JWT 필수), `backend/src/rankings/` (`/rankings/teams`, public). 둘 다 `app.module.ts` 등록.

`rankings.service.ts`는 Prisma `$queryRaw`로 `teams LEFT JOIN users LEFT JOIN usages GROUP BY team_code` — **점수 0팀도 포함**돼 항상 10행 반환. `::int` 캐스팅으로 BigInt 직렬화 회피.

단위 테스트 9건 — `stats.service.spec.ts` 5건, `rankings.service.spec.ts` 4건 (10팀 정렬, 0점 포함, 빈 DB, 타입 변환).

### 프론트

신규: `frontend/src/lib/statsApi.ts`, `frontend/src/lib/rankingsApi.ts`.

`AppContext.tsx`:
- `points = useState(850)` → `useState(0)` + `useEffect` fetch (`token` 의존)
- `reportCount = 2` → `0`
- `addCertification(type)` → `addCertification(type, score)` — 호출자가 verify 응답의 `usage.score` 전달, 직후 `refreshStats()` reconcile
- `addReport()`의 `+5P` 제거
- `addPoints` API 제거 (외부 사용처 없음)

`ReportScreen.tsx`: `addCertification(mode, apiResult.usage.score)`로 호출.
`RecordScreen.tsx`: 공유 보너스 `addPoints(3)` 제거. UI 문구 정리.
`RankingScreen.tsx`: 전면 재작성. LEAGUE_RANKING/CONTRIBUTION_DATA/PeriodTab/탭UI/카운트다운/개인순위 카드/delta/"전주 대비/상위 N%" 메시지 모두 제거. `getTeamRankings()` mount 시 fetch. `selectedTeam`은 `displayName` 기준 prefix 매칭.
`HomeScreen.tsx`: TEAM_PREVIEW mock 제거. `getTeamRankings()` → 상위 3개. diff 표시 제거.

### 문서

- `docs/api-spec.md` — Stats/Rankings 섹션 신설
- `docs/DATA_MODEL.md` — Redis ZSET 항목에 PostgreSQL aggregate 임시 사용 주석
- `CHANGELOG.md` — Unreleased에 1항목 추가

## 검증

```powershell
# 백엔드 빌드
cd backend && npm run build         # ✓ nest build 통과

# 단위 테스트
cd backend && npx jest --testPathPatterns rankings.service   # 4/4 통과
cd backend && npx jest --testPathPatterns stats.service      # 5/5 통과

# 프론트 빌드
cd frontend && npm run build        # ✓ vite build 통과
```

### e2e (PR 머지 + CI deploy 후)

```powershell
# 팀 랭킹 — 인증 불필요
curl -i "https://cleanballtrio-api-fpvvjohnta-du.a.run.app/rankings/teams"
# 기대: 200 + 10팀, 점수 desc 정렬

# 개인 통계 — 토큰 필요
$TOKEN = "<카카오 로그인 후 zustand persist에서 추출>"
curl -i "https://cleanballtrio-api-fpvvjohnta-du.a.run.app/stats/me" -H "Authorization: Bearer $TOKEN"
# 기대: 200 {"points":<n>,"useCount":...}
```

### UI 수동

- `/home` 진입 → 우상단 포인트(0P~) + 하단 TOP3 표시
- `/ranking` 진입 → 주간/월간 탭 없음, 누적 1종. 응원팀이 MY TEAM 강조
- `/report`에서 사용 인증 → `/home`으로 돌아와 +50P 반영
- 새로고침 → 점수 유지 (핵심 시그널)

## 위험 & 완화

| 위험 | 완화 |
|---|---|
| 850P/주간탭/카운트다운 사라져 화면이 휑함 | 정상. 신규 사용자 자연스러운 빈 상태 |
| selectedTeam(한글명) ↔ teamCode 매칭 | API의 `displayName` prefix로 매칭 (`normalizeTeam(team).split(' ')[0]`) |
| 응원팀 미지정 사용자 | supportRank `-` 표시, "응원팀 미지정" 안내 |
| 낙관적 업데이트 drift | verify 응답 score로 가산 → 직후 `refreshStats()` reconcile |
| `$queryRaw` BigInt 직렬화 | SQL에서 `::int` 캐스팅 + 클라이언트에서 `Number()` 변환 |
| user 1명만 있는 prod | 정상. 다른 9팀도 0점 응답, 코드 알파벳 정렬 |

## 범위 외 (다음 plan)

- 신고(+5P) / 공유(+3P) 백엔드 적재 (Usage enum 확장 or 별도 reports/share_bonuses)
- `SAMPLE_VISITS`/`HISTORY_SEED` → `GET /usages/me` 신규
- 개인 전체 랭킹 (`GET /rankings/users`, 페이지네이션)
- 시즌 정의 확정 + 리워드 카운트다운 복원 + weekly/monthly 복원
- Redis(Memorystore) 도입 (부하 시점)
- MapScreen POI 백엔드화, AccountScreen 매직넘버
- ecoGrades 임계값 PRD 검증
