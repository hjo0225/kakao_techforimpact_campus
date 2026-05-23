# 통계 합산: `사용 + 반납` → `짝이 맞은 컵 수`로 일관화

## Context

사용자 지적 (2026-05-18 세션):

> 사용이랑 반납을 1번씩 하면 결국 1개만 쓴 거잖아. 사용 및 반납 인증 둘 다 했을 때만 1번으로 카운트해.

다회용기는 **사용 인증 + 반납 인증 한 쌍**이 모여야 1개를 실제로 회수한 것. 현재는 두 인증을 단순 합산해 1개의 컵이 2개로 부풀려 표시되는 버그.

## 현재 상태

### Frontend (이미 수정됨, 본 plan 범위 외)
`frontend/src/app/AppContext.tsx:198`
```ts
const containers = Math.min(reusableReturnCount, reusableUseCount);
```
→ UI에 표시되는 `ecoImpact.containers`, `wasteKg`, `carbonKg`, `seoulContributionPct`는 정상화 완료.

### Backend (수정 필요)
`backend/src/stats/stats.service.ts:38`
```ts
return {
  points,
  useCount,
  returnCount,
  totalCount: useCount + returnCount,  // ❌ 합산
};
```

### API 스펙 (수정 필요)
`docs/api-spec.md:247`
> `totalCount`: useCount + returnCount

### Frontend ↔ Backend 현재 결합도
- `frontend/src/lib/statsApi.ts`의 `getMyStats()`는 호출만 하고 응답을 화면 표시에 사용하지 않음 (`AppContext.refreshStats` → `.catch(() => {})`).
- 즉 백엔드의 잘못된 `totalCount`가 지금 당장 UI를 망치진 않지만, 외부 클라이언트나 추후 통합에는 즉시 영향.

## 변경

### 1. `backend/src/stats/stats.service.ts`

`totalCount`의 의미를 **짝이 맞은 컵 수**로 변경:

```ts
return {
  points,
  useCount,
  returnCount,
  totalCount: Math.min(useCount, returnCount),
};
```

대안 — 필드 추가 (필드명으로 의미 충돌을 피하고 싶을 때):
```ts
return {
  points,
  useCount,
  returnCount,
  totalCount: useCount + returnCount,   // 호환 유지
  pairedCount: Math.min(useCount, returnCount),  // 신규
};
```

**권장**: 외부 컨슈머가 없으니 1번(의미 변경)이 깔끔. 변경하는 김에 필드명도 `containerCount` 혹은 `pairedCount`로 리네임하면 더 명확.

### 2. `backend/src/stats/stats.service.spec.ts`

`totalCount` 기대값 케이스 보강:
- use=2, return=1 → totalCount=1 (이전: 3)
- use=0, return=0 → totalCount=0
- use=3, return=3 → totalCount=3 (이전: 6)
- use=5, return=0 → totalCount=0 (이전: 5)

### 3. `docs/api-spec.md`

```diff
-- `totalCount`: useCount + returnCount
++ `totalCount`: min(useCount, returnCount) — 사용·반납이 모두 인증된 컵 수 (실제 회수된 다회용기)
```

응답 예시도 갱신:
```json
{ "points": 850, "useCount": 7, "returnCount": 5, "totalCount": 5 }
```

### 4. `CHANGELOG.md`

`### Changed`에 한 줄:
> stats `/stats/me`의 `totalCount`를 use+return 합산에서 짝이 맞은 컵 수(`min`)로 변경. 의미 변경.

### 5. `frontend/src/app/AppContext.tsx`

선택: `refreshStats` 결과를 더 이상 무시하지 않고 ecoImpact 계산의 source-of-truth로 사용하도록 통합. (별 plan으로 분리해도 무방)

## 변경 없음

- `frontend/src/lib/statsApi.ts` 타입 (`MyStats`) — 필드명 유지 시 변경 불필요. 리네임 선택 시 동기화.
- 프론트 표시 로직 — 이미 짝 카운트로 변경됨.
- Prisma 스키마.

## 검증

- `cd backend && npm run test -- stats.service` — 신규 케이스 포함 통과
- `curl localhost:3002/stats/me -H "Authorization: Bearer <jwt>"` — use=1·return=1 인 계정에서 `totalCount: 1`
- 프론트 통합 (5번 선택 시): 백엔드 응답과 화면 표시가 일치

## 위험 & 완화

| 위험 | 완화 |
|---|---|
| `totalCount` 의미 변경으로 외부 클라이언트 깨짐 | 현재 외부 컨슈머 없음. CHANGELOG·api-spec 동시 갱신. 의심되면 신규 필드 추가 방안으로 전환 |
| 프론트가 응답을 안 쓰는 동안 백엔드만 바뀌면 회귀 못 잡음 | 백엔드 단위 테스트 보강 + 5번 통합을 같은 PR에 묶거나 직후 plan으로 |

## 범위 외

- `points` 계산식(USE=50, RETURN=100) 검토 — 짝 단위로 포인트 적립할지 별 plan
- 팀 랭킹(`/rankings/teams`)의 score 합산 로직 — 같은 문제 있는지 별도 확인 필요
