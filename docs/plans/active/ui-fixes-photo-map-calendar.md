# Plan: UI 픽스 — 사진 꽉참 / 지도 클립 / 캘린더 갤러리

## 목표
1. **직관카드 사진**: Canvas cover 모드로 전환 (검은 여백 제거)
2. **지도 SVG 맵**: 좌우 클립 제거 (inner overflow 정리)
3. **캘린더**: 인증/미인증 UI 제거 → 날짜별 사진 갤러리 (Twitter 스타일)

## 스코프

### 1. VisitCard.tsx — Canvas contain → cover
- `createCardImage`: `Math.min` → `Math.max` (cover 모드)
- 검은 배경 `fillRect` 제거 (이미지가 전체를 덮음)

### 2. StadiumSvgMap.tsx — 지도 클립 제거
- 내부 `overflow: 'hidden'` 제거 (outer 컨테이너가 border-radius 클립 담당)
- outer 컨테이너에 `width: '100%'` 명시

### 3. CalendarScreen.tsx — 사진 갤러리 리디자인
- 기존 인증 카드(종류/라벨/반영 배지) → 3컬럼 사진 그리드 (날짜별)
- 사진 탭 → 풀스크린 라이트박스 (X 버튼, 촬영시각)
- StatusBar 레이블: "캘린더" → "사진 기록"
- 빈 상태 / 로딩 메시지 유지

## 관련 파일
- `frontend/src/app/components/screens/VisitCard.tsx`
- `frontend/src/app/components/map/StadiumSvgMap.tsx`
- `frontend/src/app/components/screens/CalendarScreen.tsx`

## 완료 기준
- 직관카드에서 촬영한 사진이 정사각 캔버스를 꽉 채움 (검은 여백 없음)
- 지도 화면에서 지도 이미지 좌우가 잘리지 않음
- 캘린더가 날짜별 사진 그리드로 표시되고, 탭하면 사진을 풀스크린으로 볼 수 있음
