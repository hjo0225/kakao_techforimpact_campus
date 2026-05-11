#!/usr/bin/env pwsh
# Cloud Run vision 서비스 배포 (수동 실행용)
# 사용법: powershell scripts/deploy-vision.ps1

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path $PSScriptRoot -Parent
$sourceDir = Join-Path $projectRoot 'vision'

Write-Host "Cloud Run vision 서비스 배포 시작 (10~15분 소요 — PyTorch 빌드 포함)..." -ForegroundColor Cyan
Write-Host "  Project: cleanballtrio"
Write-Host "  Service: cleanballtrio-vision"
Write-Host "  Region:  asia-northeast3"
Write-Host "  Source:  $sourceDir"
Write-Host ""

gcloud run deploy cleanballtrio-vision `
    --project cleanballtrio `
    --source $sourceDir `
    --region asia-northeast3 `
    --platform managed `
    --allow-unauthenticated `
    --memory 2Gi `
    --cpu 1 `
    --concurrency 4 `
    --timeout 60s `
    --quiet
