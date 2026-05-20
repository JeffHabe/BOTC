import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 讀取版本號
const packagePath = path.resolve(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = pkg.version;

const isDebug = process.argv.includes('debug');
const isRelease = process.argv.includes('release');

let releaseDir = isDebug 
  ? path.resolve(__dirname, 'debug') 
  : path.resolve(__dirname, 'releases');
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
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

// 根據參數決定搜尋哪種 APK
let filteredApks = allApks;
if (isDebug) {
  filteredApks = allApks.filter(f => f.toLowerCase().includes('debug'));
} else if (isRelease) {
  filteredApks = allApks.filter(f => f.toLowerCase().includes('release'));
}

// 優先順序：aarch64 > universal > x86_64 > 其他
let source = '';
if (filteredApks.length > 0) {
  source = filteredApks.find(f => f.includes('aarch64')) || 
           filteredApks.find(f => f.includes('universal')) || 
           filteredApks.find(f => f.includes('arm64')) ||
           filteredApks[0];
}

if (source) {
  const suffix = isDebug ? '_debug' : '';
  const destName = `BOTC_v${version}${suffix}.apk`;
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
