# Plan: 직관카드 공유를 "링크" → "이미지 직접 공유"로 전환

## 요구
- 공유하기를 누르면 인스타/카톡에 **이미지 자체**를 바로 공유 (링크 X)
- **저장 동작은 동일** — 서버 저장(`ensureSaved`)으로 캘린더에 남는 건 그대로

## 방식
웹에서 이미지 직접 공유의 표준 = **Web Share API Level 2** (`navigator.share({ files: [file] })`).
OS 공유 시트에 이미지가 첨부 → 사용자가 인스타(스토리/피드)·카톡 등을 선택해 바로 게시.

## 수정 (`VisitCard.tsx`)
- `handleShare`:
  - 기존: `ensureSaved` 후 `shareUrlForToken`으로 **링크** 공유 / 클립보드 복사
  - 변경: `ensureSaved`(저장 동일) 후 `navigator.canShare({ files:[cardFile] })`면 `navigator.share({ files:[cardFile], title, text })`로 **이미지** 공유
  - 취소(AbortError)는 조용히 무시
  - 미지원(주로 데스크톱) → 이미지 다운로드 폴백 + 안내 토스트
- 미사용이 되는 `shareUrlForToken` 임포트 제거 (noUnusedLocals)

## 한계/주의 (문서화)
- 인스타 "스토리 직접 지정"은 웹에서 불가 — 공유 시트에서 사용자가 인스타 선택(스토리/피드)하는 방식이 유일한 웹 경로
- 데스크톱 브라우저는 파일 공유 대체로 미지원 → 다운로드 폴백
- WebView(Expo) 래퍼에서는 `navigator.share(files)` 지원이 환경별로 상이 (후속 검토 대상)

## 완료 기준
- 모바일 브라우저에서 공유하기 → OS 시트에 카드 이미지 첨부, 인스타/카톡 선택 가능
- 저장(캘린더 반영)은 종전과 동일
- typecheck/build 통과
