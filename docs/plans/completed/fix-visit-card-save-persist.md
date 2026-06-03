# Plan: 직관카드 "저장하기"가 캘린더에 안 남는 버그 수정

## 증상
직관카드를 만들어 **저장하기**를 눌러도 캘린더 직관카드 탭에 안 나타남.

## 원인 (frontend `VisitCard.tsx`)
- `handleDownload`("저장하기") = 로컬 `<a download>`만 수행, `createVisitCard` 미호출 → 서버/DB 미저장
- `handleShare`("공유하기")에서만 `createVisitCard` 호출 → DB 저장 → 캘린더 노출
- 백엔드(`POST/GET /visit-cards`)는 정상. listMine이 userId 카드 createdAt desc로 반환

## 수정
`VisitCard.tsx`:
- `savedCard` 상태 추가(`{ id, shareToken } | null`)
- `ensureSaved()` 헬퍼: 미저장이면 `createVisitCard`로 1회 저장 후 상태 캐시, 이미 저장됐으면 재사용 → **저장/공유 중복 생성 방지**
- `handleDownload`: `ensureSaved()`(서버 저장)로 캘린더에 남기고 + 로컬 다운로드, "저장했어요" 토스트
- `handleShare`: `ensureSaved()` 결과의 shareToken으로 공유
- 카드 재생성 effect(`[photo, mascotSrc, visitN]`)에서 `savedCard=null` 리셋 → 새 카드면 다음 저장/공유 시 새로 저장

## 완료 기준
- 저장하기 → 캘린더 직관카드 탭에 즉시 반영 (재진입 시 표시)
- 저장 후 공유해도 카드 1개만 생성 (중복 X)
- typecheck/build 통과
