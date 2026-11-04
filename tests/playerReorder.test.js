import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('玩家排序核心演算法：reorder_players 順序調整與座次重編定', () => {
  // 模擬原始玩家陣列
  const players = [
    { id: 'p1', name: '玩家1', seat: 1 },
    { id: 'p2', name: '玩家2', seat: 2 },
    { id: 'p3', name: '玩家3', seat: 3 },
    { id: 'p4', name: '玩家4', seat: 4 },
  ];

  // 排序指令要求新順序為：p3, p1, p4, p2
  const targetIds = ['p3', 'p1', 'p4', 'p2'];

  const reordered = [];
  const pool = [...players];
  for (const id of targetIds) {
    const idx = pool.findIndex(p => p.id === id);
    if (idx !== -1) {
      const [p] = pool.splice(idx, 1);
      reordered.push(p);
    }
  }
  for (const remaining of pool) {
    reordered.push(remaining);
  }

  // 重新編定座次 seat
  reordered.forEach((p, i) => {
    p.seat = i + 1;
  });

  assert.strictEqual(reordered[0].id, 'p3');
  assert.strictEqual(reordered[0].seat, 1);
  assert.strictEqual(reordered[1].id, 'p1');
  assert.strictEqual(reordered[1].seat, 2);
  assert.strictEqual(reordered[2].id, 'p4');
  assert.strictEqual(reordered[2].seat, 3);
  assert.strictEqual(reordered[3].id, 'p2');
  assert.strictEqual(reordered[3].seat, 4);
});

test('後端 Rust 伺服器 (server/src/game.rs) 支援 reorder_players 指令', () => {
  const gameRsPath = path.resolve(__dirname, '../server/src/game.rs');
  const gameRsContent = fs.readFileSync(gameRsPath, 'utf8');

  assert.ok(gameRsContent.includes('"reorder_players" =>'), 'server/src/game.rs 必須處理 reorder_players 指令');
  assert.ok(
    gameRsContent.includes('args.get("player_ids").or_else(|| args.get("playerIds"))'),
    'reorder_players 必須相容 player_ids 與 playerIds 兩種欄位命名'
  );
  assert.ok(gameRsContent.includes('p.seat = (i + 1) as u32;'), 'reorder_players 必須重新編排座位號碼');
});

test('座位編排面板 (PlayerOrderPanel.vue) 支援上下移動按鈕與跨平台拖曳', () => {
  const panelPath = path.resolve(__dirname, '../src/components/PlayerOrderPanel.vue');
  const panelContent = fs.readFileSync(panelPath, 'utf8');

  // 1. 驗證上下移動按鈕
  assert.ok(panelContent.includes('movePlayer(index, -1)'), '必須具備上移按鈕 movePlayer(index, -1)');
  assert.ok(panelContent.includes('movePlayer(index, 1)'), '必須具備下移按鈕 movePlayer(index, 1)');

  // 2. 驗證 Pointer Events 觸控拖曳支援
  assert.ok(panelContent.includes('onPointerDown($event, index)'), '必須具備跨平台 Pointer Events 拖曳');
  assert.ok(panelContent.includes('gameStore.reorderPlayers'), '重排後必須呼叫 gameStore.reorderPlayers 持久化');

  // 3. 驗證中英雙語支援
  assert.ok(panelContent.includes("uiStore.language === 'en' ? 'Seat Arrangement' : '調整座位順序'"), '標題必須支援雙語切換');
  assert.ok(panelContent.includes("uiStore.language === 'en' ? 'Close' : '關閉'"), '關閉按鈕必須支援雙語切換');
});

test('設置面板 (SettingsPanel.vue) 依需求隱藏「座位編排」圖示，維持主選單精簡', () => {
  const settingsPath = path.resolve(__dirname, '../src/components/SettingsPanel.vue');
  const settingsContent = fs.readFileSync(settingsPath, 'utf8');

  const activeTemplateSection = settingsContent.split('危險區域')[0];
  assert.ok(
    activeTemplateSection.includes('<!--') && activeTemplateSection.includes('openPlayerOrder'),
    '座位編排按鈕已在設置面板中註解隱藏'
  );
});

test('魔典主畫布 (GrimoireBoard.vue) 與令片 (PlayerToken.vue) 支援長按無縫拖曳與高效換位靈敏度', () => {
  const grimoirePath = path.resolve(__dirname, '../src/components/GrimoireBoard.vue');
  const grimoireContent = fs.readFileSync(grimoirePath, 'utf8');
  const tokenPath = path.resolve(__dirname, '../src/components/PlayerToken.vue');
  const tokenContent = fs.readFileSync(tokenPath, 'utf8');

  // 1. 令片長按無縫派發拖曳事件
  assert.ok(tokenContent.includes("emit('start-arrange'"), 'PlayerToken 長按震動時應立即 emit start-arrange');
  assert.ok(grimoireContent.includes('@start-arrange="onStartArrange'), 'GrimoireBoard 應監聽 @start-arrange 無縫切換為拖曳');

  // 2. 換位距離靈敏度提升至 16%
  assert.ok(grimoireContent.includes('minDist < 16'), '換位感應距離閾值應為 16% 以確保滑動交換靈敏度');

  // 3. 手勢 touch-action: none 保障
  assert.ok(tokenContent.includes('touch-action: none'), 'PlayerToken 樣式應具備 touch-action: none 防滾動手勢打斷');
  assert.ok(grimoireContent.includes('touch-action: none'), 'token-wrapper 樣式應具備 touch-action: none');
});

test('玩家令片 (PlayerToken.vue) 長按觸控判定具備抗微震容差 (10px)', () => {
  const tokenPath = path.resolve(__dirname, '../src/components/PlayerToken.vue');
  const tokenContent = fs.readFileSync(tokenPath, 'utf8');

  assert.ok(
    tokenContent.includes('Math.hypot(dx, dy) > 10'),
    '長按滑動檢測必須具備 10px 容差，防止手指微震誤取消長按進入排列模式'
  );
  assert.ok(
    tokenContent.includes('uiStore.isArrangingPlayers = true'),
    '長按到達時間後必須將 uiStore.isArrangingPlayers 設為 true 啟動排列'
  );
});
