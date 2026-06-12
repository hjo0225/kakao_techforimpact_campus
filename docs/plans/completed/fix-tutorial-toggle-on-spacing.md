# Plan: 튜토리얼 step 2·3 데모 토글 — On pill 여백 불일치 수정

## 문제
`TutorialDemos.tsx`의 `PillToggle`(step 2 VerifyDemo / step 3 CardDemo 공용)에서 활성(On) pill이
`padding: 4px 11px`로 높이가 텍스트 line-height에 의존 → 컨테이너(높이 30, 좌우 padding 3px) 안에서
상하 여백(~2.5px)과 좌우 여백(3px)이 어긋나 보임.

실제 앱 토글(`VisitCard.tsx` 헤더)은 pill에 고정 높이(32) + 컨테이너 고정 높이(40)를 써서 이 문제가 없음.

## 수정
- `frontend/src/app/components/tutorial/TutorialDemos.tsx` — `PillToggle`의 pill을
  고정 높이 20 + `inline-flex` 센터링 + `lineHeight: 1`, `padding: '0 10px'`로 변경.
  컨테이너(높이 30, border 2px → 내부 26) 기준 상하 (26−20)/2 = 3px = 좌우 3px로 사방 여백 통일.
- 신규 색상/토큰 없음 (기존 값 재사용) → DESIGN.md 변경 불필요.

## 검증
- frontend typecheck / build 통과
- step 2(용기인증 On), step 3(야구네컷 On) 모두 동일 컴포넌트라 한 번에 해결
