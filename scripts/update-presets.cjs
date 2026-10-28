/**
 * BOTC 預設劇本與角色庫一鍵更新腳本
 * 
 * 使用方式：
 *   1. 自動尋找專案根目錄最新的 botc-scripts-*.json 與 botc-characters-*.json 並更新：
 *      node scripts/update-presets.cjs
 * 
 *   2. 手動指定自訂檔案更新：
 *      node scripts/update-presets.cjs --scripts ./my-scripts.json --characters ./my-characters.json
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scripts' && args[i + 1]) {
      options.scriptsPath = path.resolve(projectRoot, args[++i]);
    } else if (args[i] === '--characters' && args[i + 1]) {
      options.charactersPath = path.resolve(projectRoot, args[++i]);
    }
  }
  return options;
}

function extractTimestamp(filename) {
  // 匹配毫秒時間戳 (如 1792915125811)
  const msMatch = filename.match(/(\d{13})/);
  if (msMatch) return parseInt(msMatch[1], 10);

  // 匹配日期格式 (如 2026-10-24)
  const dateMatch = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    return new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`).getTime();
  }
  return 0;
}

function findLatestMatchingFile(pattern) {
  const files = fs.readdirSync(projectRoot);
  const matched = files
    .filter(f => pattern.test(f))
    .map(f => {
      const fullPath = path.join(projectRoot, f);
      const stat = fs.statSync(fullPath);
      const nameTs = extractTimestamp(f);
      return { file: f, path: fullPath, mtime: stat.mtimeMs, nameTs };
    })
    .sort((a, b) => {
      if (b.nameTs !== a.nameTs) {
        return b.nameTs - a.nameTs; // 優先依檔名時間戳降序
      }
      return b.mtime - a.mtime; // 次之依修改時間降序
    });

  return matched.length > 0 ? matched[0].path : null;
}

function updatePresets() {
  const options = parseArgs();

  // 1. 尋找或指定劇本來源
  let scriptsSource = options.scriptsPath;
  if (!scriptsSource) {
    scriptsSource = findLatestMatchingFile(/^botc-scripts-.*\.json$/i);
  }

  // 2. 尋找或指定角色來源
  let charactersSource = options.charactersPath;
  if (!charactersSource) {
    charactersSource = findLatestMatchingFile(/^botc-characters-.*\.json$/i);
  }

  console.log('==============================================');
  console.log('🎲 BOTC 預設劇本與角色資料庫更新工具');
  console.log('==============================================\n');

  let scriptsUpdated = false;
  let charactersUpdated = false;

  // 確保目錄存在
  const publicDataDir = path.join(projectRoot, 'public', 'data');
  const tauriDataDir = path.join(projectRoot, 'src-tauri', 'data');
  if (!fs.existsSync(publicDataDir)) fs.mkdirSync(publicDataDir, { recursive: true });
  if (!fs.existsSync(tauriDataDir)) fs.mkdirSync(tauriDataDir, { recursive: true });

  // 處理角色資料庫更新
  if (charactersSource && fs.existsSync(charactersSource)) {
    console.log(`[1/2] 讀取角色資料：${path.relative(projectRoot, charactersSource)}`);
    const charContent = fs.readFileSync(charactersSource, 'utf8');
    const chars = JSON.parse(charContent);
    if (!Array.isArray(chars)) {
      throw new Error('角色資料格式不合：預期為 JSON 陣列');
    }
    const metaCount = chars.filter(c => c.id === '_meta').length;
    const realCharCount = chars.filter(c => c.id !== '_meta').length;
    console.log(`      ✓ 角色庫檢驗合格：共 ${realCharCount} 位角色（含 _meta: ${metaCount}）`);

    // 複製到 src-tauri/data/all_character_sort.json（供單機版與前端建置載入）
    const tauriCharPath = path.join(tauriDataDir, 'all_character_sort.json');
    fs.copyFileSync(charactersSource, tauriCharPath);
    console.log(`      ✓ 已更新至: ${path.relative(projectRoot, tauriCharPath)}`);

    // 複製到 public/data/default_characters.json（供 Web 模式與外部使用）
    const publicCharPath = path.join(publicDataDir, 'default_characters.json');
    fs.copyFileSync(charactersSource, publicCharPath);
    console.log(`      ✓ 已更新至: ${path.relative(projectRoot, publicCharPath)}`);

    charactersUpdated = true;
  } else {
    console.log('[1/2] ⚠️ 未找到角色檔案（可指定 --characters <路徑>）');
  }

  console.log('');

  // 處理劇本資料庫更新
  if (scriptsSource && fs.existsSync(scriptsSource)) {
    console.log(`[2/2] 讀取劇本資料：${path.relative(projectRoot, scriptsSource)}`);
    const scriptContent = fs.readFileSync(scriptsSource, 'utf8');
    const scriptsData = JSON.parse(scriptContent);

    let scriptList = [];
    if (scriptsData && Array.isArray(scriptsData.scripts)) {
      scriptList = scriptsData.scripts;
    } else if (Array.isArray(scriptsData)) {
      scriptList = scriptsData;
    } else {
      throw new Error('劇本資料格式不合：預期包含 scripts 陣列或為 JSON 陣列');
    }

    const validScripts = scriptList.filter(s => s.id && s.id !== 'all_character_sort');
    console.log(`      ✓ 劇本庫檢驗合格：包含 ${validScripts.length} 個預設劇本`);

    // 複製/寫入到 public/data/default_scripts.json
    const publicScriptPath = path.join(publicDataDir, 'default_scripts.json');
    fs.copyFileSync(scriptsSource, publicScriptPath);
    console.log(`      ✓ 已更新至: ${path.relative(projectRoot, publicScriptPath)}`);

    scriptsUpdated = true;
  } else {
    console.log('[2/2] ⚠️ 未找到劇本檔案（可指定 --scripts <路徑>）');
  }

  console.log('\n----------------------------------------------');
  if (scriptsUpdated && charactersUpdated) {
    console.log('🎉 預設角色與劇本庫已全數成功更新！');
  } else if (scriptsUpdated || charactersUpdated) {
    console.log('⚠️ 部份資料庫已更新，請確認未更新項目的檔案路徑。');
  } else {
    console.log('❌ 未有任何資料庫被更新。');
  }
  console.log('----------------------------------------------\n');
}

if (require.main === module) {
  try {
    updatePresets();
  } catch (err) {
    console.error('更新失敗:', err.message);
    process.exit(1);
  }
}

module.exports = { updatePresets, findLatestMatchingFile };
