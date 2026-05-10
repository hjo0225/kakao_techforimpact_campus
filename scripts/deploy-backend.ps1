#!/usr/bin/env pwsh
# Cloud Run 배포 스크립트 (수동 실행용)
# 사용법: pwsh scripts/deploy-backend.ps1

$ErrorActionPreference = 'Stop'

$envPath = Join-Path (Split-Path $PSScriptRoot -Parent) 'backend\.env'
if (-not (Test-Path $envPath)) {
    Write-Error "backend/.env 파일이 없습니다: $envPath"
    exit 1
}

$envVars = @{}
Get-Content $envPath | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=(.*)$') {
        $envVars[$Matches[1]] = $Matches[2]
    }
}

foreach ($key in @('KAKAO_REST_API_KEY', 'KAKAO_CLIENT_SECRET', 'JWT_SECRET')) {
    if (-not $envVars.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($envVars[$key])) {
        Write-Error "필수 env 변수 누락: $key"
        exit 1
    }
}

$corsOrigin = if ($envVars.ContainsKey('CORS_ORIGIN')) { $envVars['CORS_ORIGIN'] } else { 'http://localhost:5173' }

$setEnvVars = @(
    "KAKAO_REST_API_KEY=$($envVars['KAKAO_REST_API_KEY'])",
    "KAKAO_CLIENT_SECRET=$($envVars['KAKAO_CLIENT_SECRET'])",
    "JWT_SECRET=$($envVars['JWT_SECRET'])",
    "CORS_ORIGIN=$corsOrigin"
) -join ','

Write-Host "Cloud Run 배포 시작 (5~10분 소요)..." -ForegroundColor Cyan
Write-Host "  Project: cleanballtrio"
Write-Host "  Service: cleanballtrio-api"
Write-Host "  Region:  asia-northeast3"
Write-Host "  CORS:    $corsOrigin"
Write-Host ""

gcloud run deploy cleanballtrio-api `
    --source backend `
    --region asia-northeast3 `
    --platform managed `
    --allow-unauthenticated `
    --set-env-vars $setEnvVars `
    --quiet
