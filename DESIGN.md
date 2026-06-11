# Design System

> Single Source of Truth. UI 코드 작성 전 반드시 이 문서를 읽고, 여기 정의된 토큰만 사용한다. 새 색상/폰트/간격이 필요하면 코드보다 이 문서를 먼저 갱신.
>
> **Vintage Ballpark + Pixel Style (2026-05)** — green Park 팔레트 폐기, cream/burgundy/rose 톤. 컴포넌트는 NES.css 스타일(픽셀 폰트 + hard shadow + 2px solid border + 0 radius).

## 0. Pixel Style Rules (필수)

도트(픽셀) 스타일 = 다음 6축을 모두 준수해야 한다. 일부만 적용하면 "어중간한 모던/픽셀" 룩이 되어 톤이 깨진다.

| 축 | 규칙 |
|---|---|
| **폰트** | `--cb-font-family` / `--cb-font-family-display` = **Pretendard** (본문·헤딩 공통). 가변 폰트라 100~900 weight 사용 가능 |
| **모서리** | `border-radius: 0` 절대 원칙. 원형 아바타·점·로딩 스피너만 `9999px` 허용 |
| **테두리** | `border: var(--cb-border-pixel)` = `2px solid #430a21` 기본. 인라인 스타일에서도 `2px solid` 미만 금지 |
| **그림자** | hard offset만. `--cb-shadow-xs/sm/md/primary`는 모두 `Xpx Xpx 0 0 #430a21` 형태. blur(`rgba(..., 0.X)` 4th value) 사용 금지 |
| **그라데이션** | `linear-gradient(...)` 금지. flat color로 대체. 강조가 필요하면 hard shadow + border 조합으로 |
| **아이콘** | lucide-react `strokeWidth ≥ 2.5` (BottomNav `3`). 작은 SVG에는 `image-rendering: pixelated` (theme.css에서 전역 적용) |

활성/누르기 인터랙션 (전역 구현 — `design-system.css`):
- 모든 `button:not(:disabled):active` → `transform: translate(2px, 2px)` (픽셀 press). `transition: transform 70ms`는 `prefers-reduced-motion: no-preference`에서만
- hard shadow를 선언한 버튼(`.cb-button` 및 인라인 `[style*="box-shadow"]`)은 `:active`에 `box-shadow: var(--cb-shadow-pressed)`로 collapse
- **예외 `.cb-no-press`**: transform으로 위치를 잡는 버튼(지도 마커, 카드 스티커)과 드래그 표면(카드 슬롯)은 press transform 제외 — 필수 적용

## 1-0. Pixel Border / Shadow tokens

| Token | Value | 용도 |
|---|---|---|
| `--cb-border-width` | `2px` | 기본 테두리 두께 |
| `--cb-border-pixel` | `2px solid #430a21` | 프레임 룩 |
| `--cb-shadow-xs` | `2px 2px 0 0 #430a21` | subtle frame |
| `--cb-shadow-sm` | `3px 3px 0 0 #430a21` | card |
| `--cb-shadow-md` | `4px 4px 0 0 #430a21` | elevated |
| `--cb-shadow-primary` | `4px 4px 0 0 #430a21` | CTA |
| `--cb-shadow-pressed` | `1px 1px 0 0 #430a21` | :active |

## 1-1. Color — Brand (Vintage Ballpark)

랜딩 일러스트(`frontend/src/assets/landing.svg`)의 vintage 야구장 톤을 기반으로 한다.

### Cream — 베이스 surface

| Token | Hex | 용도 |
|---|---|---|
| `--cream-50` | `#FFFCF6` | 가장 밝은 surface, modal/elevated card |
| `--cream-100` | `#FAF5EF` | **app background** (primary surface) |
| `--cream-200` | `#F8EAC9` | warm cream, 강조 surface (cap brim 톤) |
| `--cream-300` | `#F0E8E7` | pink-tint subtle background |

### Rose — primary 단계

| Token | Hex | 용도 |
|---|---|---|
| `--rose-100` | `#FBE6EA` | primary-soft surface, selected chip bg |
| `--rose-200` | `#F2A2AD` | primary-border, secondary accent |
| `--rose-300` | `#DD7386` | rose-mid, hover state |
| `--rose-500` | `#C85C77` | **primary** (CTA, active nav, brand) |
| `--rose-700` | `#B5536A` | primary-strong, pressed/deep |

### Burgundy — text strong / dark accent

| Token | Hex | 용도 |
|---|---|---|
| `--burgundy-700` | `#5E1530` | text-soft (보조 본문) |
| `--burgundy-900` | `#430A21` | **primary text**, 강조 라인 |

## 1-1B. Color — Game-state semantic (baseball UI)

`docs/design-reference/components-library.png` 참고. 야구 game-state(OUT·BALL·STRIKE)는 일반 semantic(danger/warning)과 분리된 도메인 토큰.

| Token | Hex | 용도 |
|---|---|---|
| `--cb-state-out` | `#430A21` | OUT — burgundy 강조 (가장 강한 stop) |
| `--cb-state-ball` | `#F8EAC9` | BALL — warm cream (중립/대기) |
| `--cb-state-strike` | `#C85C77` | STRIKE — rose (경고) |
| `--cb-state-hit` | `#5E8B5A` | HIT — vintage olive (긍정) |
| `--cb-state-run` | `#B07800` | RUN — warm gold (액션) |
| `--cb-score-home` | `#C85C77` | 홈팀 점수 라벨 |
| `--cb-score-away` | `#430A21` | 원정팀 점수 라벨 |

사용 컴포넌트: `<ScoreBadge>` / `<InningIndicator>` / `<GameStateTag>` ([Component Primitives](#component-primitives) 섹션 참고).

## 1-1C. Decoration patterns

| Token | Value | 용도 |
|---|---|---|
| `--cb-pattern-stadium-dots` | SVG data URL (4×4 grid, rose dots on cream) | EmptyState · 빈 화면 배경 텍스처 |

CSS 사용: `background-image: var(--cb-pattern-stadium-dots);`. `background-size: 16px 16px;`로 반복.

## 1-2. Color — Surface / Text

| Token | Hex | 용도 |
|---|---|---|
| `--cb-bg` | `#FAF5EF` | screen background (= `--cream-100`) |
| `--cb-bg-soft` | `#FFFCF6` | soft surface (= `--cream-50`) |
| `--cb-surface` | `#FFFFFF` | card, header, action-bar |
| `--cb-surface-muted` | `#F0E8E7` | secondary button bg (= `--cream-300`) |
| `--cb-surface-warm` | `#F8EAC9` | accent surface (= `--cream-200`) |
| `--cb-text` | `#430A21` | primary text (= `--burgundy-900`) |
| `--cb-text-soft` | `#5E1530` | secondary text (= `--burgundy-700`) |
| `--cb-muted` | `#8C6B73` | description, helper (burgundy 톤 muted) |
| `--cb-muted-2` | `#B59CA3` | ⚠ 본문 사용 금지(대비 미달); 14px 이상의 보조 라벨 한정 |
| `--cb-disabled` | `#D6CFD0` | disabled state |
| `--cb-border` | `rgba(67, 10, 33, 0.08)` | divider (burgundy 8%) |
| `--cb-border-strong` | `#E8DEDE` | input border, card border |

## 1-3. Color — Semantic

| Token | Hex | 용도 |
|---|---|---|
| `--cb-kakao` | `#FEE500` | 카카오 버튼 배경 |
| `--cb-kakao-text` | `#3C1E1E` | 카카오 버튼 텍스트 (대비 13.4:1) |
| `--cb-danger` | `#C2362C` | error (rose 톤과 충돌 회피 위해 deep red) |
| `--cb-warning-bg` | `#FFF4D6` | warning surface |
| `--cb-warning-text` | `#8C5A00` | warning text |
| `--cb-success` | `#5E8B5A` | 친환경/달성 상태 (vintage olive 톤) |

## 1-4. Radius (Pixel — 모두 0)

| Token | Value | 용도 |
|---|---|---|
| `--cb-radius-md` | `0px` | 픽셀 룩 — 버튼/입력/카드/모달/칩 모두 사각 |
| `--cb-radius-full` | `9999px` | **예외**: 원형 아바타·점·로딩 스피너만 |

폐기: `--cb-radius-sm/lg/xl` (모두 `0px`로 alias).

## 1-5. Spacing

| Token | Value | 용도 |
|---|---|---|
| `--cb-space-sm` | `12px` | 요소 내부 간격, 버튼 padding, 인접 컴포넌트 간 micro-gap |
| `--cb-space-md` | `24px` | 화면 padding, 섹션 간 여백, 액션바 padding |

모바일 적용: 화면 좌우 padding = `--cb-space-md` (24px). 액션바 = `--cb-space-sm --cb-space-md --cb-space-md` (12 24 24, `safe-area-inset-bottom` 추가).

## 1-6. Typography

### Font family

| Token | Value |
|---|---|
| `--cb-font-family` | `'Pretendard Variable', Pretendard, 'Noto Sans KR', sans-serif` |
| `--cb-font-family-display` | `'Pretendard Variable', Pretendard, 'Noto Sans KR', sans-serif` |

- **Pretendard**: 본문·헤딩 공통 (OFL, [github.com/orioncactus/pretendard](https://github.com/orioncactus/pretendard)). jsDelivr CDN(variable)으로 로드
- 가변 폰트라 100~900 weight 자유 사용. 한글/라틴/숫자 글리프 모두 커버
- 임의 px 사이즈 자유롭게 사용 가능 (픽셀 그리드 제약 없음)

### Font size

| Token | Value | rem | 용도 |
|---|---|---|---|
| `--cb-font-size-sm` | `14px` | 0.875rem | caption, helper, 보조 라벨 |
| `--cb-font-size-base` | `16px` | 1rem | 본문 기본 |
| `--cb-font-size-lg` | `20px` | 1.25rem | 소제목, 강조 본문, 카드 헤딩 |

### Font weight

| Token | Value | 용도 |
|---|---|---|
| `--cb-font-weight-normal` | `400` | 본문 |
| `--cb-font-weight-bold` | `700` | 강조, 제목, CTA |

### Mobile-specific rules

iOS Safari 자동 줌 방지: input/select/textarea는 최소 16px 보장.

```css
@supports (-webkit-touch-callout: none) {
  input, select, textarea {
    font-size: max(16px, var(--cb-font-size-base));
  }
}
```

라인 높이 권장: 본문 1.5, 헤딩 1.3.
터치 타겟 최소: 44×44px (WCAG 2.5.5). 기존 Button size md=48 / lg=54 만족.

## 1-7. Shadow

vintage 톤에 맞춰 그림자는 burgundy 베이스로 살짝 따뜻하게.

| Token | Value | 용도 |
|---|---|---|
| `--cb-shadow-xs` | `0 1px 3px rgba(67, 10, 33, 0.06)` | subtle |
| `--cb-shadow-sm` | `0 2px 8px rgba(67, 10, 33, 0.08)` | card |
| `--cb-shadow-md` | `0 4px 16px rgba(67, 10, 33, 0.12)` | elevated card |
| `--cb-shadow-primary` | `0 4px 12px rgba(200, 92, 119, 0.35)` | primary CTA (rose) |

## 1-8. Gradient

- `--cb-gradient-primary`: `linear-gradient(135deg, var(--rose-500), var(--rose-700))` — primary CTA 배경
- `--cb-gradient-warm`: `linear-gradient(135deg, var(--cream-100) 0%, var(--cream-200) 100%)` — warm hero/banner 배경

**폐기**: `--cb-gradient-login` (랜딩이 SVG 일러스트로 대체되어 그라데이션 배경 불필요).

## 1-9. Layout

- 인앱 모바일 컨테이너: `cb-app-root` (100dvh 풀스크린) / 데스크톱 미러: `cb-phone-frame` (390×844, iPhone 14 비율)
- 화면 좌우 padding: `var(--cb-space-md)` (24px)
- 액션바 padding: `var(--cb-space-sm) var(--cb-space-md) var(--cb-space-md)` (12 / 24 / 24) + `env(safe-area-inset-bottom)`

## Component Primitives

`frontend/src/app/components/design-system.tsx` 및 `frontend/src/styles/design-system.css`에 구현되어 있다. 새 컴포넌트는 이 패턴을 따른다.

### `<Screen>` / `<ScreenHeader>` / `<ScrollArea>` / `<ActionBar>`

화면 표준 레이아웃: header(고정) + scroll(가변) + action-bar(고정). `padded`/`stack`/`actions` 옵션 제공.

### `<Button>`

- `variant`: `primary` (rose 그라데이션 CTA) | `soft` (연한 rose) | `secondary` (warm cream) | `ghost` (투명) | `kakao` (브랜드 옐로)
- `size`: `md` (48px) | `lg` (54px)
- `fullWidth`: 100% 폭

### `<TeamBadge teamName={...}>`

KBO 10개 팀 모노그램 배지. 공식 로고/마스코트 아님 — 라이선스 회피 목적.
팀 컬러는 `frontend/src/app/teamBrand.ts`에 정의 (vintage 리브랜딩 대상 아님 — 팀 고유 색상 보존).

### `<BottomNav>`

하단 5탭: 홈 / 인증(잠금시 GameRequiredModal) / 지도 / 리그 / MY. lucide-react 아이콘. active 상태는 `--cb-primary` (rose).

### `<GameRequiredModal>` / 모달 일반

- `cb-modal-backdrop` + `cb-modal` 클래스
- motion(`framer-motion v12`) `AnimatePresence` 기반 spring 애니메이션
- `--cb-radius-md` (8px) 코너

### `<StatusBar>`

Dynamic Island 아래 spacer (`cb-status-spacer`, 46px or env safe-area). 시각 요소 없음.

### `<LoginPage>` — Landing

vintage 야구장 일러스트(`frontend/src/assets/landing.svg`)를 풀스크린 배치하고, 하단에 카카오 로그인 버튼만 고정. 별도 텍스트 헤드라인 없음 — 일러스트가 브랜딩을 담당. 배경은 `--cb-bg` (cream-100).

```
┌─────────────────┐
│                 │
│   [ SVG art ]   │  ← flex: 1, object-fit: contain
│                 │
├─────────────────┤
│ [카카오로 시작]   │  ← action-bar, safe-area-inset-bottom
└─────────────────┘
```

### `<TutorialOverlay>` — 첫 진입 온보딩 캐러셀

로그인 직후 앱 프레임 내부를 덮는 풀스크린 오버레이. 실제 앱 스크린샷 4장을 좌우 스와이프/다음 버튼으로 넘긴다.

- 컨테이너: `cb-tutorial-backdrop` (`position: absolute; inset: 0`, `--cb-bg`, `z-index: 50`). `.cb-app-bg`(relative + isolation) 내부에 마운트되어 폰 프레임 안에 갇힘.
- 슬라이드 트랙: `cb-tutorial__track` (`transform: translateX`), 전환 `320ms cubic-bezier(0.22,0.61,0.36,1)`. 스크린샷은 `cb-tutorial__shot` (pixel border + `--cb-shadow-md`, `max-height: 54vh`).
- 제목 `cb-tutorial__title`(`--cb-text`, 18px/800), 설명 `cb-tutorial__desc`(`--cb-muted`, 14px).
- **점 인디케이터** `cb-tutorial-dots` > `cb-tutorial-dot`: inactive=`--cb-border` 8px 원, active(`.is-active`)=`--cb-primary` 22px 알약. 신규 토큰 없이 기존 색 토큰만 사용.
- CTA는 `<Button variant="primary" size="lg">`("다음"/"시작하기"), "다시 안보기"는 `cb-tutorial__skip` 텍스트 버튼(`--cb-muted`).
- `prefers-reduced-motion`: 트랙/점 transition 제거.

## Rules

- 임의의 hex/rgb/매직 px 금지. 위 토큰 또는 Tailwind utility 경유
- 인라인 `style` 금지 (단, `--team-primary` 같은 동적 CSS 변수 주입은 허용)
- 색상 대비 WCAG AA (본문 4.5:1, 14px 이상 굵은 텍스트 3:1) 만족 여부 확인. rose-500(#C85C77) on cream-100(#FAF5EF) 본문 사용 금지 — burgundy-900 사용
- 새 토큰 추가 시: 먼저 이 문서 갱신 → `theme.css` / `design-system.css` 갱신 → 컴포넌트 사용. 별도 commit (`chore(design): ...`)
- 다크 테마: 현재 미적용. 도입 시 본 문서에 표 한 줄씩 추가
