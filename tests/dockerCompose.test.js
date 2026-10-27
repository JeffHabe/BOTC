// tests/dockerCompose.test.js
// 驗證 Checkpoint 5: Dockerfile.server 與 docker-compose.yml 容器化規範測試

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('CP5: Dockerfile.server 必須符合多階段安全建置規範', () => {
  const dockerfilePath = path.join(rootDir, 'docker', 'Dockerfile.server');
  assert.ok(fs.existsSync(dockerfilePath), 'docker/Dockerfile.server 必須存在');

  const content = fs.readFileSync(dockerfilePath, 'utf-8');

  // 1. 多階段建置
  assert.match(content, /FROM\s+rust:.*AS\s+builder/i, '必須包含 Builder 編譯階段');
  assert.match(content, /FROM\s+debian:.*AS\s+runner/i, '必須包含 Runner 輕量執行階段');

  // 2. 原始碼與建置隔離 (只包含 server 與 shared，不包含 src-tauri)
  assert.match(content, /COPY\s+shared\s+\.\/shared/, '必須複製 shared 共用模組');
  assert.match(content, /COPY\s+server\s+\.\/server/, '必須複製 server 模組');
  assert.doesNotMatch(content, /COPY\s+src-tauri/, '禁止複製 src-tauri，保證桌面版完全解耦隔離');

  // 3. 安全性：非 root 帳號
  assert.match(content, /useradd/i, '必須建立專屬非 root 系統使用者');
  assert.match(content, /USER\s+botc/i, '必須以非 root 使用者 (botc) 身分運行');

  // 4. 連接埠與健康檢查
  assert.match(content, /EXPOSE\s+3030/, '必須暴露 3030 連接埠');
  assert.match(content, /HEALTHCHECK/i, '必須定義容器健康檢查');
  assert.match(content, /CMD\s+\[.*\/app\/botc-server.*\]/, '必須以二進位檔啟動命令');
});

test('CP5: docker-compose.yml 必須定義完整的雙容器與網路拓撲', () => {
  const composePath = path.join(rootDir, 'docker-compose.yml');
  assert.ok(fs.existsSync(composePath), 'docker-compose.yml 必須存在');

  const content = fs.readFileSync(composePath, 'utf-8');

  // 1. 雙服務定義
  assert.match(content, /server:/, '必須定義 server 服務');
  assert.match(content, /nginx:/, '必須定義 nginx 服務');

  // 2. server 服務配置
  assert.match(content, /dockerfile:\s*docker\/Dockerfile\.server/, 'server 必須指向專屬 Dockerfile');
  assert.doesNotMatch(content, /ports:\s*\n\s*-\s*["']?3030:3030["']?/, 'server 埠號 3030 不可直接對宿主機暴露，需透過內部網路保護');

  // 3. nginx 服務配置
  assert.match(content, /image:\s*nginx:alpine/, 'nginx 必須採用輕量化 nginx:alpine 映象檔');
  assert.match(content, /["']?80:80["']?/, 'nginx 必須暴露 80 連接埠作為統一對外窗口');
  assert.match(content, /\.\/dist:\/usr\/share\/nginx\/html:ro/, 'nginx 必須唯讀掛載前端 dist 目錄');
  assert.match(content, /\.\/docker\/nginx\.conf:\/etc\/nginx\/conf\.d\/default\.conf:ro/, 'nginx 必須掛載自訂 nginx.conf');
  assert.match(content, /depends_on:\s*\n\s*-\s*server/, 'nginx 必須相依於 server 服務');

  // 4. 隔離網路定義
  assert.match(content, /botc-net:/, '必須定義專屬 bridge 虛擬網路 botc-net');
});
