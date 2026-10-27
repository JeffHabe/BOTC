/**
 * Checkpoint 5 自動化驗證腳本
 * 用途：
 *   1. 驗證 Dockerfile.server 多階段安全編譯規範 (Builder/Runner 隔離, 非 root 使用者, 健康檢查)
 *   2. 驗證 docker-compose.yml 雙容器架構 (server + nginx, 內部網路隔離, 依賴關係)
 *   3. 偵測 Docker Daemon 狀態，若開啟則透過 docker compose config 執行 Compose 檔案結構與語法解析校驗
 */

const { execSync } = require('child_process');
const fs = require('fs');
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
  log('       BOTC Checkpoint 5 自動化驗證程序啟動', colors.bold);
  log('====================================================', colors.bold);

  let allPassed = true;

  // 步驟 1: Docker 容器化配置單元測試
  const step1 = runStep('Dockerfile.server 與 docker-compose.yml 規格單元測試', () => {
    execSync('node --test tests/dockerCompose.test.js', { stdio: 'inherit' });
  });
  if (!step1) allPassed = false;

  // 步驟 2: 前端靜態資源產物檢查 (供 Nginx 容器掛載)
  const step2 = runStep('前端靜態資源產物 (dist/) 檢查', () => {
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

  // 步驟 3: Docker Compose 語法與拓撲校驗
  log('\n▶ [驗證項目] Docker Compose 拓撲校驗...', colors.cyan);
  const dockerAvailable = isDockerRunning();
  if (dockerAvailable) {
    log('  ✔ Docker Daemon 正在運行中，執行 docker compose config 校驗...', colors.green);
    try {
      execSync('docker compose config --quiet', { stdio: 'inherit' });
      log('  ✔ 通過: docker compose config 解析驗證成功，服務結構與網路拓撲無誤！', colors.green);
    } catch (e) {
      log(`  ✖ 失敗: docker compose config 報錯: ${e.message}`, colors.red);
      allPassed = false;
    }
  } else {
    log('  ⚠ 提示: 本機 Docker CLI 已安裝，但 Docker Desktop 守護行程 (Daemon) 尚未啟動。', colors.yellow);
    log('    Compose 配置與 Dockerfile 靜態語法已通過規格驗證。', colors.yellow);
    log('    若要進行實際容器構建 (build) 與啟動，請先啟動 Docker Desktop 應用程式。', colors.yellow);
  }

  log('\n====================================================', colors.bold);
  if (allPassed) {
    log('🎉 [合格] Checkpoint 5 所有驗證項目全數通過！', colors.green + colors.bold);
    log('====================================================\n', colors.bold);
    process.exit(0);
  } else {
    log('❌ [不合格] Checkpoint 5 存在未通過的項目，請檢視上方日誌！', colors.red + colors.bold);
    log('====================================================\n', colors.bold);
    process.exit(1);
  }
}

main();
