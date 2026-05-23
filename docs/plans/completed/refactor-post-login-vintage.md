# 로그인 이후 화면 vintage 디자인 시스템 적용

## Context

이전 PR(`feat(login): vintage 랜딩 페이지`)에서 `DESIGN.md` 토큰을 green park → vintage cream/burgundy/rose로 전환했다. `--park-*` 토큰을 alias로 vintage 값에 매핑해두었지만, 컴포넌트 내부에는 **하드코딩된 hex 값**(#3DDB6D, #E2FAE9 등)이 광범위하게 남아있어 토큰 alias 변경으로 자동 전환되지 않는다.

이 PR에서는 로그인 이후 모든 화면(Home/Map/Report/Record/Ranking + 공용 CSS)의 인라인 hex 값과 SVG 그라데이션을 vintage 토큰으로 정리한다.

## 색상 매핑 표

| 기존 green hex | 용도 | 신규 vintage |
|---|---|---|
| `#F2FBF5` | screen bg | `var(--cb-bg-soft)` |
| `#E2FAE9`, `#E6FFFA`, `#E6F7EC`, `#DFF3E6` | primary-soft surface, accent | `var(--cb-primary-soft)` |
| `#C0F5D3`, `#BDF5D2`, `#B8EFCB`, `#97E4B0` | primary-border | `var(--cb-primary-border)` |
| `#8EEDB0`, `#6AE995`, `#46B86B` | mid green | `#DD7386` |
| `#3DDB6D` | primary | `var(--cb-primary)` |
| `#1AB852` | primary-strong | `var(--cb-primary-strong)` |
| `#13923F`, `#0F9F8B`, `#0F7038` | primary-deep / text accent | `var(--cb-primary-deep)` |
| `#0D6C2E`, `#07481E`, `#0D2B1A`, `#113C27` | deep dark | `var(--cb-text)` (#430A21) |
| `#1E5631`, `#1A4A2C`, `#1D7A47`, `#133A2A` | dark green gradient steps | burgundy steps |
| `#35BA68`, `#3AA867` | medium gradient steps | `#C85C77` |
| `rgba(61,219,109,X)` | green shadow | `rgba(200, 92, 119, X)` |
| `#EEF8F1`, `#F8FCF9`, `#E2F5E8`, `#D7ECDD`, `#CEE9D7` | very light field steps (MapScreen SVG) | cream/warm steps |
| `#A8F0C0` | green ring shadow | `#F2A2AD` |

## 구현 단계

### 1. `HomeScreen.tsx` (15+ hex)
- screen bg `#F2FBF5` 제거 (`--cb-bg-soft` 또는 토큰 활용)
- 메인 CTA 그라데이션, 카드 hero bg, badge bg/text, ticker bg 모두 rose 톤으로

### 2. `MapScreen.tsx` (10+ hex, SVG 포함)
- 인라인 hex 교체
- **SVG field 그라데이션**: 야구장 잔디 표현을 cream/warm으로 (디자인적 검토 필요 — 잔디 색이 빨강이면 어색할 수 있어 `--cb-surface-warm`(#F8EAC9) + 약간 짙은 cream으로 처리)

### 3. `ReportScreen.tsx` (5 hex)
- "use" 모드 다크 그린 그라데이션 → burgundy/rose 그라데이션
- progress bar, tone/tint → rose

### 4. `RecordScreen.tsx` (7 hex)
- 통계 카드 그라데이션, dashed border, accent → rose
- 검은 배경 → burgundy 가까운 톤

### 5. `RankingScreen.tsx` (2 hex)
- screen bg, hero card 그라데이션 → vintage

### 6. `design-system.css` (5 hex)
- `.cb-desktop-shell` 배경 그라데이션
- `.cb-empty-state__icon`, `.cb-team-card.is-selected`, `.cb-game-card.is-favorite/is-selected` shadow/gradient
- 모두 vintage 토큰 변형

### 7. 검증
- Puppeteer로 각 화면 스크린샷 (홈/맵/리포트/레코드/랭킹/팀선택)
- `npm run typecheck && npm run build`

## 비범위

- 디자인 토큰 자체 변경 (이미 직전 PR에서 처리)
- 컴포넌트 구조 리팩토링 (색상만 정리)
- 다크 모드
- KBO 팀 컬러 (teamBrand.ts) — 팀 고유 색상이라 유지
