# fix: 직관 카드 다운로드 — iOS Safari에서 `<a download>` 무시 + 생성 무한대기 가드

## 문제
모바일에서 "다운로드 중..." 텍스트만 뜨고 실제로 파일이 안 받아짐.

## 원인
1. **iOS Safari는 `<a download>` 어트리뷰트를 무시** — `a.click()`이 페이지 navigation으로만 처리되거나 무반응. 안드로이드 Chrome / 데스크톱은 정상 동작.
2. shareFile이 null인 상태에서 클릭 시 `createInstagramReadyImage` 대기 — 폰트 fetch / 큰 사진 blob 로딩이 모바일에서 멈출 수 있음. timeout이 없어 버튼이 영원히 "다운로드 중..." 표시.

## 변경 (`RecordScreen.tsx`)

### 1. iOS 감지 후 새 탭 fallback
- iOS Safari (`/iPhone|iPad|iPod/.test(navigator.userAgent)`)면 `window.open(blob-url, '_blank')`로 새 탭에 이미지 표시 → 사용자가 길게 눌러 사진 앱에 저장
- 그 외(데스크톱/Android)는 기존 `downloadFile` (`<a download>`) 유지
- 팝업 차단 시 폴백: `location.href = url`로 같은 창에 띄움

### 2. 이미지 생성 timeout (8초)
- `createInstagramReadyImage` await을 Promise.race로 timeout 처리
- 실패 시 명확한 에러 토스트

### 3. 토스트 안내 갱신
- iOS: "이미지를 길게 눌러 사진에 저장하세요"
- 그 외: "브라우저 다운로드 폴더에서 확인하세요"

## 검증
- `npm run build`
- iOS Safari (실기기): 새 탭에 이미지 뜨고 길게 눌러 저장 가능
- Android Chrome: `<a download>` 즉시 다운로드
- 데스크톱 Chrome: 다운로드 폴더에 PNG 떨어짐
