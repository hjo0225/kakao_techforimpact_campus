# fix: 경기 선택 버튼이 비활성 상태라 "눌러도 선택 안 됨"

## 문제
배포 환경에서 경기 선택 화면의 "이 경기 선택" 버튼을 눌러도 선택이 되지 않는다.

## 원인
`GameSelectScreen`은 2단계 선택 구조:
1. 카드 본문 탭 → `pendingId` 설정 → 버튼 활성화
2. 활성 버튼 탭 → `handleSelect`

"이 경기 선택" 버튼이 `disabled={!isPending}`이라, 사용자가 곧바로 버튼을 탭하면
- disabled `<button>`은 click 이벤트를 발생/버블링시키지 않음
- 따라서 카드 onClick(활성화)도 트리거되지 않아 영영 비활성 상태로 남음
- 결과적으로 "눌러도 아무 일도 일어나지 않음"

모바일은 hover 힌트도 없어 더 쉽게 걸린다.

## 수정 범위
- `frontend/src/app/components/screens/GameSelectScreen.tsx`
  - 버튼의 `disabled={!isPending}` 제거 → 한 번 탭으로 즉시 선택
  - 카드 탭 하이라이트(`is-selected`)는 유지(시각적 피드백)

## 검증
- `./scripts/verify.sh` (typecheck + lint + test + build)
- 빌드 후 경기 카드의 버튼을 바로 눌러 home으로 이동/선택되는지 확인
