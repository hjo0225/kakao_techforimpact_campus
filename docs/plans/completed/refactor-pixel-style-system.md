# 컴포넌트 도트(픽셀) 스타일 전면 리브랜드

## Context

랜딩 페이지(`landing-bg.png` + `landing-logo.svg`)는 vintage 야구 카드 + 8비트 픽셀 아트 톤이다. 현재 컴포넌트는 모던(둥근 모서리, blur shadow, smooth gradient, Pretendard)이라 랜딩과 톤이 단절된다. 이번에 컴포넌트 시스템을 도트 스타일로 통일한다.

## 도트 스타일 정의 (= 변경 6축)

| 축 | 모던 (현재) | 도트 (목표) |
|---|---|---|
| 폰트 | Pretendard | **Galmuri11** (한글 픽셀 폰트, fallback Pretendard) |
| 모서리 | `border-radius: 8px` (`--cb-radius-md`) | `0px` (모든 박스), 원형은 `9999px` 유지 |
| 그림자 | `0 4px 16px rgba(...)` blur | `3px 3px 0 0 var(--burgundy-900)` hard offset |
| 테두리 | `1.5px solid` | `2px solid var(--burgundy-900)` (NES 프레임 룩) |
| 그라데이션 | linear-gradient smooth | flat color (1 commit 안에서) → 추후 dithered 옵션 |
| 아이콘 | lucide-react strokeWidth=2 | lucide strokeWidth=**2.5~3** + `image-rendering: pixelated` |

## 폰트 도입

- 라이브러리: [Galmuri](https://github.com/quiple/galmuri) (한글 픽셀 폰트, OFL 라이선스, 무료)
- CDN: `https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2304-2@1.0/Galmuri11.woff2`  (또는 npm `galmuri` 패키지)
- 사이즈별: Galmuri9 / Galmuri11 / Galmuri14 / Galmuri15
- 본문 기본: Galmuri11 (11px optimized — 한글 본문 가독성 양호)
- 헤딩(20px+): Galmuri14 또는 Galmuri15
- Fallback: 'Pretendard Variable', 'Noto Sans KR', sans-serif (긴 본문/입력 필드 안전망)

## 픽셀 그림자 시스템

기존 `--cb-shadow-xs/sm/md/primary` 토큰을 hard offset으로 교체:

```css
--cb-shadow-xs: 2px 2px 0 0 var(--burgundy-900);          /* subtle frame */
--cb-shadow-sm: 3px 3px 0 0 var(--burgundy-900);          /* card */
--cb-shadow-md: 4px 4px 0 0 var(--burgundy-900);          /* elevated */
--cb-shadow-primary: 4px 4px 0 0 var(--burgundy-900);     /* CTA */
```

활성/누르기 상태:
- `:active` → `transform: translate(2px, 2px)` + `box-shadow: 1px 1px 0 0 var(--burgundy-900)` (눌린 느낌)

## 구현 단계

### Phase 1 — 폰트 + 토큰 (1차 commit: `chore(design): pixel font + tokens`)
1. `frontend/src/styles/fonts.css`에 Galmuri11/14 @font-face 추가 (CDN)
2. `theme.css`, `design-system.css` `:root`
   - `--cb-font-family`: `'Galmuri11', 'Pretendard Variable', 'Noto Sans KR', sans-serif`
   - `--cb-font-family-display`: `'Galmuri14', 'Galmuri11', ...`
   - `--cb-radius-md: 0` (8 → 0)
   - `--cb-shadow-*`: hard offset
   - `--cb-border-width: 2px` (신규)
3. `DESIGN.md` 토큰표 갱신 (radius/shadow/font 섹션 + Pixel Rules 섹션 추가)

### Phase 2 — 컴포넌트 프리미티브 (`design-system.css`)
- `.cb-button`
  - `border: 2px solid var(--burgundy-900)`
  - `border-radius: 0`
  - `box-shadow: var(--cb-shadow-primary)`
  - `:active` 눌린 효과
- `.cb-card`, `.cb-modal`, `.cb-chip`, `.cb-game-card`, `.cb-team-card`
  - 동일하게 border 2px + radius 0 + hard shadow
- `.cb-bottom-nav`
  - 상단 `border-top: 2px solid var(--burgundy-900)`
  - active 탭은 배경 + 굵은 라인
- input/select
  - `border: 2px solid`, radius 0, inset hard shadow `inset 2px 2px 0 0 rgba(67,10,33,0.1)`
- `image-rendering: pixelated` 전역 (img/svg에 적용)

### Phase 3 — 화면별 그라데이션 → flat (다중 인라인 스타일)
- HomeScreen hero card: `linear-gradient(150deg, ..., ...)` → `background: var(--cb-primary)` + hard shadow + 2px border
- RankingScreen hero: 동일
- RecordScreen 통계 카드 / 공유 카드(canvas는 burgundy flat): 동일
- ReportScreen "use" 모드: 동일
- 진행 바, 작은 그라데이션 → 단색

### Phase 4 — 아이콘 보강
- lucide-react `strokeWidth` 기본 2 → 2.5 (전역 wrapping 어려우면 자주 쓰는 곳만 prop 명시)
- 핵심 아이콘(BottomNav 5개 + Camera + Trophy) 픽셀 SVG로 교체 검토 (스코프 가능 시)

### Phase 5 — 검증
- Puppeteer 7개 화면 + 로그인 스크린샷
- `typecheck && build`
- DESIGN.md "Pixel Rules" 섹션과 실제 코드 일치 확인

## 위험·트레이드오프

- **한글 본문 가독성**: Galmuri11이 11px에 최적화되어 있어 14px+ 본문에서는 살짝 어색할 수 있음. 본문 14/16px 케이스는 Pretendard fallback 자동 적용 (브라우저가 굴림체 자체 메트릭으로 처리하므로 안전)
- **lucide-react 픽셀화 한계**: 벡터 아이콘에 `image-rendering: pixelated`는 효과가 제한적. 진짜 픽셀룩은 SVG 자체를 1px 그리드로 재작성해야 함 — 이 PR에서는 strokeWidth 보강만, 픽셀 아이콘 자체 작성은 follow-up
- **인라인 스타일 다수**: 그라데이션 → flat 전환을 위해 여러 화면에 손이 가지만 이전 vintage 리브랜드와 동일 패턴이라 큰 위험 없음
- **모달 / 입력 컴포넌트 사용성**: NES 스타일 input은 모바일 IME 사용 시 캐럿 정렬이 약간 안 맞는 경우가 있음 → 별도 QA

## 비범위

- 다크 테마 픽셀 변형
- shadcn/ui 컴포넌트(있다면) 픽셀화
- KBO 팀 컬러
- 픽셀 아이콘 자체 제작 (lucide 강화만)
