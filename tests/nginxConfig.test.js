import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- 開始執行 Nginx 配置規格測試 ---');

const confPath = path.resolve(__dirname, '../docker/nginx.conf');
assert.strictEqual(fs.existsSync(confPath), true, 'docker/nginx.conf 檔案必須存在');

const content = fs.readFileSync(confPath, 'utf8');

// 測試 1：驗證括號平衡
const openBraces = (content.match(/{/g) || []).length;
const closeBraces = (content.match(/}/g) || []).length;
assert.strictEqual(openBraces, closeBraces, `Nginx 大括號必須完全對稱閉合: { 共有 ${openBraces} 個, } 共有 ${closeBraces} 個`);
console.log(`✔ 測試 1 通過：大括號語法平衡校驗正確 (${openBraces} 對)`);

// 測試 2：驗證 SPA 路由支援
assert.strictEqual(content.includes('try_files $uri $uri/ /index.html;'), true, '必須包含 try_files 支援 Vue 靜態 SPA 路由');
console.log('✔ 測試 2 通過：Vue SPA 路由規則配置正確');

// 測試 3：驗證 API 與 WebSocket 反向代理規則
assert.strictEqual(content.includes('proxy_pass http://rust_backend/api/;'), true, '必須包含 /api/ 反向代理規則');
assert.strictEqual(content.includes('proxy_pass http://rust_backend/ws;'), true, '必須包含 /ws 反向代理規則');
assert.strictEqual(content.includes('proxy_set_header Upgrade $http_upgrade;'), true, '必須配置 WebSocket Upgrade 標頭');
assert.strictEqual(content.includes('proxy_set_header Connection "Upgrade";'), true, '必須配置 WebSocket Connection 標頭');
console.log('✔ 測試 3 通過：API 與 WebSocket 反向代理規則齊全');

// 測試 4：驗證 Gzip 壓縮啟用
assert.strictEqual(content.includes('gzip on;'), true, '必須啟用 Gzip 傳輸壓縮');
console.log('✔ 測試 4 通過：Gzip 效能優化配置正確');

console.log('🎉 所有 Nginx 配置規格測試全數通過！');
