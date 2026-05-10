# CleanBallTrio (카카오_환경많이된다)

[![Deploy](https://github.com/hjo0225/kakao_techforimpact_campus/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/hjo0225/kakao_techforimpact_campus/actions/workflows/deploy.yml)

> **야구장 일회용기 쓰레기 문제를, 응원 팀 경쟁으로 푼다.**

---

## 1. Problem — 왜 이 프로젝트인가

KBO 한 시즌 약 800만 명이 직관하고, 경기당 수만 개의 일회용 컵·용기가 발생한다. 구장 다회용기 시범 운영은 이미 존재하지만, 실제 회수율은 낮다.

관찰된 원인:

- **반납 동기 부재** — 다회용기를 받아도 반납할 이유가 약하다. "그냥 버리는 게 더 빠르다."
- **인증 수단 부재** — 사용자가 "내가 환경에 기여했다"는 사실을 데이터로 확인할 방법이 없다.
- **개인 행동 → 가시적 임팩트로 연결되지 않음** — 한 사람의 다회용기 한 개는 통계 속에서 사라진다.

기존 환경 앱들은 보상(포인트/현금)에 의존하는데, 야구 직관러에게는 **응원 팀 정체성**이 더 강한 동기일 수 있다. 이 가설을 검증한다.

---

## 2. Solution — 어떻게 푸는가

**핵심 아이디어**: 다회용기 반납을 *팀 응원 행위*로 재정의한다.

```
[다회용기 반납] → [QR 스캔] → [내 점수 + 응원 팀 누적 점수]
                                        ↓
                              [팀별 실시간 랭킹]
                                        ↓
                              [반납할 다음 이유]
```

### 게임 루프

| 단계 | 사용자 행동 | 시스템 반응 |
|---|---|---|
| 1 | 카카오 로그인 + 응원 팀 1개 선택 | JWT 발급, 팀 소속 확정 |
| 2 | 구장에서 다회용기 받아 사용 후 반납 | — |
| 3 | 반납 시 QR 스캔 | payload 검증 → 사용 기록 저장 |
| 4 | 점수 적립 + 팀 누적 점수 갱신 | Redis sorted set 실시간 반영 |
| 5 | 랭킹·등급·절감량 확인, 공유 이미지 생성 | 다음 경기 반납 동기 형성 |

### 기존 접근 대비 베팅

- **현금성 보상 대신 팀 경쟁** — 외재적 동기보다 내재적(소속감) 동기가 지속된다는 가설
- **단일 행동(QR 1회) 설계** — 멤버십 가입·앱 전환 등 마찰 최소화
- **WebView 우선** — 네이티브 앱 다운로드 장벽을 우회. 카카오톡 공유 → 즉시 사용

---

## 3. 현재 구현 상태

| 기능 | 상태 | 비고 |
|---|---|---|
| F1. 카카오 로그인 + JWT | 구현됨 | refresh 흐름은 미구현 |
| F2. 팀 선택 + 아바타 | UI만 | 백엔드 연결 미구현 |
| F3. QR 스캔 인증 | 미구현 | DB 스키마 + `POST /qr/scan` 필요 |
| F4. 팀별 실시간 랭킹 | 미구현 | Redis 도입 예정 |
| F5. 통계 / 등급 / 공유 이미지 | UI 일부 | F3 데이터 누적 후 |
| F6. 다회용기 매장 지도 | UI만 | 데이터 소스 협의 중 |

상세: [`docs/PRD.md`](docs/PRD.md) · 진행 중 plan: [`docs/plans/active/`](docs/plans/active/)

### Open Questions (검증 필요)

- 다회용기 QR payload 포맷 (구장 운영사 협의)
- 점수 산정 알고리즘 (개당 vs 누적 보너스)
- 시즌 리셋 정책
- 팀 랭킹 1·2위 격차가 너무 벌어졌을 때 동기 유지 방법

---

## 4. Live

| | URL |
|---|---|
| 앱 (Firebase Hosting) | https://cleanballtrio.web.app |
| API (Cloud Run, asia-northeast3) | https://cleanballtrio-api-fpvvjohnta-du.a.run.app |
| Firebase Console | https://console.firebase.google.com/project/cleanballtrio |

---

## 5. 아키텍처 한눈에

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Mobile (Expo)   │    │ Web (Vite+React) │    │ 카카오 OAuth     │
│ react-native-   │───▶│ Firebase Hosting │───▶│                  │
│ webview         │    └────────┬─────────┘    └─────────────────┘
└─────────────────┘             │
                                ▼
                    ┌──────────────────────┐
                    │ NestJS API           │
                    │ Cloud Run (asia-ne3) │
                    └──────┬───────┬───────┘
                           │       │
                ┌──────────▼─┐  ┌──▼──────────┐
                │ Cloud SQL  │  │ Memorystore │
                │ Postgres   │  │ Redis       │
                │ (사용 기록) │  │ (팀 랭킹)    │
                └────────────┘  └─────────────┘
```

선택 근거: [`docs/adr/0001-firebase-hosting-and-cloud-run.md`](docs/adr/0001-firebase-hosting-and-cloud-run.md) · 상세: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

### 디렉토리

```
.
├── frontend/        Vite + React + TS (→ Firebase Hosting)
├── backend/         NestJS + TS         (→ Cloud Run)
├── docs/            PRD, ARCHITECTURE, plans, ADR
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
cp .env.example .env       # KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET, JWT_SECRET
npm run start:dev          # http://localhost:3001

# Frontend
cd frontend
npm install
cp .env.example .env       # VITE_KAKAO_REST_API_KEY 등
npm run dev                # http://localhost:5173
```

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
