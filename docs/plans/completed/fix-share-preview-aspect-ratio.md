# 직관 공유 탭 라이브 미리보기 9:16 비율 깨짐 수정

## 증상
- 공유 탭의 라이브 미리보기 박스가 9:16(스토리)으로 안 보임.
- 최종 합성 이미지(1080×1920)는 정상.

## 원인
- 미리보기 div가 `subTab === 'share'` 컨테이너(`display: flex; flexDirection: column`)의 자식.
- flex item은 기본 `flex-shrink: 1`. 부모 세로 공간이 부족하거나 형제(설명 텍스트·토글·버튼·안내문)들이 자리를 차지하면 `aspect-ratio: 9/16`이 무시되고 세로가 압축됨.

## 변경 (`frontend/src/app/components/screens/RecordScreen.tsx`)
- 미리보기 컨테이너에 `flexShrink: 0` 추가 → flex column 안에서 `aspect-ratio` 유지.

## 검증
- `npm run build` 통과.
- 모바일 폭(360~430px)에서 미리보기 박스가 9:16으로 렌더되는지 수동 확인.
