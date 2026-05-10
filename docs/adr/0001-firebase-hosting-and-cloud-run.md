# ADR-0001: Firebase Hosting + GCP Cloud Run

- **Status**: Accepted (2026-05-10)
- **Deciders**: HJO

## Context

배포 방식 결정 시점:
- 단일 GCP 프로젝트 안에서 frontend/backend를 운영하고 싶음
- 학생 프로젝트라 무료 티어 우선
- DevOps 경험 적음 → 셋업 단순한 쪽 선호
- 추후 WebView 래핑 예정 (모바일) — 같은 웹 자산 재사용

## Considered Options

### A) Firebase Hosting (frontend) + Cloud Run (backend) ← 선택
- 같은 GCP 프로젝트에 묶임 (`firebase projects:addfirebase` 한 번)
- Firebase Hosting: CDN 자동 포함, Spark 플랜 무료 (월 10GB egress)
- Cloud Run: pay-per-request, 콜드 스타트 ~2s, 월 200만 요청 무료
- WIF로 GitHub Actions에서 둘 다 배포 가능

### B) Cloud Storage + CDN (frontend) + Cloud Run (backend)
- Firebase 의존성 없음 (순수 GCP)
- 단점: SPA rewrite / 배포 자동화가 더 번잡 (Firebase CLI 안 쓰고 gsutil/CDN 룰 수동)

### C) Vercel (frontend) + Cloud Run (backend)
- Vercel DX 최고
- 단점: GCP 프로젝트 분리 → 도메인/콘솔 흩어짐, 운영 복잡도 ↑

### D) 모놀리식 Cloud Run 배포
- frontend도 NestJS가 정적 파일 서빙
- 단점: CDN 손해, frontend 변경 시도 backend 재배포

## Decision

A안 선택. **이유**:
1. Firebase Hosting이 SPA + CDN 셋업이 가장 간단 (`firebase init hosting`, `firebase.json`만)
2. GCP 프로젝트 1개로 통합 관리 (콘솔/billing/IAM)
3. WIF 한 번 셋업하면 두 서비스 모두 GitHub Actions에서 배포 가능
4. 무료 티어 한도가 학생 프로젝트엔 충분 (월 트래픽 10GB 미만 예상)

## Consequences

**긍정**:
- 1회 셋업 후 추가 인프라 없이 prod 운영 가능
- frontend/backend 분리 배포로 독립 변경 가능

**부정**:
- Cloud Run 콜드 스타트 (~2s) — 사용자 첫 진입에 체감. min-instances=1로 회피 가능하나 비용 발생
- Spark 플랜 한도 초과 시 Blaze 플랜 마이그레이션 필요 (월 10GB egress)
- Firebase 자체 의존성 추가 — 추후 다른 클라우드 이전 시 마이그레이션 비용

**중립**:
- 시크릿은 Cloud Run env vars 평문 (1차) → 추후 Secret Manager 이전 (별도 plan에서 다룸)

## Related

- 배포 plan: `docs/plans/active/deploy-backend-cloud-run.md`, `docs/plans/active/deploy-frontend-firebase.md`
- CI/CD plan: `docs/plans/active/setup-github-cicd.md`
