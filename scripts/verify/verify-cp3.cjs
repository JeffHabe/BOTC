/**
 * Checkpoint 3 自動化驗證腳本
 * 用途：
 *   1. 執行 Rust Server API 單元測試 (cargo test -p server)
 *   2. 啟動 Rust Server 實測魔典 HTTP 遊戲 API (POST /api/game/action & GET /api/game/state)
 *   3. 驗收前端雙模轉接層與 TypeScript 型別安全，確保完整對接
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

async function requestJson(url, options = {}, bodyData = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ statusCode: res.statusCode, data: json });
        } catch (e) {
          resolve({ statusCode: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (bodyData) {
      req.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function waitServerReady(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await requestJson(url);
      if (res.statusCode === 200) return true;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`超過 ${timeoutMs}ms 未能連線至伺服器`);
}

async function main() {
  log('====================================================', colors.bold);
  log('       BOTC Checkpoint 3 自動化驗證程序啟動', colors.bold);
  log('====================================================', colors.bold);

  let allPassed = true;

  // 步驟 1: 前端型別與單元測試防護
  const step1 = runStep('前端型別檢查與單元測試', () => {
    execSync('npx vue-tsc --noEmit', { stdio: 'inherit' });
    execSync('node --test tests/*.test.js', { stdio: 'inherit' });
  });
  if (!step1) allPassed = false;

  // 步驟 2: Rust Server 遊戲 API 單元測試
  const step2 = runStep('Rust Server 遊戲 API 測試 (cargo test -p server)', () => {
    execSync('cargo test -p server', { stdio: 'inherit' });
  });
  if (!step2) allPassed = false;

  // 步驟 3: 啟動伺服器並執行 HTTP 端點雙向聯調測試
  log(`\n▶ [驗證項目] 啟動 Rust Server 實測 /api/game/action 與 /api/game/state...`, colors.cyan);
  let serverProcess = null;
  try {
    serverProcess = spawn('cargo', ['run', '-p', 'server'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    serverProcess.stderr.on('data', (d) => {
      const text = d.toString();
      if (text.includes('BOTC 遊戲伺服器已啟動')) {
        process.stdout.write(`    [Server] ${text.trim()}\n`);
      }
    });

    await waitServerReady('http://127.0.0.1:3030/');
    log(`  ✔ 伺服器就緒，開始進行魔典 API 測試...`, colors.green);

    // 測試 A: new_game
    const newGameRes = await requestJson('http://127.0.0.1:3030/api/game/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { cmd: 'new_game', args: {} });

    if (newGameRes.statusCode !== 200 || !newGameRes.data || !Array.isArray(newGameRes.data.players)) {
      throw new Error(`new_game 回應異常: ${JSON.stringify(newGameRes)}`);
    }
    log(`    ✔ new_game: 初始化遊戲狀態成功`, colors.green);

    // 測試 B: add_player (新增兩名玩家)
    const add1 = await requestJson('http://127.0.0.1:3030/api/game/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { cmd: 'add_player', args: { name: '說書人小林' } });

    const add2 = await requestJson('http://127.0.0.1:3030/api/game/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { cmd: 'add_player', args: { name: '玩家小華' } });

    if (add2.data.players.length !== 2) {
      throw new Error(`玩家數量不正確，預期 2，實際為 ${add2.data.players.length}`);
    }
    log(`    ✔ add_player: 成功新增 2 名玩家 (${add2.data.players[0].name}, ${add2.data.players[1].name})`, colors.green);

    // 測試 C: GET /api/game/state 驗證同步一致性
    const queryRes = await requestJson('http://127.0.0.1:3030/api/game/state');
    if (queryRes.statusCode !== 200 || queryRes.data.players.length !== 2) {
      throw new Error(`GET /api/game/state 回應不符預期: ${JSON.stringify(queryRes)}`);
    }
    log(`    ✔ GET /api/game/state: 伺服器遊戲狀態查詢完全同步`, colors.green);

    log(`  ✔ 通過: 魔典 HTTP API 實測完全合格！`, colors.green);
  } catch (err) {
    log(`  ✖ 失敗: HTTP API 聯調實測失敗: ${err.message}`, colors.red);
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
    log('🎉 [合格] Checkpoint 3 所有驗證項目全數通過！', colors.green + colors.bold);
    log('====================================================\n', colors.bold);
    process.exit(0);
  } else {
    log('❌ [不合格] Checkpoint 3 存在未通過的項目，請檢視上方日誌！', colors.red + colors.bold);
    log('====================================================\n', colors.bold);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('執行驗證腳本時發生未預期錯誤:', err);
  process.exit(1);
});
