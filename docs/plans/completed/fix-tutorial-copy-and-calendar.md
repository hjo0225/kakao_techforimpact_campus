# Plan: 튜토리얼 멘트 다듬기 + step 4 캘린더 채움 날짜 수정

## 변경 사항

### `TutorialOverlay.tsx` — 설명 문구
- 모든 step 설명에서 마침표(.) 제거
- step 2: 'AI가' 앞에서 줄바꿈 → "다회용기 사용 사진을 찍으면\nAI가 자동으로 인증해 줘요"
- step 3: "직관 사진으로" 삭제 + '만들어' 앞에서 줄바꿈
  → "용기 인증 후, 나만의 야구네컷을\n만들어 친구들과 공유해요"
- step 4: → "캘린더에서 날짜별 인증 기록을 모아서\n볼 수 있어요"

### `design-system.css`
- `.cb-tutorial__desc`에 `white-space: pre-line` 추가 (설명 내 `\n` 렌더링)

### `TutorialDemos.tsx` — step 4 캘린더
- `photoDays` 첫 채움 날짜 8 → 4 (`[8, 17, 26]` → `[4, 17, 26]`)

## 검증
- frontend typecheck / build 통과
