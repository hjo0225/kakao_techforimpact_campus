#!/usr/bin/env pwsh
# GitHub Actions Workload Identity Federation 1회 셋업
# 사용법: powershell -File scripts/setup-github-wif.ps1
#
# 멱등(idempotent): 이미 존재하는 리소스는 스킵.

# === 설정값 ===
$PROJECT_ID    = 'cleanballtrio'
$PROJECT_NUM   = '1076044788885'
$POOL_ID       = 'github-actions-pool'
$PROVIDER_ID   = 'github-actions-provider'
$SA_NAME       = 'github-actions-deployer'
$SA_EMAIL      = "$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"
$GH_REPO       = 'hjo0225/kakao_techforimpact_campus'

function Test-GcloudResource {
    param([scriptblock]$DescribeCmd)
    & $DescribeCmd 2>&1 | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Invoke-GcloudOrDie {
    param([string]$StepName, [scriptblock]$Cmd)
    & $Cmd 2>&1 | ForEach-Object { Write-Host "    $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] $StepName 실패 (exit=$LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
}

Write-Host '==> Project: ' -NoNewline; Write-Host $PROJECT_ID -ForegroundColor Cyan
Write-Host '==> GitHub:  ' -NoNewline; Write-Host $GH_REPO -ForegroundColor Cyan
Write-Host ''

# === 1. Workload Identity Pool ===
Write-Host '[1/5] Workload Identity Pool...' -ForegroundColor Yellow
if (Test-GcloudResource { gcloud iam workload-identity-pools describe $POOL_ID --location=global --project=$PROJECT_ID }) {
    Write-Host '  이미 존재' -ForegroundColor Gray
} else {
    Invoke-GcloudOrDie 'pool 생성' {
        gcloud iam workload-identity-pools create $POOL_ID --project=$PROJECT_ID --location=global --display-name='GitHub Actions Pool'
    }
}

# === 2. OIDC Provider ===
Write-Host '[2/5] OIDC Provider...' -ForegroundColor Yellow
if (Test-GcloudResource { gcloud iam workload-identity-pools providers describe $PROVIDER_ID --workload-identity-pool=$POOL_ID --location=global --project=$PROJECT_ID }) {
    Write-Host '  이미 존재' -ForegroundColor Gray
} else {
    Invoke-GcloudOrDie 'provider 생성' {
        gcloud iam workload-identity-pools providers create-oidc $PROVIDER_ID `
            --project=$PROJECT_ID `
            --location=global `
            --workload-identity-pool=$POOL_ID `
            --display-name='GitHub Actions Provider' `
            --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref' `
            --attribute-condition="assertion.repository=='$GH_REPO'" `
            --issuer-uri='https://token.actions.githubusercontent.com'
    }
}

# === 3. Service Account ===
Write-Host '[3/5] Service Account...' -ForegroundColor Yellow
if (Test-GcloudResource { gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID }) {
    Write-Host '  이미 존재' -ForegroundColor Gray
} else {
    Invoke-GcloudOrDie 'SA 생성' {
        gcloud iam service-accounts create $SA_NAME --project=$PROJECT_ID --display-name='GitHub Actions Deployer'
    }
}

# === 4. SA Roles ===
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
    & gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA_EMAIL" --role=$role --condition=None --quiet 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] $role 부여 실패 (exit=$LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
}

# === 5. WIF principal binding ===
Write-Host '[5/5] WIF principal binding...' -ForegroundColor Yellow
$principal = "principalSet://iam.googleapis.com/projects/$PROJECT_NUM/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/$GH_REPO"
& gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL --project=$PROJECT_ID --role='roles/iam.workloadIdentityUser' --member=$principal --quiet 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] principal binding 실패 (exit=$LASTEXITCODE)" -ForegroundColor Red
    exit 1
}

# === 출력 ===
$providerResource = "projects/$PROJECT_NUM/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"

Write-Host ''
Write-Host '==============================================' -ForegroundColor Green
Write-Host '셋업 완료. 아래 값들을 GitHub Secrets에 등록하세요:' -ForegroundColor Green
Write-Host '==============================================' -ForegroundColor Green
Write-Host ''
Write-Host 'https://github.com/' -NoNewline; Write-Host $GH_REPO -NoNewline -ForegroundColor Cyan; Write-Host '/settings/secrets/actions'
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
