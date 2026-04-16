import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tauriPath = path.resolve(__dirname, 'src-tauri/tauri.conf.json');
const packagePath = path.resolve(__dirname, 'package.json');

function bump(version) {
  const parts = version.split('.').map(Number);
  if (parts.length < 3) return version + '.1';
  parts[2]++; // 增加 Patch 版本號 (x.y.z -> x.y.z+1)
  return parts.join('.');
}

try {
  // 1. 更新 tauri.conf.json
  const tauriConf = JSON.parse(fs.readFileSync(tauriPath, 'utf8'));
  const oldVersion = tauriConf.version;
  const newVersion = bump(oldVersion);
  tauriConf.version = newVersion;
  fs.writeFileSync(tauriPath, JSON.stringify(tauriConf, null, 2));

  // 2. 更新 package.json
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));

  console.log(`✅ 版本號已自動遞增: ${oldVersion} -> ${newVersion}`);
} catch (err) {
  console.error('❌ 版本遞增失敗:', err.message);
  process.exit(1);
}
