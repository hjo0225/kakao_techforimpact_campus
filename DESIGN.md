# Design System

> Single Source of Truth. UI 코드 작성 전 반드시 이 문서를 읽고, 여기 정의된 토큰만 사용한다. 새 색상/폰트/간격이 필요하면 코드보다 이 문서를 먼저 갱신.

## Tokens

토큰은 `frontend/src/styles/theme.css`(Tailwind v4 `@theme inline`용 park scale)와 `frontend/src/styles/design-system.css`(컴포넌트 클래스용 `--cb-*`)에 정의되어 있다. 두 시스템은 공존하며 역할이 다르다:

- **park scale (`--park-*`, `--background`, `--primary` 등)**: Tailwind utility (`bg-primary`, `text-foreground`)와 shadcn 호환 컴포넌트가 사용
- **`--cb-*`**: cleanballtrio가 정의한 컴포넌트 primitive 클래스(`cb-screen`, `cb-button` 등)에서만 사용. 새 컴포넌트도 가급적 이쪽 토큰을 따른다

### Color — Brand (Park / Eco Green)

| Token            | Hex       | 용도                          |
|------------------|-----------|-------------------------------|
| `--park-50`      | `#F2FBF5` | app background                |
| `--park-100`     | `#E2FAE9` | surface tint, primary-soft    |
| `--park-200`     | `#C0F5D3` | primary-border                |
| `--park-300`     | `#8EEDB0` |                               |
| `--park-400`     | `#6AE995` |                               |
| `--park-500`     | `#3DDB6D` | **primary**                   |
| `--park-600`     | `#1AB852` | primary-strong                |
| `--park-700`     | `#13923F` | primary-deep, eco grade text  |
| `--park-800`     | `#0D6C2E` |                               |
| `--park-900`     | `#07481E` |                               |

### Color — Surface / Text

| Token                | Hex       | 용도                                |
|----------------------|-----------|-------------------------------------|
| `--cb-bg`            | `#F2FBF5` | screen background                   |
| `--cb-bg-soft`       | `#F8FFFA` |                                     |
| `--cb-surface`       | `#FFFFFF` | card, header, action-bar            |
| `--cb-surface-muted` | `#F0F5F1` | secondary button bg                 |
| `--cb-surface-green` | `#E2FAE9` | accent surface                      |
| `--cb-text`          | `#111827` | primary text                        |
| `--cb-text-soft`     | `#374151` | secondary text                      |
| `--cb-muted`         | `#6B7280` | description, helper                 |
| `--cb-muted-2`       | `#9CA3AF` | ⚠ 본문에는 사용 금지 — 본문 대비 미달; 14px 이상의 보조 라벨에만 |
| `--cb-disabled`      | `#C8CDD4` | disabled state                      |
| `--cb-border`        | `rgba(0,0,0,0.07)` | divider                       |
| `--cb-border-strong` | `#E5E7EB` | input border                        |

### Color — Semantic

| Token                  | Hex       | 용도                  |
|------------------------|-----------|-----------------------|
| `--cb-kakao`           | `#FEE500` | 카카오 버튼 배경       |
| `--cb-kakao-text`      | `#3C1E1E` | 카카오 버튼 텍스트 (대비 13.4:1) |
| `--cb-danger`          | `#E53E3E` | error                 |
| `--cb-warning-bg`      | `#FFF8E6` |                       |
| `--cb-warning-text`    | `#B07800` |                       |

### Radius

| Token              | Value | 용도                        |
|--------------------|-------|-----------------------------|
| `--cb-radius-sm`   | `10px`| chip, small button          |
| `--cb-radius-md`   | `14px`| **default button**          |
| `--cb-radius-lg`   | `18px`| card                        |
| `--cb-radius-xl`   | `22px`| modal, large card           |

### Shadow

| Token                  | Value                              | 용도                |
|------------------------|------------------------------------|---------------------|
| `--cb-shadow-xs`       | `0 1px 3px rgba(0,0,0,0.05)`       | subtle              |
| `--cb-shadow-sm`       | `0 2px 8px rgba(0,0,0,0.06)`       | card                |
| `--cb-shadow-md`       | `0 4px 16px rgba(17,24,39,0.1)`    | elevated card       |
| `--cb-shadow-primary`  | `0 4px 12px rgba(61,219,109,0.35)` | primary CTA         |

### Gradient

- `--cb-gradient-primary`: `linear-gradient(135deg, var(--cb-primary), var(--cb-primary-strong))` — primary CTA 배경
- `--cb-gradient-login`: `linear-gradient(135deg, var(--park-800) 0%, var(--park-700) 50%, var(--park-600) 100%)` — 좌상단 → 우하단 그린 그라데이션 (login 화면 전용 배경)

### Typography

- 폰트 패밀리:
  - **본문/UI**: `'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif` (`--cb-font-family`)
  - **디스플레이/스포츠 카피**: `'Big Shoulders Display', 'Noto Sans KR', sans-serif` (`--cb-display-family`) — Chicago Design System 출신 condensed sans. 영문 대문자 + 와이드 letter-spacing(0.18em+)에서 스포츠 매거진 무게감을 만들 때 사용. 한글에 직접 적용 금지(글리프 없음)
- 임포트: `frontend/src/styles/fonts.css`에서 Google Fonts (Noto Sans KR 400~900 + Big Shoulders Display 600~900)
- iOS Safari 자동 줌 방지 위해 `input/select/textarea`는 16px 이상 고정 (`@supports (-webkit-touch-callout: none)`)
- 기본 weight: `500` (medium), 본문 `400` (normal), 강조 `700–800`, 디스플레이 헤드라인 `900`


### Spacing & Layout

- 인앱 모바일 컨테이너: `cb-app-root` (100dvh 풀스크린) 또는 데스크톱은 `cb-phone-frame` (390×844, iPhone 14 비율)
- 화면 padding: `cb-scroll--padded` = `16px 20px`
- 액션바: `padding: 12px 20px 24px` (safe-area 포함)

## Component Primitives

`frontend/src/app/components/design-system.tsx` 및 `frontend/src/styles/design-system.css`에 구현되어 있다. 새 컴포넌트는 이 패턴을 따른다.

### `<Screen>` / `<ScreenHeader>` / `<ScrollArea>` / `<ActionBar>`
화면 표준 레이아웃: header(고정) + scroll(가변) + action-bar(고정). `padded`/`stack`/`actions` 옵션 제공.

### `<Button>`
- `variant`: `primary` (그라데이션 CTA) | `soft` (연한 그린) | `secondary` (회색) | `ghost` (투명) | `kakao` (브랜드 옐로)
- `size`: `md` (48px) | `lg` (54px)
- `fullWidth`: 100% 폭

### `<TeamBadge teamName={...}>`
KBO 10개 팀 모노그램 배지. 공식 로고/마스코트 아님 — 라이선스 회피 목적.
팀 컬러는 `frontend/src/app/teamBrand.ts`에 정의 (LG `#C3042F`, 두산 `#131230` 등).

### `<BottomNav>`
하단 5탭: 홈 / 인증(잠금시 GameRequiredModal) / 지도 / 리그 / MY. lucide-react 아이콘.

### `<GameRequiredModal>` / 모달 일반
- `cb-modal-backdrop` + `cb-modal` 클래스
- motion(`framer-motion v12`) `AnimatePresence` 기반 spring 애니메이션
- `cb-radius-xl` 코너

### `<StatusBar>`
Dynamic Island 아래 spacer (`cb-status-spacer`, 46px or env safe-area). 시각 요소 없음.

## Rules

- 임의의 hex/rgb/매직 px 금지. 위 토큰 또는 Tailwind utility 경유
- 인라인 `style` 금지 (단, `--team-primary` 같은 동적 CSS 변수 주입은 허용)
- 색상 대비 WCAG AA (본문 4.5:1, 14px 이상 굵은 텍스트 3:1) 만족 여부 확인. 미달 토큰 조합 금지
- 새 토큰 추가 시: 먼저 이 문서 갱신 → `theme.css` or `design-system.css` 갱신 → 컴포넌트 사용. 별도 commit (`chore(design): ...`)
- 다크 테마: `theme.css`에 `.dark { ... }` 토큰 정의되어 있으나 현재 적용 안 함. 도입 시 본 문서에 표 한 줄씩 추가
