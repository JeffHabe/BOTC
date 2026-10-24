import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function checkChineseDict() {
  const targetFile = path.resolve(__dirname, '../src/utils/chineseConverter.ts');
  if (!fs.existsSync(targetFile)) {
    console.error('❌ 找不到檔案: ' + targetFile);
    return false;
  }

  const content = fs.readFileSync(targetFile, 'utf8');
  const match = content.match(/const CHINESE_DICT\s*=\s*["']([^"']+)["']/);
  if (!match) {
    console.error('❌ 未在 chineseConverter.ts 中找到 CHINESE_DICT 定義！');
    return false;
  }

  const dict = match[1];
  const len = [...dict].length; // 使用展開運算子正確計算 Unicode 字符數

  if (len % 2 !== 0) {
    console.error(`\n======================================================`);
    console.error(`❌ [BUILD ERROR] CHINESE_DICT 字典字元數量必須為雙數（成對映射）！`);
    console.error(`目前字元數量為奇數: ${len}`);
    console.error(`請檢查 chineseConverter.ts 中是否有字元漏打或多打，否則會導致簡繁字典全面錯位！`);
    console.error(`======================================================\n`);
    return false;
  }

  console.log(`✅ [DICT CHECK] CHINESE_DICT 字典校驗通過：共 ${len} 字（${len / 2} 對簡繁映射，數量為雙數）。`);
  return true;
}

// 若直接執行此腳本，若不合格則以 Exit Code 1 中斷
if (process.argv[1] && process.argv[1].endsWith('check-dict.js')) {
  if (!checkChineseDict()) {
    process.exit(1);
  }
}
