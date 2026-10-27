# Checkpoint 1 自動化驗證 PowerShell 入口
Write-Host "正在執行 Checkpoint 1 自動化驗證..." -ForegroundColor Cyan
node "$PSScriptRoot/verify-cp1.cjs"
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
