# Plan: cleanballtrio 프론트엔드 마이그레이션

## 목표
`cleanballtrio-main.zip`의 화면·디자인 시스템을 frontend로 이관해 13개 화면 + 디자인 토큰 + 모바일 phone-frame UI를 즉시 사용 가능하게 만든다. 기존 카카오 OAuth 흐름과 React 19/Vite 8 스택은 보존.

## 결정사항
- **범위**: 화면 + 디자인 시스템만. services/store/ar/types/utils는 1차에서 제외 (cleanballtrio 화면 13개 모두 axios services 의존 0건 — AppContext mock 기반).
- **로그인**: cleanballtrio LoginScreen 디자인 채택 + 기존 OAuth 흐름(`/oauth/authorize` → `/oauth/callback` → 백엔드 `/auth/kakao`) 유지.
- **AppContext mock 데이터**: 그대로 유지 (포인트 850, 샘플 방문 3건, 인증 로그 등).
- **버전**: React 19 / Vite 8 / TS 6 유지. 신규 deps만 추가 (axios·lucide-react·motion·tw-animate-css·@types/node).

## 단계별 작업
1. **DESIGN.md** — cb-* 토큰, park scale, button/screen primitives, WCAG 주의사항 (`cb-muted-2` on `cb-bg`는 AA 미달 — large text 한정).
2. **Tooling**: `frontend/package.json` 신규 deps, `tsconfig.json`에 paths/baseUrl, `vite.config.ts`에 `@` alias·assetsInclude 추가 (figmaAssetResolver는 사용처 0건이라 제외).
3. **styles/**: 5개 css 복사, `main.tsx`의 `import './index.css'` → `'./styles/index.css'`, 기존 `index.css` 삭제.
4. **app 코어 + components**: AppContext, navigation, classNames, ecoGrades, avatar, teamBrand, design-system, BottomNav, GameRequiredModal, StatusBar, TeamBadge, AvatarFigure, imports/image.png.
5. **13개 screens**: 그대로 복사. **수정 필수**: `GameSelectScreen.tsx:2`의 `import { useApp, GameInfo }`를 `import { useApp, type GameInfo }`로 (verbatimModuleSyntax).
6. **App.tsx + main.tsx 통합**:
   - cleanballtrio App.tsx에서 BrowserRouter, AUTH_SESSION_EXPIRED 리스너 제거 → `MobileFrame`로 분리
   - `main.tsx`: `<BrowserRouter><AppProvider><NavigationProvider><App/></...></...></...>` 순으로 wrap
   - `App.tsx`(루트):
     ```
     /             → token? Navigate /home : /login
     /login        → LoginPage (우리)
     /oauth/callback → OAuthCallbackPage (우리)
     PrivateLayout(Outlet) wraps:
       /home, /onboarding, /game-select, /map, /report,
       /record, /ranking, /programs, /account, /avatar, /ar
     *             → Navigate /login
     ```
7. **LoginPage 재작성**: `cb-login-*` 클래스 + Button variant="kakao", onClick에서 `window.location.href = getKakaoLoginUrl()`. HomePage 삭제.
8. **검증**: `npm install`, `npm run typecheck`, `npm run build`, `npm run dev`로 13개 화면 smoke test.

## 범위 외
- backend API 연동 (services/store는 추후 별도 plan에서 도입; AppContext → React Query 전환도 그때)
- 카카오 토큰을 services/api.ts tokenManager(localStorage 'accessToken')와 통합
- AR 네이티브 모듈 실제 연결
- 단위 테스트 추가
- DesktopFrame 분기 유지 여부 결정 (일단 cleanballtrio 그대로 유지)

## 위험
- React 19 + motion 12 호환: motion 12는 React 19 공식 지원, OK
- React 19 + lucide-react 0.487: peerDeps 호환 확인됨
- strict tsconfig 추가 위반 가능 — typecheck 시 발견되면 즉시 수정
- theme.css `@apply border-border`는 Tailwind v4에서 정상 동작 가정
