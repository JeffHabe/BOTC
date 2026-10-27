# scripts/verify/verify-cp5.ps1
# Checkpoint 5 PowerShell 自動化驗證啟動腳本

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "       BOTC Checkpoint 5 自動化驗證 (PowerShell)   " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$scriptPath = Join-Path $PSScriptRoot "verify-cp5.cjs"
node $scriptPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] Checkpoint 5 驗證順利完成！" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n[FAILURE] Checkpoint 5 驗證存在錯誤！" -ForegroundColor Red
    exit 1
}
