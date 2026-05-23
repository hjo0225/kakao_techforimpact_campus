# 지도 화면: 다회용기 매장 위치 + 메뉴 중심으로 재구성

## Context

`MapScreen.tsx`는 현재 세 가지 정보를 모두 담고 있다:

1. **다회용기 매장** (구장 내부, 메뉴 1줄 텍스트)
2. **반납함** (구장 내부, 좌석 기준 동선 + 추천 카드 + 혼잡도)
3. **협력 식당** (외부, 메뉴 1줄 텍스트)

반납 인증 동선은 `ReportScreen` 쪽 인증 플로우에서 처리되고 있고, 지도 화면의 반납함 정보는 사용자 행동에 직접 연결되지 않은 채 화면의 절반 가까이를 차지하고 있다. 운영 결정: **지도는 "어디서 다회용기로 먹을 수 있는가"에 집중**하고, 매장 메뉴 정보(이름·가격·아이콘)를 보강한다.

## 결정 사항 (사용자 확인 완료)

| 영역 | 결정 |
|---|---|
| 반납함(파란 핀, 추천 카드, 동선 폴리라인) | **완전 제거** |
| 2층/3층 층 선택기 | 제거 (반납 동선 추천이 사라져 의미 약함) |
| "내 좌석" 그린 마커 | 제거 |
| 상단 레이어 칩 (`다회용기 매장 / 반납함 / 협력 식당`) | 제거 (하단 탭과 역할 중복) |
| 탭 구조 (`구장 내부` / `외부 식당`) | 유지, 명칭은 `구장 내부` / `외부 식당`으로 정리 |
| 매장 메뉴 표현 | `menu: string` → `menu: { name; price; icon }[]` 리스트 |
| 메뉴 아이콘 | 이모지 placeholder (실제 이미지 자원 없이 동작) |
| 안내 모달 (`showGuide`) | 문구를 "반납함 안내"에서 "매장/메뉴 안내"로 교체 |

## 구현 단계

### 1. `MapScreen.tsx` 데이터 구조 변경

- `LAYERS` 상수 삭제
- `RETURN_BINS` 상수 삭제
- `MAP_ROUTE_POINTS` 상수 삭제
- `getSeatPoint`, `getRecommendedBin` 함수 삭제
- `getLayerCount` 함수 삭제
- `getSpotShape`는 `bin` 분기 제거 (`store` / `partner`만 남김)
- `Spot.menu` 타입을 `string` → `MenuItem[]`로 확장:
  ```ts
  interface MenuItem { name: string; price: string; icon: string }
  ```
- `STORES` 각 항목의 `menu` 필드를 배열로 재구성 (3~4개 항목, 가격 + 이모지)
- `PARTNER_RESTAURANTS` 각 항목도 동일하게 확장
- `Spot.shortLabel`은 핀 라벨에 사용되므로 유지
- `floors` 필드는 데이터에 그대로 유지하되 표시에는 사용 안 함 (또는 점진 삭제)

### 2. State / 핸들러 정리

제거:
- `activeFloor`, `setActiveFloor`
- `layerState`, `setLayerState`, `handleLayerToggle`
- `showRoute`, `setShowRoute`
- `seatPoint`, `recommendedBin`, `routePoints`

유지:
- `placeTab` (`구장 내부` | `외부 식당`)
- `selectedSpotId`, `selectedSpot`
- `showGuide`
- `handlePickSpot` (단순화: 탭 자동 전환만)

### 3. SVG 지도 영역 단순화

- 좌석 기준 점(`seatPoint`) 그리는 `<g>` 블록 삭제
- 동선 `<polyline>` 삭제
- 핀에서 `bin` 분기(사각형) 삭제 — 매장은 원형, 식당은 원형(다른 색상)
- 우상단 레전드에서 "반납함" 항목 삭제
- 하단 카드 (`selectedSpot` 거리/배지) 유지

### 4. 상단 헤더 정리

- 층 선택기 (2층/3층) `<div>` 삭제
- "좌석 기준 동선" 버튼 삭제
- 레이어 칩 행 삭제
- 헤더는 `경기 정보 + 기준 좌석` 한 줄만 남김

### 5. 하단 리스트 / 상세 카드 재구성

- 좌석 기준 추천 반납함 카드 (`{ background: '#FFFFFF', border: '1.5px solid #CDEFD9' ... }`) 통째 삭제
- 탭(`구장 내부` / `외부 식당`) 토글 유지
- 상세 카드:
  - 아이콘 + 매장명 + 배지 + 위치 노트 (기존 구조 유지)
  - 우측 상단 grid 2개 (대표 메뉴 / 운영 상태) → **메뉴 리스트 섹션**으로 교체
  - 메뉴 리스트: 각 항목 `[icon] 이름 ... 가격` 한 줄로, 최대 4개까지
  - 운영 시간은 별도 한 줄 또는 상세 카드 하단 메타에 표시
  - "가까운 반납함 보기" 버튼 삭제
  - "여기서 인증하기" 버튼은 매장에 의미 없으므로 삭제
- 매장/식당 리스트 카드도 동일 구조 (메뉴 첫 2개 정도 미리보기)

### 6. 안내 모달 (`showGuide`) 문구 교체

- 헤더: "처음 보는 분을 위한 안내" → 유지
- 부제: "반납함과 다회용기 매장을 한 화면에서 확인하세요" → "구장 안팎의 다회용기 매장과 메뉴를 한 화면에서 확인하세요"
- 안내 3개 항목 교체:
  - `Store` 아이콘: "구장 내부 다회용기 매장에서는 보증금이 자동 포함됩니다."
  - `UtensilsCrossed` 아이콘: "외부 협력 식당은 도보 거리와 운영 시간을 함께 보여줍니다."
  - `MapPin` 아이콘: "지도 핀이나 카드를 누르면 메뉴와 가격을 바로 확인할 수 있습니다."
- 하단 버튼: "가장 가까운 반납함부터 보기" → "내 근처 매장부터 보기" (현재 selectedSpot 유지)

### 7. 사용하지 않는 import 정리

- `Recycle`, `Navigation`, `ChevronDown` 사용처 모두 삭제되면 import에서도 제거
- `lucide-react`에서 남는 것: `MapPin`, `Info`, `Store`, `UtensilsCrossed`, `X`

## 변경 파일

- `frontend/src/app/components/screens/MapScreen.tsx` (수정)

## 변경 없음

- `AppContext`, `navigation`, `BottomNav`, `StatusBar` (호출 시그니처 동일)
- 백엔드 (지도 데이터는 프론트 mock)
- 디자인 토큰 (`DESIGN.md`) — 메뉴 카드도 기존 inline 색상 톤(`#F8FAFC`, `#0F9F8B`, `#7C3AED` 등) 재사용

## 검증

- `cd frontend && npm run typecheck` — 0 errors
- `cd frontend && npm run build` — vite build 성공
- 수동 (가능 시):
  - 매장/식당 탭 전환
  - 핀 클릭 → 상세 카드 메뉴 리스트 표시
  - 안내 모달 X로 닫기

## 위험 & 완화

| 위험 | 완화 |
|---|---|
| 메뉴 데이터가 너무 길어 카드가 과도하게 커짐 | 카드 미리보기는 메뉴 상위 2개만, 상세 카드에서만 전체 표시 |
| 이모지 placeholder가 디바이스마다 다르게 렌더링 | 이모지를 작은 사각형 배경 위에 올려 시각적 일관성 확보 |
| 반납함 제거로 기존 사용자가 "어디서 반납하지?"에 혼동 | `ReportScreen`(인증 탭)에서 반납 안내가 이미 처리됨. 본 PR 범위 외 |

## 범위 외

- 매장 실시간 영업 상태/혼잡도 API 연동 (현재 mock 유지)
- 메뉴 실제 이미지 자원 도입
- 지도 SVG → Kakao Maps JS API 전환
