/**
 * 預設劇本與角色庫單元測試
 * 驗證預設角色檔與劇本檔結構、資料完整性及更新機制
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('--- 開始執行 預設劇本與角色庫 (Presets) 測試 ---');

// 測試 1：角色資料庫完整性驗證
const charPath = path.join(projectRoot, 'src-tauri', 'data', 'all_character_sort.json');
assert.ok(fs.existsSync(charPath), 'src-tauri/data/all_character_sort.json 檔案必須存在');

const charContent = fs.readFileSync(charPath, 'utf8');
const chars = JSON.parse(charContent);
assert.ok(Array.isArray(chars), '角色資料必須是陣列');

const meta = chars.find(c => c.id === '_meta');
assert.ok(meta, '角色資料必須包含 _meta 節點');

const realChars = chars.filter(c => c.id !== '_meta');
assert.ok(realChars.length >= 200, `角色庫應包含至少 200 位角色，目前: ${realChars.length}`);

const sampleChar = realChars[0];
assert.ok(sampleChar.id, '角色必須有 id');
assert.ok(sampleChar.name, '角色必須有 name');
console.log(`✔ 測試 1 通過：預設角色庫驗證合格，共 ${realChars.length} 位角色`);

// 測試 2：預設劇本資料庫完整性驗證
const scriptPath = path.join(projectRoot, 'public', 'data', 'default_scripts.json');
assert.ok(fs.existsSync(scriptPath), 'public/data/default_scripts.json 檔案必須存在');

const scriptContent = fs.readFileSync(scriptPath, 'utf8');
const data = JSON.parse(scriptContent);
assert.ok(data.scripts && Array.isArray(data.scripts), '劇本檔必須包含 scripts 陣列');
assert.ok(data.scripts.length >= 50, `劇本數量應至少 50 個，目前: ${data.scripts.length}`);

const nonMasterScripts = data.scripts.filter(s => s.id !== 'all_character_sort');
assert.ok(nonMasterScripts.length > 0, '應包含自定義與官方劇本');
const firstScript = nonMasterScripts[0];
assert.ok(firstScript.id, '劇本必須有 id');
assert.ok(firstScript.name, '劇本必須有 name');
assert.ok(Array.isArray(firstScript.characters), '劇本必須包含 characters 陣列');
console.log(`✔ 測試 2 通過：預設劇本庫驗證合格，共 ${data.scripts.length} 套劇本（非大全劇本 ${nonMasterScripts.length} 套）`);

// 測試 3：更新工具搜尋邏輯測試
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { findLatestMatchingFile } = require('../scripts/update-presets.cjs');

const latestScriptFile = findLatestMatchingFile(/^botc-scripts-.*\.json$/i);
assert.ok(latestScriptFile, '專案目錄下應存在 botc-scripts-*.json');
assert.ok(latestScriptFile.includes('botc-scripts-2026-10-24.json'), `應鎖定最新劇本，目前: ${latestScriptFile}`);

const latestCharFile = findLatestMatchingFile(/^botc-characters-.*\.json$/i);
assert.ok(latestCharFile, '專案目錄下應存在 botc-characters-*.json');
assert.ok(latestCharFile.includes('botc-characters-1792915125811.json'), `應鎖定最新角色庫，目前: ${latestCharFile}`);
console.log(`✔ 測試 3 通過：精準識別到最新劇本 ${path.basename(latestScriptFile)} 與最新角色 ${path.basename(latestCharFile)}`);

console.log('🎉 預設劇本與角色庫所有測試皆已通過！\n');
