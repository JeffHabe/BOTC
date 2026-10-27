# scripts/verify/verify-all.ps1
# 全系統一鍵回歸自動化驗證腳本 (PowerShell)

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "       BOTC 全系統自動化回歸檢驗 (PowerShell)      " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$scriptPath = Join-Path $PSScriptRoot "verify-all.cjs"
node $scriptPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] 全系統所有檢查點 (CP1 ~ CP5) 全部驗證合格！" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n[FAILURE] 全系統回歸驗證存在失敗項目！" -ForegroundColor Red
    exit 1
}
