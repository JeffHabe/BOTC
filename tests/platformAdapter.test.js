import assert from 'assert';
import { isTauri, existsAppData, writeAppData, readAppData, safeInvoke } from '../src/utils/platformAdapter.ts';

console.log('--- 開始執行 PlatformAdapter 平台轉接層測試 ---');

// 測試 1：預設 Node.js 環境下判定為非 Tauri
assert.strictEqual(isTauri(), false, '無 window 或無 Tauri 旗標時應判定為非 Tauri 環境');
console.log('✔ 測試 1 通過：非 Tauri 環境識別正確');

// 測試 2：模擬 Tauri 環境變數
globalThis.window = { __TAURI_INTERNALS__: {} };
assert.strictEqual(isTauri(), true, '具備 __TAURI_INTERNALS__ 時應判定為 Tauri 環境');
console.log('✔ 測試 2 通過：Tauri 環境動態識別正確');

// 測試 3：Web 模式 Storage 讀寫模擬
delete globalThis.window; // 切回 Web 模式

// 模擬 localStorage
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => mockStorage.has(k) ? mockStorage.get(k) : null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear()
};

async function testStorage() {
  const filename = 'test_script.json';
  const testData = JSON.stringify({ name: '測試劇本' });

  // 初始應不存在
  const initialExists = await existsAppData(filename);
  assert.strictEqual(initialExists, false, '未寫入前檔案應不存在');

  // 寫入資料
  await writeAppData(filename, testData);
  const afterExists = await existsAppData(filename);
  assert.strictEqual(afterExists, true, '寫入後檔案應存在');

  // 讀取資料
  const readResult = await readAppData(filename);
  assert.strictEqual(readResult, testData, '讀出內容應與寫入一致');
  console.log('✔ 測試 3 通過：Web Storage 讀寫模擬正確無誤');
}

// 測試 4：Web 模式下調用 safeInvoke 不應崩潰
async function testSafeInvoke() {
  const res = await safeInvoke('dummy_command', { foo: 'bar' });
  assert.strictEqual(res, null, 'Web 模式下呼叫未掛載的 command 應回傳 null 且不拋出致命例外');
  console.log('✔ 測試 4 通過：safeInvoke 安全防護機制運作正常');
}

await testStorage();
await testSafeInvoke();

console.log('🎉 所有 PlatformAdapter 測試全數通過！');
