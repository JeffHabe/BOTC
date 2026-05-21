const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../src-tauri/data/all_character.json');
const outputPath = path.join(__dirname, '../src-tauri/data/all_character._sort.json');

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const meta = data.find(c => c.id === '_meta');
const characters = data.filter(c => c.id !== '_meta');

function getCharacterClass(c) {
  const ability = c.ability || '';

  // 1. 限一次最優先
  const isOnce = ability.includes('限一次') ||
    ability.includes('限使用一次') ||
    ability.includes('限制一次') ||
    ability.includes('限１次');
  if (isOnce) return '限一次';

  // 2. 夜晚行動次優先
  const hasFirst = c.firstNight !== undefined && c.firstNight > 0;
  const hasOther = c.otherNight !== undefined && c.otherNight > 0;

  if (hasFirst && !hasOther) return '首夜';
  if (hasFirst && hasOther) return '每夜';
  if (!hasFirst && hasOther) return '每夜*';

  // 3. 勝敗（無夜間行動，且有勝敗關鍵字）
  const isWinLose = ability.includes('獲勝') ||
    ability.includes('失敗') ||
    ability.includes('落敗') ||
    ability.includes('勝負') ||
    (ability.includes('贏') && !c.name.includes('風琴'));
  if (isWinLose) return '勝敗';

  // 4. 特殊（無夜間行動的其餘角色）
  return '特殊';
}

// 替每個角色加上 class 屬性
characters.forEach(c => {
  c.class = getCharacterClass(c);
});

// 分類排序順序
const classOrder = ['首夜', '每夜', '每夜*', '限一次', '特殊', '勝敗'];

// 根據 classOrder 排序，相同 class 保持原本順序
const sortedCharacters = [];
classOrder.forEach(className => {
  const group = characters.filter(c => c.class === className);
  sortedCharacters.push(...group);
});

// 組合 meta 和排序後的角色
const result = [];
if (meta) {
  result.push(meta);
}
result.push(...sortedCharacters);

// 寫入新 JSON 檔案
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');

console.log('Successfully written to all_character._sort.json');
console.log(`Total characters processed: ${characters.length}`);

// 列印出每個 class 的數量
const stats = {};
classOrder.forEach(cls => {
  stats[cls] = characters.filter(c => c.class === cls).length;
});
console.log('Class stats:', stats);
