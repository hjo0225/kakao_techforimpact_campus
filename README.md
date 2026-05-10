# CleanBallTrio (카카오_환경많이된다)

야구장 다회용기 사용을 게이미피케이션하는 모바일/웹 서비스. 카카오 로그인, QR 인증, 팀별 실시간 랭킹.

[![Deploy](https://github.com/hjo0225/kakao_techforimpact_campus/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/hjo0225/kakao_techforimpact_campus/actions/workflows/deploy.yml)

## Live

| | URL |
|---|---|
| 앱 (Firebase Hosting) | https://cleanballtrio.web.app |
| API (GCP Cloud Run, asia-northeast3) | https://cleanballtrio-api-fpvvjohnta-du.a.run.app |
| Firebase Console | https://console.firebase.google.com/project/cleanballtrio |

## 디렉토리 구조

```
.
├── frontend/        Vite + React + TS (→ Firebase Hosting)
├── backend/         NestJS + TS         (→ Cloud Run)
├── docs/            PRD, ARCHITECTURE, plans
│   ├── plans/active/      진행 중 작업 plan
│   ├── plans/completed/   완료 plan 보관
│   └── adr/               설계 결정 기록
├── scripts/         배포 / 셋업 스크립트
└── .github/workflows/     CI/CD (GitHub Actions)
```

## 기술 스택

**Frontend** — React 19, Vite 8, TypeScript, Tailwind v4, React Router v6, React Query, Zustand, html5-qrcode, Kakao Maps JS API, Recharts, html2canvas

**Backend** — NestJS, TypeScript, PostgreSQL (Cloud SQL, 도입 예정), Redis (Memorystore, 도입 예정), Kakao OAuth + JWT

**Mobile (예정)** — Expo, react-native-webview, @react-native-seoul/kakao-login, expo-barcode-scanner

**Infra** — Firebase Hosting, GCP Cloud Run, Cloud Build, Artifact Registry, Workload Identity Federation

## 개발 시작

### 사전 요구
- Node.js 22+
- pwsh 또는 PowerShell 5.1 (Windows 셋업 스크립트용)
- gcloud CLI (배포 시)
- Firebase CLI (`npm i -g firebase-tools`)

### 설치 / 실행

```bash
# Backend
cd backend
npm install
cp .env.example .env       # KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET, JWT_SECRET 채우기
npm run start:dev          # http://localhost:3001

# Frontend
cd frontend
npm install
cp .env.example .env       # VITE_KAKAO_REST_API_KEY 등 채우기
npm run dev                # http://localhost:5173
```

## 배포

### 자동 (권장)
`main` 브랜치에 push하면 GitHub Actions가 변경된 영역만 자동 배포:
- `frontend/**` 변경 → Firebase Hosting 재배포
- `backend/**` 변경 → Cloud Run 재배포

PR 단계에선 build/typecheck만 실행.

### 수동
```powershell
# Backend → Cloud Run
powershell -File scripts/deploy-backend.ps1

# Frontend → Firebase
cd frontend; npm run build; cd ..
firebase deploy --only hosting
```

## CI/CD

- **인증**: Workload Identity Federation (long-lived 키 없음)
- **트리거**: `push` to `main` (auto deploy) + `pull_request` (build/typecheck only)
- **변경 감지**: `dorny/paths-filter@v3`로 frontend/backend 분리 배포
- **1회 셋업**: `powershell -File scripts/setup-github-wif.ps1` 후 GitHub Secrets 3개 등록

상세: [`docs/plans/active/setup-github-cicd.md`](docs/plans/active/setup-github-cicd.md)

## 문서

- [`CLAUDE.md`](CLAUDE.md) — AI 에이전트 작업 컨벤션 (워크플로 6단계, 디자인 룰)
- [`DESIGN.md`](DESIGN.md) — 디자인 토큰 SSOT (UI 작업 시 필독)
- [`docs/PRD.md`](docs/PRD.md) — 제품 요구사항 (현재 구현 상태 + open questions)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 모듈 경계, 외부 의존성, 데이터 흐름
- [`docs/api-spec.md`](docs/api-spec.md) — API 엔드포인트 스키마
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — DB 스키마 (예정 entities)
- [`docs/plans/`](docs/plans/) — 진행 중/완료된 작업 단위 plan
- [`docs/adr/`](docs/adr/) — 설계 결정 기록 ([0001](docs/adr/0001-firebase-hosting-and-cloud-run.md): Firebase + Cloud Run)

## 워크플로 규칙 (요약)

1. **Plan 먼저** — `docs/plans/active/<slug>.md` 없으면 코드 수정 금지
2. **브랜치 prefix** — `feat/`, `fix/`, `chore/`, `refactor/`, `hotfix/`
3. **DESIGN.md 먼저** — 토큰에 없는 색/폰트/간격 도입 시
4. **명세 우선** — `docs/`와 코드 어긋나면 docs부터 갱신
5. **`--no-verify` 금지**, **master 직접 커밋 금지**

전체 규칙은 [`CLAUDE.md`](CLAUDE.md) 참조.
