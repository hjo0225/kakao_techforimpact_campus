# UI 컴포넌트 라이브러리 — 야구 game-state 컴포넌트 + 마스코트 데코

## Context

랜딩 PNG + Galmuri + NES 스타일 픽셀 시스템은 적용 완료. 사용자가 `용기낼깡_UI컴포넌트.png` 레퍼런스 이미지를 제공 — 야구장 배경에 깔린 컴포넌트 카탈로그(Score 8/3 디스플레이·OUT/BALL 태그·5th 이닝 인디케이터·마스코트 데코·dot 패턴 배경). 현재 시스템에 빠진 game-state 도메인 컴포넌트 + 데코를 추가한다.

## 결정 (사용자 확인)

옵션 3 (A+B+C 전부) — 토큰 + 컴포넌트 + 마스코트/패턴 데코 모두.

## 구현 단계

### A. 디자인 토큰 + 레퍼런스 (1차 commit `chore(design): baseball UI tokens`)

1. `docs/design-reference/components-library.png` — 사용자 제공 PNG 저장 (SSOT 참고용)
2. `DESIGN.md` 새 섹션:
   - `2-1. Game-state semantic tokens` — `--cb-out` / `--cb-ball` / `--cb-strike` / `--cb-score-home` / `--cb-score-away`
   - `2-2. Decoration patterns` — `--cb-pattern-stadium-dots` (SVG data URL)
   - `2-3. Mascot 자산` — `mascot-bunny.svg` / `mascot-batter.svg` 위치 + 사용 가이드
3. `design-system.css` `:root`에 토큰 추가

### B. 새 컴포넌트 (2차 commit `feat(ui): baseball game-state components`)

`frontend/src/app/components/design-system.tsx`에 export 추가:

#### `<ScoreBadge>`
- props: `home: number`, `away: number`, `label?: string`
- 픽셀 박스, 가운데 `Home / Away` 큰 숫자 + 하단 라벨
- HomeScreen `selectedGame.score`에 실제 적용

#### `<InningIndicator>`
- props: `current: 1..9`, `max?: number = 9`
- 9개 사각 칸, 현재 이닝은 채워진 burgundy, 지난 이닝은 옅은 rose, 미래는 cream
- HomeScreen `selectedGame.inning`에 적용

#### `<GameStateTag>`
- props: `state: 'OUT' | 'BALL' | 'STRIKE' | 'HIT' | 'RUN'`
- 미니 픽셀 태그, state별 색상 (OUT=burgundy, BALL=warm cream, STRIKE=rose, HIT=primary, RUN=accent)

스타일: `design-system.css`에 `.cb-score-badge`, `.cb-inning-indicator`, `.cb-game-state-tag` 추가

### C. 마스코트 + 데코 패턴 (3차 commit `feat(ui): mascot sprites + stadium decoration`)

1. `frontend/src/assets/mascot-bunny.svg` — 24×24 픽셀 토끼 (rect 그리드)
2. `frontend/src/assets/mascot-batter.svg` — 24×24 픽셀 야구선수
3. `.cb-bg-stadium-dots` 유틸리티 클래스 — repeat SVG dot 패턴 (관중석 시뮬레이션)
4. 적용처:
   - HomeScreen empty state(경기 미선택) 상단에 토끼 마스코트
   - RankingScreen hero 옆에 batter 마스코트
   - EmptyState 배경에 dot 패턴

## 비범위

- 마스코트 애니메이션 (정적 SVG만)
- 다국어 game-state ("OUT" 영문만)
- 야구 규칙 로직 (`current` prop은 단순 표시용)
- 9회 초과 이닝 (연장전)

## 위험

- 마스코트 SVG는 24×24 픽셀 단순화 — 랜딩 PNG의 마스코트와 시각적 일관성이 떨어질 수 있음
- ScoreBadge / InningIndicator는 `selectedGame` 데이터 의존. mock 데이터 없으면 미선택 상태에서 안 보임
