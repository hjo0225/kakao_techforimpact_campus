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
# Prisma는 path-form Unix socket URL(`@/%2Fcloudsql%2F...`)을 거부함 (P1013 empty host).
# 공식 권장 형식: `postgresql://user:pw@localhost/db?host=/cloudsql/INSTANCE_CONNECTION_NAME`
# https://www.prisma.io/docs/orm/overview/databases/postgresql#configuring-the-connection-url
$cloudSqlInstance = "cleanballtrio:asia-northeast3:cleanballtrio-db"
$encodedPassword = [uri]::EscapeDataString($envVars['DB_PASSWORD'])
$encodedUser = [uri]::EscapeDataString($dbUser)
$dbUrl = "postgresql://${encodedUser}:${encodedPassword}@localhost/${dbName}?host=/cloudsql/${cloudSqlInstance}"

# gcloud은 값에 콤마가 있으면 파싱 오류. 또한 PostgreSQL URL의 `@`(credentials/host 구분자)와
# 충돌해 env var가 둘로 쪼개지는 사례 확인됨 → 파이프 `|`를 커스텀 구분자로 사용
# (KAKAO_*/JWT_SECRET/CORS_ORIGIN/DATABASE_URL 어느 값에도 `|`가 나타날 수 없음).
$setEnvVars = "^|^" + (@(
    "KAKAO_REST_API_KEY=$($envVars['KAKAO_REST_API_KEY'])",
    "KAKAO_CLIENT_SECRET=$($envVars['KAKAO_CLIENT_SECRET'])",
    "JWT_SECRET=$($envVars['JWT_SECRET'])",
    "CORS_ORIGIN=$corsOrigin",
    "DATABASE_URL=$dbUrl"
) -join '|')

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
