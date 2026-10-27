/**
 * Checkpoint 2 自動化驗證腳本
 * 用途：
 *   1. 驗收前端雙模轉接層 (PlatformAdapter) 單元測試
 *   2. 驗收前端在純 Web 模式下的生產建置 (vite build -> dist/)
 *   3. 驗證靜態資產產出完整性，確保脫離 Tauri 桌面環境依然可安全編譯
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function runStep(name, fn) {
  log(`\n▶ [驗證項目] ${name}...`, colors.cyan);
  try {
    fn();
    log(`  ✔ 通過: ${name}`, colors.green);
    return true;
  } catch (err) {
    log(`  ✖ 失敗: ${name}`, colors.red);
    log(`    詳細錯誤: ${err.message}`, colors.red);
    return false;
  }
}

function main() {
  log('====================================================', colors.bold);
  log('       BOTC Checkpoint 2 自動化驗證程序啟動', colors.bold);
  log('====================================================', colors.bold);

  let allPassed = true;

  // 步驟 1: TypeScript 型別嚴格檢查
  const step0 = runStep('TypeScript 型別安全檢查 (vue-tsc --noEmit)', () => {
    execSync('npx vue-tsc --noEmit', { stdio: 'inherit' });
  });
  if (!step0) allPassed = false;

  // 步驟 2: 執行前端單元測試 (含 platformAdapter)
  const step1 = runStep('前端雙模轉接層單元測試 (npm test)', () => {
    execSync('node --test tests/*.test.js', { stdio: 'inherit' });
  });
  if (!step1) allPassed = false;

  // 步驟 2: 前端靜態生產建置
  const step2 = runStep('純 Web 靜態資源建置 (vite build)', () => {
    execSync('npx vite build', { stdio: 'inherit' });
  });
  if (!step2) allPassed = false;

  // 步驟 3: 驗證產物存在與基本結構
  const step3 = runStep('驗收 dist 產物與 index.html', () => {
    const distHtml = path.resolve(__dirname, '../../dist/index.html');
    if (!fs.existsSync(distHtml)) {
      throw new Error(`找不到 ${distHtml}，建置可能未產出 HTML`);
    }
    const htmlContent = fs.readFileSync(distHtml, 'utf8');
    if (!htmlContent.includes('<div id="app">')) {
      throw new Error('index.html 中缺少 #app 掛載點');
    }
  });
  if (!step3) allPassed = false;

  log('\n====================================================', colors.bold);
  if (allPassed) {
    log('🎉 [合格] Checkpoint 2 所有驗證項目全數通過！', colors.green + colors.bold);
    log('====================================================\n', colors.bold);
    process.exit(0);
  } else {
    log('❌ [不合格] Checkpoint 2 存在未通過的項目，請檢視上方日誌！', colors.red + colors.bold);
    log('====================================================\n', colors.bold);
    process.exit(1);
  }
}

main();
