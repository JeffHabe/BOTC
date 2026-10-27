/**
 * BOTC 全系統一鍵回歸自動化驗證腳本 (verify-all.cjs)
 * 依序執行 Checkpoint 1 至 Checkpoint 5 的所有驗證流程：
 *   - CP1: 後端健康檢查與單機版基準保護
 *   - CP2: 前端雙模轉接層 (platformAdapter) 與 TypeScript 型別檢查
 *   - CP3: Rust 後端遊戲 API (/api/game/action, /api/game/state)
 *   - CP4: Nginx 純容器化反向代理與靜態託管規格
 *   - CP5: Docker Compose 雙容器拓撲與 Dockerfile.server 建置規格
 */

const { execSync } = require('child_process');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

const checkpoints = [
  { name: 'Checkpoint 1 (後端健康檢查 & 單機版隔離)', script: 'scripts/verify/verify-cp1.cjs' },
  { name: 'Checkpoint 2 (前端雙模轉接層 & TS 型別)', script: 'scripts/verify/verify-cp2.cjs' },
  { name: 'Checkpoint 3 (Rust 遊戲狀態 API & 邏輯)', script: 'scripts/verify/verify-cp3.cjs' },
  { name: 'Checkpoint 4 (Nginx 容器化反代與靜態託管)', script: 'scripts/verify/verify-cp4.cjs' },
  { name: 'Checkpoint 5 (Docker Compose 雙容器拓撲)', script: 'scripts/verify/verify-cp5.cjs' },
];

function main() {
  log('====================================================', colors.bold);
  log('       BOTC 全系統自動化回歸檢驗 (CP1 ~ CP5)       ', colors.bold);
  log('====================================================\n', colors.bold);

  const results = [];
  const rootDir = path.resolve(__dirname, '../..');

  for (const cp of checkpoints) {
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, colors.cyan);
    log(`🚀 執行 ${cp.name}...`, colors.cyan + colors.bold);
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, colors.cyan);
    
    const startTime = Date.now();
    try {
      execSync(`node "${path.join(rootDir, cp.script)}"`, {
        stdio: 'inherit',
        cwd: rootDir
      });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      results.push({ name: cp.name, passed: true, elapsed });
    } catch (err) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      results.push({ name: cp.name, passed: false, elapsed, error: err.message });
      log(`\n❌ ${cp.name} 執行失敗！`, colors.red + colors.bold);
      break;
    }
    console.log('\n');
  }

  log('====================================================', colors.bold);
  log('               全流程回歸驗證結果匯總               ', colors.bold);
  log('====================================================', colors.bold);

  let allOk = true;
  for (const r of results) {
    if (r.passed) {
      log(` ✔ [合格] ${r.name} (${r.elapsed}s)`, colors.green);
    } else {
      allOk = false;
      log(` ✖ [失敗] ${r.name} (${r.elapsed}s)`, colors.red);
    }
  }

  log('====================================================', colors.bold);
  if (allOk && results.length === checkpoints.length) {
    log('🎉 全系統所有檢查點 (CP1 ~ CP5) 全部通過！系統健康！', colors.green + colors.bold);
    log('====================================================\n', colors.bold);
    process.exit(0);
  } else {
    log('❌ 回歸驗證未完全通過，請檢查上述錯誤日誌進行修正。', colors.red + colors.bold);
    log('====================================================\n', colors.bold);
    process.exit(1);
  }
}

main();
