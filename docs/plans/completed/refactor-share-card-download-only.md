# refactor: 직관 공유 카드 — Web Share API 제거, 단순 이미지 다운로드만

## 배경
모바일 Web Share API가 환경별로 동작이 일관되지 않아 사용자 혼란. 단순 "이미지 다운로드" 한 가지 동작으로 일관화.

## 변경

### `RecordScreen.tsx`
1. `handleShareCard` → `handleDownloadCard`로 리네임
2. `navigator.share` / `navigator.canShare` 분기 전체 제거
3. `downloadFile(file)` 한 줄만 남김 + 성공 토스트만 표시
4. 버튼 UI:
   - 텍스트 "공유하기" / "공유 중..." → "이미지 다운로드" / "다운로드 중..."
   - 아이콘: `Share2` (loading 시 `Download`) → 항상 `Download`
5. 안내 문구 — 공유 시트 관련 멘트 제거, "사진앱/갤러리에 저장됩니다" 류로 교체
6. `shareCardShared` state 기록은 그대로 유지 (마지막 1회 다운로드 시 set)
7. 사용 안 되는 import 정리 (`Share2`)

### 변경 안 함
- 이미지 생성 (`createInstagramReadyImage`) 그대로
- 사진 선택/카메라 촬영 그대로
- 미리보기 그대로

## 검증
- `npm run build`
- 데스크톱: PNG 파일이 다운로드 폴더로 떨어지는지 확인
- 모바일: 다운로드 동작(브라우저별 사진 앱 자동 저장 또는 다운로드 폴더)
