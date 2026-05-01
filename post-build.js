import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 讀取版本號
const packagePath = path.resolve(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = pkg.version;

const releaseDir = path.resolve(__dirname, 'releases');
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir);
}

const baseApkDir = path.resolve(__dirname, 'src-tauri/gen/android/app/build/outputs/apk');

/**
 * 遞迴搜尋目錄下的 APK 檔案
 */
function findApkRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findApkRecursive(fullPath));
    } else if (file.endsWith('.apk')) {
      results.push(fullPath);
    }
  }
  return results;
}

const allApks = findApkRecursive(baseApkDir);

// 優先順序：aarch64 > universal > x86_64 > 其他
let source = '';
if (allApks.length > 0) {
  source = allApks.find(f => f.includes('aarch64')) || 
           allApks.find(f => f.includes('universal')) || 
           allApks.find(f => f.includes('arm64')) ||
           allApks[0];
}

if (source) {
  const destName = `BOTC_v${version}.apk`;
  const destPath = path.join(releaseDir, destName);
  
  try {
    fs.copyFileSync(source, destPath);
    console.log(`✅ 成功尋獲 APK: ${path.basename(source)}`);
    console.log(`✅ 已重新命名並複製至: ${destPath}`);
  } catch (err) {
    console.error(`❌ 複製檔案失敗: ${err.message}`);
  }
} else {
  console.log('⚠️ 找不到生成的 APK 檔案。');
  console.log('請確認是否已成功執行編譯指令，且輸出的 APK 位於以下目錄中：');
  console.log(baseApkDir);
}
