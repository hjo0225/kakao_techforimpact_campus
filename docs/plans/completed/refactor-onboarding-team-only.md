# 온보딩 플로우 축소: 팀 선택 한 단계만 남김

## Context

`TeamSelectScreen`은 `/onboarding`에서 내부적으로 3-step state machine으로 동작 중이다:

1. `step === 'slides'` — 문제/솔루션/보상 3장 슬라이드 + 2x2 메트릭 카드
2. `step === 'team'` — KBO 10구단 그리드에서 응원팀 선택
3. `step === 'permissions'` — 위치/알림 권한 토글

사용자 결정: **팀 선택 외 두 단계(slides, permissions)는 제거**. 첫 로그인 직후 바로 팀 그리드를 보여주고, 선택 즉시 홈으로 이동.

## 변경

### `frontend/src/app/components/screens/TeamSelectScreen.tsx`

- `ONBOARDING_SLIDES` 상수 삭제
- `step`, `setStep`, `slideIndex`, `setSlideIndex` state 삭제
- `locationAllowed`, `setLocationAllowed`, `notificationAllowed`, `setNotificationAllowed` state 삭제
- `handleNextSlide` 함수 삭제
- `if (step === 'slides') { ... }` 블록 삭제
- `if (step === 'permissions') { ... }` 블록 삭제
- 팀 그리드 렌더링 부분만 남기되:
  - `eyebrow="STEP 1 / 2"` → 제거 (단일 단계라 표시 무의미)
  - 하단 버튼 `onClick={() => selected && setStep('permissions')}` → `onClick={handleStart}` 로 직접 연결
- 사용하지 않는 import 정리: `Bell`, `MapPin` (lucide-react) 제거. `ChevronRight`는 팀 선택 버튼에서 계속 사용.

## 변경 없음

- 라우팅 (`App.tsx` PrivateLayout 가드는 그대로 — team 없으면 `/onboarding`로 강제하는 로직 유지)
- `navigation.tsx` Route 타입
- `LoginScreen.tsx` (별도 dead-code, 이번 plan 범위 외)
- 백엔드/디자인 토큰

## 검증

- `cd frontend && npm run typecheck` — 0 errors
- 수동: 로그아웃 → 카카오 로그인 → 바로 팀 그리드 → 팀 선택 → 홈

## 범위 외

- `GameSelectScreen` (`/game-select`)는 BottomNav/HomeScreen에서 도달하는 일반 화면이므로 유지
- `LoginScreen.tsx` dead-code 정리 (별도 plan)
