import test from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('提示標記更新功能 (ReminderPicker.vue): 支援點擊現有標記進入編輯並執行更新', () => {
  const pickerPath = path.resolve(__dirname, '../src/components/ReminderPicker.vue')
  assert.ok(fs.existsSync(pickerPath), 'ReminderPicker.vue 檔案必須存在')
  const content = fs.readFileSync(pickerPath, 'utf8')

  // 1. 介面結構驗證
  assert.ok(content.includes('現有標記 (點擊修改)'), '必須提示現有標記點擊可修改')
  assert.ok(content.includes('startEdit(r)'), '點擊標記必須觸發 startEdit')
  assert.ok(content.includes("editingId ? '修改標記' : '新增自定義標記'"), '標題需隨編輯狀態動態切換')
  assert.ok(content.includes("editingId ? '更新' : '新增'"), '按鈕文字需在編輯狀態下顯示更新')

  // 2. 更新邏輯驗證
  assert.ok(content.includes('gameStore.updateReminder'), '執行更新時必須呼叫 gameStore.updateReminder')
  assert.ok(content.includes('cancelEdit()'), '操作後應重置編輯狀態')
})

test('提示標記狀態存取 (gameStore.ts): 必須定義 updateReminder 且呼叫後端 update_reminder', () => {
  const storePath = path.resolve(__dirname, '../src/stores/gameStore.ts')
  const content = fs.readFileSync(storePath, 'utf8')

  assert.ok(content.includes('async function updateReminder(playerId: string, reminderId: string, newText: string)'), 'gameStore 必須定義 updateReminder 函式')
  assert.ok(content.includes("callCommand<GameState>('update_reminder', { playerId, reminderId, newText })"), '必須呼叫 update_reminder 指令並帶入正確參數')
  assert.ok(content.includes('updateReminder,'), 'gameStore 必須對外導出 updateReminder')
})

test('後端伺服器 (server/src/game.rs): 必須具備 update_reminder 指令處理邏輯', () => {
  const serverGamePath = path.resolve(__dirname, '../server/src/game.rs')
  const content = fs.readFileSync(serverGamePath, 'utf8')

  assert.ok(content.includes('"update_reminder" => {'), 'server/src/game.rs 必須實裝 update_reminder action')
  assert.ok(content.includes('r.text = new_text.to_string()'), '必須正確更新 reminder 的 text 內容')
})

test('桌面端核心 (src-tauri/src/commands.rs): 必須具備 update_reminder command', () => {
  const tauriCommandsPath = path.resolve(__dirname, '../src-tauri/src/commands.rs')
  const content = fs.readFileSync(tauriCommandsPath, 'utf8')

  assert.ok(content.includes('pub fn update_reminder('), 'src-tauri/src/commands.rs 必須包含 update_reminder command')
})
