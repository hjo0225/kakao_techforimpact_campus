# Plan: GitHub Actions CI/CD (Workload Identity Federation)

## 목표
main 브랜치 push 시 변경된 영역(frontend/backend)만 자동 배포되는 CI/CD 파이프라인 구축. 인증은 long-lived key 없는 Workload Identity Federation(WIF) 방식.

## 결정 사항 (확정)
- **인증**: Workload Identity Federation (Google 권장, 키 유출 위험 0)
- **트리거**: `push` to `main` (자동 배포) + `pull_request` to `main` (빌드/타입체크만)
- **변경 감지**: `dorny/paths-filter` action으로 frontend/backend 분리 배포
- **백엔드 시크릿**: Cloud Run 기존 env vars 유지 (`gcloud run deploy`에 `--set-env-vars` 안 줌 → preserve)
- **프론트엔드 시크릿**: GitHub Secrets에 `VITE_KAKAO_REST_API_KEY`만 (빌드 시 번들에 박힘. 다른 URL은 평문)
- **GitHub repo**: `https://github.com/hjo0225/kakao_techforimpact_campus.git`

---

## 📍 작업 흐름 (3단계)

### Phase 1: GCP WIF 셋업 (1회, 사용자 직접 실행)

스크립트로 자동화: `scripts/setup-github-wif.ps1`

생성/설정 항목:
- **Workload Identity Pool**: `github-actions-pool`
- **OIDC Provider** (GitHub용): `github-actions-provider`, issuer=`https://token.actions.githubusercontent.com`
- **서비스 계정**: `github-actions-deployer@cleanballtrio.iam.gserviceaccount.com`
- **SA Roles**:
  - `roles/run.admin` — Cloud Run 배포
  - `roles/iam.serviceAccountUser` — Cloud Run runtime SA impersonation
  - `roles/cloudbuild.builds.editor` — Cloud Build 트리거
  - `roles/artifactregistry.writer` — 이미지 push
  - `roles/firebasehosting.admin` — Firebase 배포
  - `roles/storage.admin` — Firebase Hosting upload
- **WIF 바인딩**: `hjo0225/kakao_techforimpact_campus` 레포의 `main` 브랜치만 SA 가장 가능

스크립트 실행 후 출력될 값을 GitHub Secrets에 등록:
- `GCP_WIF_PROVIDER` = `projects/1076044788885/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider`
- `GCP_SA_EMAIL` = `github-actions-deployer@cleanballtrio.iam.gserviceaccount.com`
- `VITE_KAKAO_REST_API_KEY` = (frontend/.env.production에서 복사)

### Phase 2: GitHub Actions Workflow 작성

파일: `.github/workflows/deploy.yml`

구조:
```
detect-changes  ─┬─→ ci-frontend (typecheck + build)
                 │      └→ deploy-frontend (main push & frontend changed)
                 │
                 └─→ ci-backend (typecheck + build)
                        └→ deploy-backend (main push & backend changed)
```

권한: `id-token: write` + `contents: read` (WIF용)

### Phase 3: 검증

1. PR 생성 → CI만 돌고 deploy 잡은 skip 확인
2. main 머지 → 변경된 쪽만 배포 트리거 확인
3. 일부러 frontend/, backend/ 동시 변경 → 둘 다 배포되는지

---

## 범위 외 (별도 plan)

- E2E 테스트 (Playwright 등) — 별도 plan
- Database migration 자동화 (Cloud SQL 도입 시)
- 환경별 분리 (staging/prod) — 현재는 main = prod
- Secret rotation 자동화
- Slack/Discord 배포 알림
- Rollback 자동화 (revision 가중치 트래픽 분할)

## 위험

- **WIF 셋업 복잡도**: 처음엔 IAM 개념 헷갈림. 스크립트로 자동화하지만 디버깅 시 `gcloud iam workload-identity-pools describe ...` 등 익혀야 함
- **SA 과도한 권한**: `roles/storage.admin`은 광범위. 추후 `roles/firebasehosting.admin`만 남기고 좁히는 게 좋음 (Firebase가 내부적으로 어떤 storage 동작하는지 확인 후)
- **Cloud Run env vars 보존**: `gcloud run deploy --source` 에서 `--set-env-vars` 빼면 기존 유지 — but `--clear-env-vars` 같은 옵션 실수로 넣으면 다 날아감. workflow에서 명시적으로 빼지 않도록 주의
- **Branch protection**: WIF는 `main` 브랜치만 신뢰하도록 attribute condition으로 제한. 누가 main에 force push하면 그 자체가 배포 = 보호 룰 필요 (별도 작업)
- **Cold start 누적**: backend가 자주 재배포되면 매번 콜드 스타트. min-instances=1 옵션 고려 (단 비용 발생)
