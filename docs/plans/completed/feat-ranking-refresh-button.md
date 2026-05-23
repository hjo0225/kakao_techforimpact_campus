# feat: 랭킹 화면 새로고침 버튼

## 배경
RankingScreen 머무는 동안 팀 점수가 자동 갱신되지 않음. 라우트 전환 시에는 mount/unmount로 자동 갱신되지만 화면에 머물러 있을 때 강제 갱신 수단이 없음.

## 변경

### `RankingScreen.tsx`
1. `RotateCcw` 아이콘 import
2. `loading` state 추가
3. `useEffect` 안의 fetch 로직을 `loadRankings` 함수로 추출 (재사용)
4. 첫 section 헤더 카드 우상단에 작은 refresh 아이콘 버튼 — 클릭 시 `loadRankings()` 재호출
5. 로딩 중에는 아이콘에 spin animation + disabled

## 변경 안 함
- HomeScreen — 별 plan
- 자동 polling
- visibilitychange

## 검증
- `npm run build`
- 시각 확인: 버튼 보이고, 클릭 시 spin, 잠시 후 데이터 갱신
