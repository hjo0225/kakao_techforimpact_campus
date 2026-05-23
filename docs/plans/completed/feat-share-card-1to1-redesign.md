# feat: 직관 공유 카드 1:1 비율 리디자인 + 모바일 공유 버튼 fix

## Context

현재 share 카드는 Instagram **스토리(9:16, 1080×1920)** 전용:
- 셀카가 배경 cover
- 마스코트: **우측 하단** (height 50%)
- 시즌 카운터 "이번 시즌 잠실 직관 N번째": **상단 중앙**
- 선택한 경기 정보: **없음**
- 공유 버튼: 모바일에서 눌러도 무반응 (`shareFile` null일 때 `disabled`)

사용자 요청 (2026-05-23):

> 직관공유카드 1:1비율로 바꾸고 좌측하단에 이미지(=마스코트) 우측상단에 선택한 경기 정보 뜨게하자 그리고 공유하기 버튼 작동안해 모바일기준

요약:
- **1:1 비율** (Instagram feed) 로 전환
- 셀카는 풀스크린 배경 유지
- 마스코트는 **좌측 하단**으로 이동
- **우측 상단에 선택한 경기 정보(홈 vs 원정 팀명)** 신규 노출
- 공유 버튼 모바일 무반응 fix

## 결정 사항

| 영역 | 결정 |
|---|---|
| 캔버스 | 1080×1080 (1:1) |
| 출력 파일명 | `yonggi-naelkkang-jikgwan-{visitN}.png` (기존 jamsil 한정 표현 → 일반화) |
| 배경 | 셀카 cover (현재 동일). 없으면 그라데이션 fallback |
| 마스코트 위치 | 좌측 하단 (현재 우측 하단에서 미러링). height 50% 유지 |
| 시즌 카운터 위치 | **좌상단** (우상단의 경기 카드와 균형). 폰트 사이즈 축소 |
| 경기 정보 (신규) | 우상단. `selectedGame.home` vs `selectedGame.away` 두 줄 표기. `selectedGame == null`이면 섹션 자체 미렌더 |
| 경기 정보 항목 | 팀명만 (날짜/구장/결과 제외 — 사용자 명시) |
| 그라데이션 오버레이 | 상단(검정 그라데이션)은 유지하되 사이즈 축소 — 1:1에서는 9:16보다 비율상 더 두꺼움 |
| 공유 버튼 disabled | `!shareFile` 조건 제거. 클릭 시 동기적으로 생성 시도 + 실패 시 에러 토스트 |

## 변경

### 1. `createInstagramReadyImage` (라인 72)

```diff
- // 스토리 9:16 (1080×1920) 고정
- const width = 1080; const height = 1920;
+ // Instagram feed 1:1 (1080×1080)
+ const width = 1080; const height = 1080;
```

- 배경 + 그라데이션 오버레이 height 비례 축소 (480 → 280 정도)
- 시즌 카운터 좌상단 정렬 (`align: 'left'`, x=60, y=70 정도). 폰트 50→34 / 132→84로 축소
- 우상단 경기 정보 신규 추가 (signature에 `gameLabel?: { home, away }` 추가):
  - 우상단 카드 배경(반투명 흰색 + burgundy border)에 `{home}\n   vs\n{away}` 3줄
- 마스코트 위치를 `width - mascotWidth - 36` → `36`(좌측)으로 변경

### 2. `ShareImageInput` interface

```ts
interface ShareImageInput {
  photoUrl: string | null;
  result: GameResult;
  visitN: number;
  gameLabel: { home: string; away: string } | null;  // 신규
}
```

### 3. 미리보기 div (라인 640~) — `subTab === 'share'`

- `aspectRatio: '9 / 16'` → `'1 / 1'`
- 마스코트 `<img>` 위치: `right: 6, bottom: 6` → `left: 6, bottom: 6`
- 시즌 카운터 absolute 영역: `textAlign: 'center'` → `'left'`, padding 조정
- 우상단 경기 정보 박스 신규: position absolute, top/right 12, 흰색 반투명 + burgundy border

### 4. 공유 버튼 동작 (라인 731 + 232)

```diff
- disabled={isSharing || !shareFile}
+ disabled={isSharing}
```

`handleShareCard`에서:
```ts
- if (!shareFile || isSharing) return;
+ if (isSharing) return;
+ // shareFile 미리 생성된 게 있으면 사용. 없으면 클릭 시점에 동기 생성 (모바일 user-gesture 유지 위해 try 1회 후 빠르게 fallback)
+ const file = shareFile ?? await createInstagramReadyImage({ photoUrl: sharePhoto?.url ?? null, result: gameResult, visitN, gameLabel });
+ if (!file) { setShareToast({ title: '이미지 생성 실패', body: '사진을 바꾸거나 다시 시도해주세요.', icon: 'error' }); return; }
```

> 주의: 모바일 `navigator.share`는 user-gesture가 끊기면 거부. await가 길어지면 실패 가능. 그래서 **preflight + fallback** 패턴 유지 (미리 만들어둔 게 있으면 우선 사용, 없으면 동기 생성).

### 5. 파일명 일반화

- `jamsil-jikgwan-${visitN}.png` → `yonggi-naelkkang-jikgwan-${visitN}.png`
- README/공유 텍스트의 "잠실 직관" 문구는 유지 (현재 시즌 운영이 잠실 한정)

## 범위 외

- `gameResult` (win/lose) 자동 판정 — 현재 사용자가 토글로 지정. 추후 score 기반 자동 결정은 별도 plan
- 시즌 카운터 텍스트 자체 변경 ("이번 시즌 잠실 직관 N번째") — 운영 결정 필요
- 공유 시 카카오톡/인스타 deep link — Web Share API 시트 의존 유지

## 검증

- `npm run build` (typecheck + build)
- 데스크톱: 새 탭 fallback 동작 확인
- 모바일 (iOS Safari, Android Chrome): 공유 시트 정상 표출, 이미지 미리보기 1:1, 우상단 경기 정보 노출, 좌하단 마스코트
- `selectedGame == null` 케이스(경기 미선택 상태): 경기 정보 박스 미표시
