/**
 * Checkpoint 1 自動化驗證腳本
 * 用途：
 *   1. 驗收單機版基準測試是否正常通過 (保障單機版不被破壞)
 *   2. 驗收 Rust Server 單元測試 (cargo test -p server)
 *   3. 驗收 Rust Server HTTP 服務啟動與健康檢查端點連通性 (GET http://127.0.0.1:3030/)
 */

const { spawn, execSync } = require('child_process');
const http = require('http');

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

async function waitHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('HTTP request timeout'));
        });
      });
      return res;
    } catch (_) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error(`超過 ${timeoutMs}ms 未能連線至 ${url}`);
}

async function main() {
  log('====================================================', colors.bold);
  log('       BOTC Checkpoint 1 自動化驗證程序啟動', colors.bold);
  log('====================================================', colors.bold);

  let allPassed = true;

  // 步驟 1: 單機版基準測試 (防止現有單機版壞掉)
  const step1 = runStep('單機版前端與字典測試 (npm test)', () => {
    execSync('node --test tests/*.test.js', { stdio: 'inherit' });
  });
  if (!step1) allPassed = false;

  // 步驟 2: Rust Server 單元測試
  const step2 = runStep('Rust Server 單元測試 (cargo test -p server)', () => {
    execSync('cargo test -p server', { stdio: 'inherit' });
  });
  if (!step2) allPassed = false;

  // 步驟 3: 啟動 Rust Server 並測試 HTTP 健康檢查端點
  log(`\n▶ [驗證項目] 啟動 Rust Server 並檢查 HTTP 端點 (http://127.0.0.1:3030/)...`, colors.cyan);
  let serverProcess = null;
  try {
    serverProcess = spawn('cargo', ['run', '-p', 'server'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    serverProcess.stderr.on('data', (d) => {
      // 輸出關鍵伺服器日誌輔助除錯
      const text = d.toString();
      if (text.includes('BOTC 遊戲伺服器已啟動')) {
        process.stdout.write(`    [Server Log] ${text.trim()}\n`);
      }
    });

    const res = await waitHttp('http://127.0.0.1:3030/');
    if (res.statusCode === 200 && res.body.includes('BOTC Game Server with Multi-room support is Running!')) {
      log(`  ✔ 通過: 伺服器成功回應 HTTP 200，內容包含健康檢查簽名。`, colors.green);
    } else {
      throw new Error(`伺服器回應異常: 狀態碼 ${res.statusCode}, 內容: ${res.body}`);
    }
  } catch (err) {
    log(`  ✖ 失敗: Rust Server HTTP 端點檢查失敗: ${err.message}`, colors.red);
    allPassed = false;
  } finally {
    if (serverProcess) {
      log('  ℹ 關閉測試用 Rust Server 程序...', colors.yellow);
      if (process.platform === 'win32') {
        try {
          execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
        } catch (_) {}
      } else {
        serverProcess.kill('SIGTERM');
      }
    }
  }

  log('\n====================================================', colors.bold);
  if (allPassed) {
    log('🎉 [合格] Checkpoint 1 所有驗證項目全數通過！', colors.green + colors.bold);
    log('====================================================\n', colors.bold);
    process.exit(0);
  } else {
    log('❌ [不合格] Checkpoint 1 存在未通過的項目，請檢視上方日誌！', colors.red + colors.bold);
    log('====================================================\n', colors.bold);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('執行驗證腳本時發生未預期錯誤:', err);
  process.exit(1);
});
