# 홈/네비게이션 간격 정리

## 문제
- 하단 네비게이션 바 `cb-bottom-nav`의 `padding-top: 1cm`(~37.8px)이 과해 상단 여백이 너무 큼.
- 홈 화면 프로필 카드가 `position: sticky; top: 0`로 상단 고정돼 있어, 일반 스크롤을 원함.

## 변경
- `frontend/src/styles/design-system.css` `.cb-bottom-nav`: `padding-top: 1cm` → `8px` (하단 `+8px` 및 아이템 상단 padding과 대칭). DESIGN.md 간격 스케일의 소형값에 부합.
- `frontend/src/app/components/screens/HomeScreen.tsx` 프로필 카드 `<section>`: `position: sticky`, `top: 0`, `zIndex: 5` 제거 → 일반 흐름으로 스크롤.

## 검증
- `npm run build` (typecheck + build)
- 수동: 네비 바 여백 축소 확인, 프로필 카드가 스크롤 시 함께 올라가는지 확인.

## 비고
- 코드베이스 spacing은 CSS 변수로 토큰화돼 있지 않고 raw px 컨벤션 사용 → 본 수정도 px 유지.
