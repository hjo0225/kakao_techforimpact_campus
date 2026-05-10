# cleanballtrio-web (Frontend)

React 19 + Vite 8 + TypeScript + Tailwind v4. Firebase Hosting에 정적 SPA로 배포.

**Prod URL**: https://cleanballtrio.web.app

## 개발

```bash
npm install
cp .env.example .env   # KAKAO 키 등 채우기 (아래 참고)
npm run dev            # http://localhost:5173 (HMR)
```

### 환경변수

Vite는 빌드 타임에 `import.meta.env.VITE_*`를 번들에 박아 넣음. 따라서 dev/prod별로 다른 파일 사용:

- `.env` — 로컬 개발용
- `.env.production` — `npm run build` 시 자동 적용 (gitignored)
- `.env.production.example` — 템플릿

| 변수 | 용도 | dev 예시 | prod 예시 |
|---|---|---|---|
| `VITE_KAKAO_REST_API_KEY` | 카카오 REST API 키 (브라우저 노출 OK) | 32자 hex | 동일 |
| `VITE_KAKAO_REDIRECT_URI` | 카카오 OAuth 리다이렉트 URI | `http://localhost:5173/oauth/callback` | `https://cleanballtrio.web.app/oauth/callback` |
| `VITE_KAKAO_LOGOUT_REDIRECT_URI` | 로그아웃 후 이동 | `http://localhost:5173/login` | `https://cleanballtrio.web.app/login` |
| `VITE_API_BASE_URL` | 백엔드 API 베이스 URL | `http://localhost:3001` | `https://cleanballtrio-api-fpvvjohnta-du.a.run.app` |

> ⚠️ **Vite env는 빌드 타임에 박힘**. URL 바꾸면 재빌드 + 재배포 필요.

> 카카오 콘솔 (https://developers.kakao.com) 에서 같은 redirect URI / 사이트 도메인을 사전 등록해야 OAuth가 작동.

## 빌드 / 검증

```bash
npm run build       # tsc + vite build → dist/
npm run typecheck   # tsc --noEmit
npm run preview     # 빌드 결과 로컬 프리뷰
```

## 배포

### 자동 (권장)
`main` 브랜치에 `frontend/**`/`firebase.json`/`.firebaserc` 변경 push 시 GitHub Actions가:
1. `npm run typecheck`
2. `VITE_*` env를 GitHub Secrets에서 주입한 채 `npm run build`
3. `firebase deploy --only hosting` (WIF 인증)

워크플로: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) 의 `ci-frontend` job

### 수동

```bash
npm run build
firebase deploy --only hosting   # 프로젝트 루트에서
```

`firebase.json`은 SPA rewrite + asset 캐시 헤더 (JS/CSS 1년 immutable, images 1일).

## 카카오 로그인 흐름

1. **로그인 버튼 클릭** → `https://kauth.kakao.com/oauth/authorize?client_id=...&redirect_uri=...&response_type=code` 로 리다이렉트
2. **카카오 콘솔** → `code`와 함께 `VITE_KAKAO_REDIRECT_URI`로 콜백
3. **`OAuthCallbackPage`** → `POST {VITE_API_BASE_URL}/auth/kakao { code, redirectUri }`
4. **백엔드** → JWT 응답
5. 프론트가 JWT 저장 (Zustand) 후 메인으로 리다이렉트

관련 코드:
- `src/lib/kakaoAuth.ts` — 카카오 인증 URL 생성
- `src/pages/OAuthCallbackPage.tsx` — 콜백 처리 + JWT 교환

## 디렉토리

```
frontend/
├── src/
│   ├── main.tsx         ─ Vite entry
│   ├── App.tsx
│   ├── pages/           ─ 라우트별 페이지
│   ├── components/      ─ 재사용 컴포넌트
│   ├── lib/             ─ kakaoAuth 등 유틸
│   └── ...
├── public/              ─ 정적 자산 (build 시 dist 루트로 복사)
├── vite.config.ts
└── index.html
```

## 디자인

토큰/컴포넌트 패턴은 [`../DESIGN.md`](../DESIGN.md) 의 SSOT를 따름. 토큰에 없는 색/폰트/간격 도입 시 코드보다 `DESIGN.md` 먼저 갱신.
