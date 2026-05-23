# 랜딩 페이지 SVG 교체 + 전체 앱 vintage 리브랜딩

## Context

기존 로그인 화면은 짙은 그린 그라데이션 위에 로고·텍스트·카카오 버튼을 얹은 구조였다. 사용자가 새 일러스트(`용기낼깡_랜딩페이지.svg` — 빈티지 야구장 마스코트/모자 디자인, cream/burgundy/rose 톤)를 제공하면서 두 가지를 요청:

1. **랜딩 페이지 풀스크린 교체** — SVG 일러스트로 화면을 거의 채우고, 기존 supertitle/title/tagline 텍스트는 제거. 하단에 카카오 로그인 버튼만 유지.
2. **DESIGN.md 전체 vintage 리브랜딩** — 일러스트의 톤(빈티지 야구장, 따뜻한 cream/burgundy/rose)에 맞춰 전체 앱 팔레트를 교체. 기존 green primary는 폐기하고, 모든 화면(홈/지도/리그/MY 등)이 vintage 톤으로 통일.

## SVG 팔레트 분석

| Hex | 역할 |
|---|---|
| `#430A21` | deep burgundy (라인/텍스트 강조) |
| `#FAF5EF` | cream (베이스 surface) |
| `#F8EAC9` | warm cream (모자 챙) |
| `#C85C77` | rose (primary) |
| `#DD7386` | rose-mid |
| `#F2A2AD` | rose-soft (서브) |
| `#B5536A` | rose-deep |
| `#F0E8E7` | pink-tint (subtle background) |

## 결정 사항 (사용자 확인 완료)

| 영역 | 결정 |
|---|---|
| SVG 적용 방식 | **전체화면 + 카카오 버튼만** (기존 텍스트 제거) |
| DESIGN.md 범위 | **전체 앱 vintage 리브랜딩** (green primary 폐기) |
| Brand primary | `--cb-primary` = `#C85C77` (rose) |
| App background | `--cb-bg` = `#FAF5EF` (cream) |
| Text strong | `--cb-text` = `#430A21` (deep burgundy) |
| 카카오 버튼 | 변경 없음 (`#FEE500` / `#3C1E1E`) |

## 구현 단계

### 1. SVG 자산 배치

- `용기낼깡_랜딩페이지.svg`를 `frontend/src/assets/landing.svg`로 복사
- 1.6MB → Vite가 `?url`로 import 시 정적 자산으로 그대로 서빙. 별도 최적화는 후속 PR.

### 2. DESIGN.md 갱신 (1차 commit: `chore(design): vintage palette`)

- 1-1 Color — Brand: green(`park-*`) 표 삭제, **Rose / Cream / Burgundy** 표로 교체
  - `--cb-cream-50` ~ `--cb-cream-300` (베이스 surface 단계)
  - `--cb-rose-100` ~ `--cb-rose-700` (primary 단계, primary = `rose-500` = `#C85C77`)
  - `--cb-burgundy-700` ~ `--cb-burgundy-900` (text strong, deep accent)
- 1-2 Color — Surface/Text: bg=cream, text=burgundy로 재매핑
- 1-3 Color — Semantic: kakao 유지, danger는 `#B5536A` 부근으로 (rose 톤과 충돌 방지 위해 별도 토큰)
- 1-8 Gradient
  - `--cb-gradient-primary`: `rose-500 → rose-deep` (135deg)
  - `--cb-gradient-login`: 폐기 (SVG가 배경을 대신함)
- 「Stadium Twilight extensions」 섹션 메모 추가: SVG 풀스크린으로 대체되어 기존 cb-login-meta/cb-login-emblem/cb-login-wordmark/cb-login-tagline는 제거됨

### 3. `design-system.css` 토큰 동기화 (DESIGN.md과 동일 commit)

- `:root` 안의 `--cb-bg`/`--cb-primary`/`--cb-text` 등 핵심 토큰을 vintage 값으로 교체
- 기존 `--park-*` 변수는 `theme.css`에 있는지 확인 후 함께 갱신 (또는 alias로 남겨두기)
- `--cb-gradient-login` 제거

### 4. LoginPage 구현 (2차 commit: `feat(login): vintage SVG landing`)

- `LoginPage.tsx`
  - `cb-login-meta` / `cb-login-brand` / `cb-login-emblem` / `cb-login-wordmark` / `cb-login-tagline` / `cb-login-cta-eyebrow` 모두 제거
  - 구조: `<div className="cb-login-screen"><img className="cb-login-art" /><div className="cb-login-actions"><Button kakao /></div></div>`
- `design-system.css`
  - `.cb-login-screen` 전면 재작성: 배경은 `--cb-bg` (cream), padding 축소, flex column
  - `.cb-login-art`: width 100%, object-fit contain, flex 1
  - `.cb-login-actions`: 하단 고정, padding `--cb-space-md`, safe-area-inset-bottom
  - 기존 `cb-login-*` 모든 추가 클래스(`cb-login-screen::before` noise, breathing halo 등) 삭제

### 5. 영향 받는 화면 점검

- `HomeScreen` / `MapScreen` / `RankingScreen` / `RecordScreen` / `ReportScreen` / `TeamSelectScreen` 등에서 `--park-*` 또는 green-hardcoded 값 사용처가 있으면 토큰 갱신만으로 vintage 톤으로 자연 전환.
- **테스트 필요**: 카드/뱃지/Button primary/BottomNav active 색상이 모두 rose로 바뀌었는지 시각 확인.

### 6. Test / Verify

- 기존 단위 테스트는 색상 토큰에 의존하지 않으므로 영향 적음
- `./scripts/verify.sh` (typecheck + lint + test + build) 통과 확인
- 실기기/브라우저에서 로그인 화면, 홈, MY 화면 시각 회귀 점검

## 비범위 (Out of Scope)

- BottomNav 아이콘 자체 교체 (lucide-react 유지)
- 다크 테마
- SVG 최적화 (SVGO/inlining)
- KBO 팀 컬러 토큰(`teamBrand.ts`) — 팀 고유 색상이므로 vintage 리브랜딩과 무관, 그대로 유지

## 리스크

- **WCAG AA 대비**: rose(`#C85C77`) on cream(`#FAF5EF`) 본문 대비비는 약 4.5:1 경계. 본문은 burgundy(`#430A21`)로 처리하여 안전 확보. 버튼 텍스트는 흰색 유지.
- **사용자 영향**: 시각적으로 큰 변화. 사전 안내 또는 단계적 롤아웃 미고려 (요청 자체가 전면 교체).
