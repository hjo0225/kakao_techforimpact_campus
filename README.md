# 용기낼깡 (카카오\_환경많이된다)

[![Deploy](https://github.com/hjo0225/kakao_techforimpact_campus/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/hjo0225/kakao_techforimpact_campus/actions/workflows/deploy.yml)

> **야구장 일회용기 쓰레기 문제를, 응원 팀 경쟁으로 푼다.**

## 1. Problem — 왜 이 프로젝트인가

KBO 한 시즌 약 800만 명이 직관하고, 경기당 수만 개의 일회용 컵·용기가 발생한다. 구장 다회용기 시범 운영은 이미 존재하지만, 실제 회수율은 낮다.

관찰된 원인:

- **반납 동기 부재** — 다회용기를 받아도 반납할 이유가 약하다. "그냥 버리는 게 더 빠르다."
- **인증 수단 부재** — 사용자가 "내가 환경에 기여했다"는 사실을 데이터로 확인할 방법이 없다.
- **개인 행동 → 가시적 임팩트로 연결되지 않음** — 한 사람의 다회용기 한 개는 통계 속에서 사라진다.

기존 환경 앱들은 보상(포인트/현금)에 의존하는데, 야구 직관러에게는 **응원 팀 정체성**이 더 강한 동기일 수 있다. 이 가설을 검증한다.

## 2. Solution — 어떻게 푸는가

**핵심 아이디어**: 다회용기 사용/반납을 *팀 응원 행위*로 재정의한다.

```
[다회용기 사용 사진] → [Vision AI 분류] → [내 점수 + 응원 팀 누적 점수]
[반납 사진]                                       ↓
                                       [팀별 누적 랭킹]
                                                  ↓
                                       [다음 경기 인증 동기]
```

### 게임 루프

| 단계 | 사용자 행동                                   | 시스템 반응                                  |
| ---- | --------------------------------------------- | -------------------------------------------- |
| 1    | 카카오 로그인 + 응원 팀 1개 선택              | JWT 발급, 팀 소속 확정 (`PATCH /me/team`)    |
| 2    | 구장에서 다회용기 받아 사용 후 사진 촬영      | Vision AI 분류 → USE 50점 (`/verify/use`)    |
| 3    | 반납하면서 사진 촬영                          | Vision AI 분류 + USE 12h 가드 → RETURN 100점 |
| 4    | 점수 적립 + 팀 누적 점수 갱신                 | PostgreSQL aggregate (Redis ZSET 예정)       |
| 5    | 랭킹·감축 기여·공유 이미지 확인               | 다음 경기 인증 동기 형성                     |

### 기존 접근 대비 베팅

- **현금성 보상 대신 팀 경쟁** — 외재적 동기보다 내재적(소속감) 동기가 지속된다는 가설
- **QR 대신 AI 이미지 분류** — 운영사 QR 포맷 협의 의존성 제거, 사용자는 사진 1장만 찍으면 됨 (MobileNetV2 자체 모델)
- **WebView 우선** — 네이티브 앱 다운로드 장벽을 우회. 카카오톡 공유 → 즉시 사용

---

## 3. 현재 구현 상태

| 기능                                  | 상태    | 비고                                                   |
| ------------------------------------- | ------- | ------------------------------------------------------ |
| F1. 카카오 로그인 + JWT               | 구현됨  | refresh 흐름은 미구현                                  |
| F2. 팀 선택 (온보딩)                  | 구현됨  | 아바타는 폐기, 팀-only 온보딩                          |
| F3. Vision AI 사용·반납 인증          | 구현됨  | MobileNetV2 + `/verify/use`·`/verify/return`           |
| F4. 팀별 누적 랭킹                    | 구현됨  | PG aggregate. 트래픽 증가 시 Redis ZSET                |
| F5. 통계 / 공유 이미지                | 구현됨  | `/stats/me` + Canvas 2D 공유 카드. 등급은 폐기         |
| F6. 다회용기 매장 + 메뉴 지도         | 구현됨  | 반납함 정보 제거, 매장·메뉴 중심으로 재설계            |
| F7. 디자인 시스템 (Vintage + Pixel)   | 구현됨  | cream/burgundy/rose + Galmuri 픽셀 폰트 + NES 컴포넌트 |

상세: [`docs/PRD.md`](docs/PRD.md) · 진행 중 plan: [`docs/plans/active/`](docs/plans/active/)

### Open Questions (검증 필요)

- Vision 모델 오판 시 사용자 피드백 채널 (현재는 단순 에러)
- 점수 산정 알고리즘 재검토 (USE 50 / RETURN 100 고정이 적절한가)
- 시즌 리셋 정책 (영구 누적 vs 시즌별)
- 팀 랭킹 1·2위 격차가 너무 벌어졌을 때 동기 유지 방법
- 매장/메뉴 데이터 운영사 협의 (현재 mock)

---

## 4. Live

|                                  | URL                                                       |
| -------------------------------- | --------------------------------------------------------- |
| 앱 (Firebase Hosting)            | https://cleanballtrio.web.app                             |
| API (Cloud Run, asia-northeast3) | https://cleanballtrio-api-fpvvjohnta-du.a.run.app         |
| Firebase Console                 | https://console.firebase.google.com/project/cleanballtrio |

---

## 5. 아키텍처 한눈에

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Mobile (Expo)   │    │ Web (Vite+React) │    │ 카카오 OAuth     │
│ react-native-   │───▶│ Firebase Hosting │───▶│                  │
│ webview         │    └────────┬─────────┘    └─────────────────┘
└─────────────────┘             │
                                ▼
                    ┌──────────────────────┐    multipart   ┌────────────────────┐
                    │ NestJS API           │ ─────────────▶ │ Vision (FastAPI)   │
                    │ Cloud Run (asia-ne3) │                │ Cloud Run          │
                    │ cleanballtrio-api    │                │ MobileNetV2 (2cls) │
                    └──────┬───────────────┘                └────────────────────┘
                           │
                ┌──────────▼─┐
                │ Cloud SQL  │   (users, teams, games, usages)
                │ Postgres   │
                └────────────┘
                           ↑
                 (Redis Memorystore — 트래픽 증가 시 도입 예정)
```

선택 근거: [`docs/adr/0001-firebase-hosting-and-cloud-run.md`](docs/adr/0001-firebase-hosting-and-cloud-run.md) · 상세: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

### 디렉토리

```
.
├── frontend/        Vite + React + TS  (→ Firebase Hosting)
├── backend/         NestJS + TS         (→ Cloud Run, cleanballtrio-api)
├── vision/          FastAPI + PyTorch   (→ Cloud Run, cleanballtrio-vision)
├── docs/            PRD, ARCHITECTURE, plans, ADR, runbooks
├── scripts/         배포 / 셋업 스크립트
└── .github/workflows/  CI/CD (GitHub Actions)
```

---

## 6. 개발 시작

**사전 요구**: Node.js 22+, pwsh 또는 PowerShell 5.1, gcloud CLI(배포 시), `npm i -g firebase-tools`

```bash
# Backend
cd backend
npm install
cp .env.example .env       # KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET, JWT_SECRET, DATABASE_URL, VISION_API_URL
npm run start:dev          # http://localhost:3002 (PORT=3002 in .env)

# Frontend
cd frontend
npm install
cp .env.example .env       # VITE_KAKAO_REST_API_KEY, VITE_KAKAO_REDIRECT_URI, VITE_API_BASE_URL
npm run dev                # http://localhost:5173 ⚠️ 포트 고정 — 카카오 redirect_uri / CORS와 일치해야 함

# Vision (선택 — 이미지 인증 기능 테스트 시)
cd vision
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --port 8000   # http://localhost:8000
```

> **포트 주의**: 프론트는 반드시 `5173`. 5173이 점유돼서 Vite가 5174/5175로 떨어지면 카카오 OAuth 콜백을 못 받고 CORS도 거부됨.

---

## 7. 배포

`main` push → GitHub Actions가 변경 영역만 자동 배포 (`frontend/**` → Firebase, `backend/**` → Cloud Run). PR 단계에서는 build/typecheck만 실행.

수동 배포가 필요하면:

```powershell
powershell -File scripts/deploy-backend.ps1     # Backend → Cloud Run
cd frontend; npm run build; cd ..               # Frontend → Firebase
firebase deploy --only hosting
```

CI/CD는 Workload Identity Federation(long-lived 키 없음) 기반. 1회 셋업: `powershell -File scripts/setup-github-wif.ps1` 후 GitHub Secrets 3개 등록. 상세: [`docs/plans/active/setup-github-cicd.md`](docs/plans/active/setup-github-cicd.md)

---

## 8. 문서 / 컨벤션

- [`CLAUDE.md`](CLAUDE.md) — AI 에이전트 작업 컨벤션 (워크플로 6단계)
- [`DESIGN.md`](DESIGN.md) — 디자인 토큰 SSOT (UI 작업 시 필독)
- [`docs/PRD.md`](docs/PRD.md) — 제품 요구사항
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 모듈 경계, 데이터 흐름
- [`docs/api-spec.md`](docs/api-spec.md) — API 스키마
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — DB 스키마
- [`docs/adr/`](docs/adr/) — 설계 결정 기록

**작업 룰 (요약)** — Plan 먼저(`docs/plans/active/<slug>.md`), 브랜치 prefix(`feat/fix/chore/refactor/hotfix`), DESIGN.md 토큰만 사용, `docs`와 코드 어긋나면 docs 먼저, `--no-verify`·master 직접 커밋 금지.
