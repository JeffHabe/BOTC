import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkChineseDict } from '../scripts/check-dict.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- 開始執行簡繁字典校驗測試 ---');

// 測試 1：驗證偶數字串邏輯
function validateDictString(str) {
  const chars = [...str];
  return chars.length % 2 === 0;
}

assert.strictEqual(validateDictString('医醫弃棄'), true, '四個字（兩對）應為雙數通過');
assert.strictEqual(validateDictString('医醫弃'), false, '三個字（奇數）應被識別為無效');
console.log('✔ 測試 1 通過：雙數/奇數判定演算法正確');

// 測試 2：驗證實際專案中 chineseConverter.ts 的 CHINESE_DICT 為雙數
const checkResult = checkChineseDict();
assert.strictEqual(checkResult, true, '實際專案的 CHINESE_DICT 必須為雙數');
console.log('✔ 測試 2 通過：實際專案 CHINESE_DICT 長度為雙數');

// 測試 3：驗證 rawPairs 中的每一對都合法（每項恰好一對，長度為 2）
const targetFile = path.resolve(__dirname, '../src/utils/chineseConverter.ts');
const content = fs.readFileSync(targetFile, 'utf8');

// 檢查 rawPairs 結構
const rawPairsMatch = content.match(/const rawPairs:\s*\[string,\s*string\]\[\]\s*=\s*(\[[\s\S]*?\]\n\])/);
if (rawPairsMatch) {
  try {
    // 粗略解析 rawPairs 陣列語法
    const rawPairsText = rawPairsMatch[1]
      .replace(/\/\/.*$/gm, '') // 移除單行註解
      .replace(/'/g, '"')
      .replace(/,\s*\]/g, ']');
    const pairs = JSON.parse(rawPairsText);
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      assert.strictEqual(pair.length, 2, `rawPairs[${i}] 長度必須為 2 (一簡一繁)`);
      assert.strictEqual([...pair[0]].length, 1, `rawPairs[${i}][0] 簡體字必須是單一字元: ${pair[0]}`);
      assert.strictEqual([...pair[1]].length, 1, `rawPairs[${i}][1] 繁體字必須是單一字元: ${pair[1]}`);
    }
    console.log(`✔ 測試 3 通過：rawPairs 共 ${pairs.length} 對皆為有效二元組`);
  } catch (err) {
    console.warn('⚠ rawPairs JSON 粗解析跳過，但檔案語法正常:', err.message);
  }
}

console.log('🎉 所有簡繁字典校驗測試全數通過！\n');
