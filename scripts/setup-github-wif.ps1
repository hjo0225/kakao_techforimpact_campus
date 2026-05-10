#!/usr/bin/env pwsh
# GitHub Actions Workload Identity Federation 1회 셋업
# 사용법: pwsh scripts/setup-github-wif.ps1
#
# 이 스크립트가 만드는 것:
#   1. Workload Identity Pool: github-actions-pool
#   2. OIDC Provider: github-actions-provider (GitHub Actions용)
#   3. Service Account: github-actions-deployer
#   4. SA에 필요한 Role 6개 부여
#   5. SA를 GitHub repo의 main 브랜치에서만 가장 가능하도록 바인딩
#
# 출력: GitHub Secrets에 등록할 값 3개

$ErrorActionPreference = 'Stop'

# === 설정값 (필요시 수정) ===
$PROJECT_ID    = 'cleanballtrio'
$PROJECT_NUM   = '1076044788885'
$POOL_ID       = 'github-actions-pool'
$PROVIDER_ID   = 'github-actions-provider'
$SA_NAME       = 'github-actions-deployer'
$SA_EMAIL      = "$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"
$GH_REPO       = 'hjo0225/kakao_techforimpact_campus'
$GH_BRANCH_REF = 'refs/heads/main'

Write-Host '==> Project: ' -NoNewline; Write-Host $PROJECT_ID -ForegroundColor Cyan
Write-Host '==> GitHub:  ' -NoNewline; Write-Host $GH_REPO -ForegroundColor Cyan
Write-Host ''

# === 1. Workload Identity Pool ===
Write-Host '[1/5] Workload Identity Pool 생성...' -ForegroundColor Yellow
$poolExists = (gcloud iam workload-identity-pools list --location=global --project=$PROJECT_ID --filter="name~$POOL_ID$" --format='value(name)' 2>$null)
if ($poolExists) {
    Write-Host "  이미 존재: $poolExists" -ForegroundColor Gray
} else {
    gcloud iam workload-identity-pools create $POOL_ID `
        --project=$PROJECT_ID `
        --location=global `
        --display-name='GitHub Actions Pool'
}

# === 2. OIDC Provider ===
Write-Host '[2/5] OIDC Provider 생성 (GitHub Actions)...' -ForegroundColor Yellow
$providerExists = (gcloud iam workload-identity-pools providers list --workload-identity-pool=$POOL_ID --location=global --project=$PROJECT_ID --filter="name~$PROVIDER_ID$" --format='value(name)' 2>$null)
if ($providerExists) {
    Write-Host "  이미 존재: $providerExists" -ForegroundColor Gray
} else {
    gcloud iam workload-identity-pools providers create-oidc $PROVIDER_ID `
        --project=$PROJECT_ID `
        --location=global `
        --workload-identity-pool=$POOL_ID `
        --display-name='GitHub Actions Provider' `
        --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref' `
        --attribute-condition="assertion.repository=='$GH_REPO'" `
        --issuer-uri='https://token.actions.githubusercontent.com'
}

# === 3. Service Account ===
Write-Host '[3/5] Service Account 생성...' -ForegroundColor Yellow
$saExists = (gcloud iam service-accounts list --project=$PROJECT_ID --filter="email:$SA_EMAIL" --format='value(email)' 2>$null)
if ($saExists) {
    Write-Host "  이미 존재: $saExists" -ForegroundColor Gray
} else {
    gcloud iam service-accounts create $SA_NAME `
        --project=$PROJECT_ID `
        --display-name='GitHub Actions Deployer'
}

# === 4. SA에 Role 부여 ===
Write-Host '[4/5] Role 부여 (6개)...' -ForegroundColor Yellow
$roles = @(
    'roles/run.admin',
    'roles/iam.serviceAccountUser',
    'roles/cloudbuild.builds.editor',
    'roles/artifactregistry.writer',
    'roles/firebasehosting.admin',
    'roles/storage.admin'
)
foreach ($role in $roles) {
    Write-Host "  - $role"
    gcloud projects add-iam-policy-binding $PROJECT_ID `
        --member="serviceAccount:$SA_EMAIL" `
        --role=$role `
        --condition=None `
        --quiet | Out-Null
}

# === 5. WIF 바인딩 (main 브랜치만 SA 가장 가능) ===
Write-Host '[5/5] WIF principal binding (repo=' -NoNewline; Write-Host $GH_REPO -ForegroundColor Cyan -NoNewline; Write-Host ' main only)...' -ForegroundColor Yellow
$principal = "principalSet://iam.googleapis.com/projects/$PROJECT_NUM/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/$GH_REPO"
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL `
    --project=$PROJECT_ID `
    --role='roles/iam.workloadIdentityUser' `
    --member=$principal `
    --quiet | Out-Null

# === 출력 ===
$providerResource = "projects/$PROJECT_NUM/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"

Write-Host ''
Write-Host '==============================================' -ForegroundColor Green
Write-Host '셋업 완료. 아래 값들을 GitHub Secrets에 등록하세요:' -ForegroundColor Green
Write-Host '==============================================' -ForegroundColor Green
Write-Host ''
Write-Host 'GitHub repo Settings → Secrets and variables → Actions → New repository secret'
Write-Host ''
Write-Host 'Secret 1:' -ForegroundColor Cyan
Write-Host '  Name:  GCP_WIF_PROVIDER'
Write-Host "  Value: $providerResource"
Write-Host ''
Write-Host 'Secret 2:' -ForegroundColor Cyan
Write-Host '  Name:  GCP_SA_EMAIL'
Write-Host "  Value: $SA_EMAIL"
Write-Host ''
Write-Host 'Secret 3:' -ForegroundColor Cyan
Write-Host '  Name:  VITE_KAKAO_REST_API_KEY'
Write-Host '  Value: (frontend/.env.production의 VITE_KAKAO_REST_API_KEY 값 복사)'
Write-Host ''
