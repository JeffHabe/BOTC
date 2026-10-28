import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- 開始執行 index.html 圖標配置測試 ---');

const indexPath = path.resolve(__dirname, '../index.html');
const iconPath = path.resolve(__dirname, '../public/pic/app-icon.png');

assert.strictEqual(fs.existsSync(indexPath), true, 'index.html 檔案必須存在');
assert.strictEqual(fs.existsSync(iconPath), true, 'public/pic/app-icon.png 圖標檔案必須存在');

const content = fs.readFileSync(indexPath, 'utf8');

// 測試 1：確認網頁分頁圖標指向手機 App 圖標而非預設 vite.svg
assert.strictEqual(
  content.includes('<link rel="icon" type="image/png" href="/pic/app-icon.png" />'),
  true,
  'index.html 必須將 favicon 指向 /pic/app-icon.png'
);
assert.strictEqual(
  content.includes('href="/vite.svg"'),
  false,
  'index.html 不應再引用預設的 /vite.svg'
);
console.log('✔ 測試 1 通過：網頁分頁圖標已正確指向手機 App 圖標 (/pic/app-icon.png)');

console.log('🎉 所有 index.html 圖標配置測試全數通過！');

