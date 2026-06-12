# Plan: 야구네컷(VisitCard) 비디오 탭 삭제

## 배경
야구네컷 카드 모드 하단의 "비디오" 탭은 실제 기능 없이 "2초 비디오는 준비 중이에요" 토스트만
띄우는 placeholder. 기능 도입 계획이 없으므로 UI에서 제거한다.

## 변경 사항
- `frontend/src/app/components/screens/VisitCard.tsx`
  - 카드 모드 하단 탭 행의 "비디오" 버튼 제거 (사진 카운터 / 초기화 버튼은 유지)
  - lucide `Video` 아이콘 import 제거 (해당 버튼이 유일한 사용처)

## 범위 밖
- `<video>` 엘리먼트/`videoRef` 등 라이브 카메라 프리뷰 — 촬영 기능의 핵심, 유지
- 백엔드 변경 없음 (placeholder라 서버 연동 자체가 없었음)

## 검증
- frontend typecheck / lint / build 통과
- 수용 기준: 카드 모드 하단에 "사진 n/m"과 (사진 있을 때) "초기화"만 노출
