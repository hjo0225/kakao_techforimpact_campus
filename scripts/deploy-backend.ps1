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
    if ($_ -match '^([A-Z_]+)="?([^"]*)"?$') {
        $envVars[$Matches[1]] = $Matches[2]
    }
}

foreach ($key in @('KAKAO_REST_API_KEY', 'KAKAO_CLIENT_SECRET', 'JWT_SECRET', 'DB_PASSWORD')) {
    if (-not $envVars.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($envVars[$key])) {
        Write-Error "필수 env 변수 누락: $key (backend/.env 확인)"
        exit 1
    }
}

$corsOrigin = if ($envVars.ContainsKey('CORS_ORIGIN')) { $envVars['CORS_ORIGIN'] } else { 'http://localhost:5173' }
$dbUser = if ($envVars.ContainsKey('DB_USER')) { $envVars['DB_USER'] } else { 'postgres' }
$dbName = if ($envVars.ContainsKey('DB_NAME')) { $envVars['DB_NAME'] } else { 'cleanballtrio' }

# Cloud SQL Unix 소켓 연결 (Cloud Run → Cloud SQL)
# 비밀번호/소켓 경로의 특수문자 URL 인코딩 (Prisma URL 파서 호환)
$cloudSqlInstance = "cleanballtrio:asia-northeast3:cleanballtrio-db"
$encodedInstance = $cloudSqlInstance -replace ":", "%3A"
$encodedPassword = [uri]::EscapeDataString($envVars['DB_PASSWORD'])
$encodedUser = [uri]::EscapeDataString($dbUser)
$dbUrl = "postgresql://${encodedUser}:${encodedPassword}@/%2Fcloudsql%2F$encodedInstance/$dbName"

# gcloud은 값에 콤마가 있으면 파싱 오류. ^@^ 접두어로 @ 구분자 사용
$setEnvVars = "^@^" + (@(
    "KAKAO_REST_API_KEY=$($envVars['KAKAO_REST_API_KEY'])",
    "KAKAO_CLIENT_SECRET=$($envVars['KAKAO_CLIENT_SECRET'])",
    "JWT_SECRET=$($envVars['JWT_SECRET'])",
    "CORS_ORIGIN=$corsOrigin",
    "DATABASE_URL=$dbUrl"
) -join '@')

Write-Host "Cloud Run 배포 시작 (5~10분 소요)..." -ForegroundColor Cyan
Write-Host "  Project: cleanballtrio"
Write-Host "  Service: cleanballtrio-api"
Write-Host "  Region:  asia-northeast3"
Write-Host "  DB:      $cloudSqlInstance"
Write-Host ""

gcloud run deploy cleanballtrio-api `
    --project cleanballtrio `
    --source backend `
    --region asia-northeast3 `
    --platform managed `
    --allow-unauthenticated `
    --add-cloudsql-instances $cloudSqlInstance `
    --set-env-vars $setEnvVars `
    --quiet
