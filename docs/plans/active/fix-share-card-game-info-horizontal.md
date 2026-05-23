# fix: 직관 공유 카드 우상단 경기 정보를 가로 1줄로

## 문제
방금 머지된 1:1 리디자인에서 우상단 경기 정보 박스가 `{home}` / `vs` / `{away}` 3줄 세로 배치. 사용자 요청: **가로 1줄** (`{home} vs {away}`)로 변경.

## 변경

### 1. 미리보기 div (`RecordScreen.tsx` `subTab === 'share'` 우상단 박스)
- 3개의 `<p>` 태그 → 1개의 `<p>` 태그
- `minWidth` 제거 (가로 길이 자동), padding 좌우 확장

### 2. Canvas `createInstagramReadyImage` 우상단 카드
- 박스 크기 360×160 → 가로형(420×72 정도)
- 3줄 drawText → 1줄 `{home} vs {away}` 단일 drawText
- 폰트 36/24/36 → 단일 32px

## 검증
- `npm run build` (typecheck + build)
- 모바일에서 우상단 박스가 한 줄로 표시되는지 시각 확인
