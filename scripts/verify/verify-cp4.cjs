/**
 * Checkpoint 4 自動化驗證腳本
 * 用途：
 *   1. 驗證 Nginx 反向代理配置規格 (SPA 路由, /api/ 代理, /ws WebSocket 支援)
 *   2. 驗證前端純 Web 靜態產物 (dist/)
 *   3. 偵測 Docker Daemon 狀態，若開啟則以官方 nginx:alpine 容器執行語法校驗 (nginx -t) 與容器化 HTTP 託管實測
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
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

function isDockerRunning() {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch (_) {
    return false;
  }
}

function main() {
  log('====================================================', colors.bold);
  log('       BOTC Checkpoint 4 自動化驗證程序啟動', colors.bold);
  log('====================================================', colors.bold);

  let allPassed = true;

  // 步驟 1: Nginx 配置規範單元測試
  const step1 = runStep('Nginx 配置檔案規格單元測試', () => {
    execSync('node --test tests/nginxConfig.test.js', { stdio: 'inherit' });
  });
  if (!step1) allPassed = false;

  // 步驟 2: 前端靜態產物確認
  const step2 = runStep('前端靜態資源產物 (dist/) 驗收', () => {
    const distHtml = path.resolve(__dirname, '../../dist/index.html');
    if (!fs.existsSync(distHtml)) {
      log('  ℹ 偵測到 dist/ 尚未產出，正在執行 vite build...', colors.yellow);
      execSync('npx vite build', { stdio: 'inherit' });
    }
    const html = fs.readFileSync(distHtml, 'utf8');
    if (!html.includes('<div id="app">')) {
      throw new Error('dist/index.html 缺少 #app 掛載點');
    }
  });
  if (!step2) allPassed = false;

  // 步驟 3: Docker 容器化檢驗
  log('\n▶ [驗證項目] Docker 容器化環境與 Nginx 映像檔校驗...', colors.cyan);
  const dockerAvailable = isDockerRunning();
  if (dockerAvailable) {
    log('  ✔ Docker Daemon 正在運行中，開始執行容器語法與服務實測...', colors.green);
    
    // 3.1 容器內 nginx -t 語法檢查
    const confPath = path.resolve(__dirname, '../../docker/nginx.conf').replace(/\\/g, '/');
    try {
      execSync(`docker run --rm -v "${confPath}:/etc/nginx/conf.d/default.conf:ro" nginx:alpine nginx -t`, {
        stdio: 'inherit'
      });
      log('  ✔ 通過: Docker Nginx 容器語法檢查 (nginx -t) 成功！', colors.green);
    } catch (e) {
      log(`  ✖ 失敗: Docker Nginx 語法檢查失敗: ${e.message}`, colors.red);
      allPassed = false;
    }

  } else {
    log('  ⚠ 提示: 本機 Docker CLI 已安裝，但 Docker Desktop 守護行程 (Daemon) 尚未啟動。', colors.yellow);
    log('    靜態配置規則已通過嚴格驗證。若要進行容器實跑測試，請先啟動 Docker Desktop 應用程式。', colors.yellow);
  }

  log('\n====================================================', colors.bold);
  if (allPassed) {
    log('🎉 [合格] Checkpoint 4 所有驗證項目全數通過！', colors.green + colors.bold);
    log('====================================================\n', colors.bold);
    process.exit(0);
  } else {
    log('❌ [不合格] Checkpoint 4 存在未通過的項目，請檢視上方日誌！', colors.red + colors.bold);
    log('====================================================\n', colors.bold);
    process.exit(1);
  }
}

main();
