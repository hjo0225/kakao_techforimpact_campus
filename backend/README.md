# cleanballtrio-api (Backend)

NestJS + TypeScript API. 카카오 OAuth 인증, JWT 발급. Cloud Run에 컨테이너로 배포.

**Prod URL**: https://cleanballtrio-api-fpvvjohnta-du.a.run.app

## 개발

```bash
npm install
cp .env.example .env   # 시크릿 채우기 (아래 참고)
npm run start:dev      # http://localhost:3001 (watch)
```

### 환경변수 (`.env`)

| 변수 | 용도 | 예시 |
|---|---|---|
| `PORT` | 서버 포트 (Cloud Run에선 자동) | `3001` |
| `KAKAO_REST_API_KEY` | 카카오 디벨로퍼스 REST API 키 | 32자 hex |
| `KAKAO_CLIENT_SECRET` | 카카오 Client Secret (활성화 시) | 32자 hex |
| `JWT_SECRET` | JWT 서명 시크릿 | 충분히 긴 random |
| `CORS_ORIGIN` | 허용 origin (콤마 구분 다중) | `http://localhost:5173,https://cleanballtrio.web.app` |

## 빌드 / 테스트

```bash
npm run build         # nest build → dist/
npm run test          # Jest 단위 테스트
npm run test:e2e      # E2E 테스트
npm run lint          # eslint --fix
```

## 배포

### 자동 (권장)
`main` 브랜치에 `backend/**` 변경 push 시 GitHub Actions가 자동:
- 인증: Workload Identity Federation
- 빌드/배포: `gcloud run deploy --source backend` (Cloud Build가 Dockerfile 기반 이미지 빌드)
- 시크릿: 기존 Cloud Run env vars 보존 (`--set-env-vars` 안 줌)

워크플로: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) 의 `ci-backend` job

### 수동

```powershell
powershell -File ../scripts/deploy-backend.ps1
```

스크립트가 `backend/.env`에서 시크릿을 읽어 `gcloud run deploy --source backend --set-env-vars=...` 호출. 첫 배포는 ~5분 (Cloud Build 빌드 시간).

### 시크릿 갱신 (단발)

```powershell
gcloud run services update cleanballtrio-api --region asia-northeast3 `
  --update-env-vars="^@^CORS_ORIGIN=val1,val2,val3"
```

> 콤마가 포함된 값은 `^@^` 커스텀 구분자 필수.

## 컨테이너

`Dockerfile`은 multi-stage:
1. `deps`: prod 의존성만 npm ci
2. `build`: 전체 의존성 + `nest build`
3. `runtime`: `node:22-alpine` + `USER node`, EXPOSE 8080

`.dockerignore`로 `node_modules`, `dist`, `.env`, 테스트 파일 제외.

## 인증 흐름

1. 프론트가 카카오 OAuth로 `code` 받음 → `POST /auth/kakao { code, redirectUri }`
2. 백엔드가 `https://kauth.kakao.com/oauth/token`에 코드 교환 → access token
3. `https://kapi.kakao.com/v2/user/me`로 카카오 ID 조회
4. JWT 발급 후 프론트로 반환

상세: [`src/auth/`](src/auth/), 관련 plan: [`docs/plans/active/feat-kakao-login.md`](../docs/plans/active/feat-kakao-login.md)

## 디렉토리

```
backend/
├── src/
│   ├── main.ts          ─ bootstrap, CORS_ORIGIN 처리
│   ├── auth/            ─ Kakao OAuth + JWT 발급
│   └── ...
├── test/                ─ E2E 테스트
├── Dockerfile           ─ multi-stage, node:22-alpine
└── .dockerignore
```
