import test from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('all_character_sort.json 角色定義與 setup 屬性合規性驗證', () => {
  const jsonPath = path.resolve(__dirname, '../src-tauri/data/all_character_sort.json')
  const content = fs.readFileSync(jsonPath, 'utf8')
  const raw = JSON.parse(content)

  assert.ok(Array.isArray(raw), '角色資料庫必須為陣列')
  assert.ok(raw.length >= 300, `角色數量應大於 300，目前為 ${raw.length}`)

  // 1. 驗證 Constable (治安官) 的 setup 必須為嚴格布林值 true
  const constable = raw.find(r => r.id === 'Constable')
  assert.ok(constable, '找不到 Constable (治安官)')
  assert.strictEqual(constable.setup, true, 'Constable 的 setup 屬性必須為 boolean true')

  // 2. 驗證所有角色的 setup 欄位（若有定義）不可為整數或字串
  raw.forEach(c => {
    if (c.id === '_meta') return
    if (c.setup !== undefined) {
      assert.strictEqual(typeof c.setup, 'boolean', `角色 ${c.id} 的 setup 必須是 boolean，實際為 ${typeof c.setup}`)
    }
  })

  // 3. 模擬 parseRawArray 轉換，確保全角色產出的 Script 物件中所有角色 setup 皆為 boolean
  const chars = raw.filter(r => r.id !== '_meta').map(r => {
    let t = (r.team || r.role_type || '').toLowerCase()
    let mappedType = 'Townsfolk'
    if (t === 'outsider') mappedType = 'Outsider'
    if (t === 'minion') mappedType = 'Minion'
    if (t === 'demon') mappedType = 'Demon'
    if (t === 'traveler') mappedType = 'Traveler'
    if (t === 'fabled') mappedType = 'Fabled'
    if (t === 'loric') mappedType = 'Loric'

    return {
      id: r.id,
      name: r.name || '未知',
      name_en: r.name_en || r.id,
      role_type: mappedType,
      setup: Boolean(r.setup),
      reminders: Array.isArray(r.reminders) ? r.reminders : []
    }
  })

  assert.strictEqual(chars.length, raw.length - 1, '排除 _meta 後的角色總數應正確')
  chars.forEach(c => {
    assert.strictEqual(typeof c.setup, 'boolean', `轉換後角色 ${c.id} 的 setup 必須為 boolean`)
    assert.ok(Array.isArray(c.reminders), `角色 ${c.id} 的 reminders 必須為陣列`)
  })
})

test('開局面板 (RoleAssignmentPanel) 應移除前兩步並直接從挑選玩家角色 (select) 開始', () => {
  const uiStorePath = path.resolve(__dirname, '../src/stores/uiStore.ts')
  const panelPath = path.resolve(__dirname, '../src/components/RoleAssignmentPanel.vue')

  const uiStoreContent = fs.readFileSync(uiStorePath, 'utf8')
  const panelContent = fs.readFileSync(panelPath, 'utf8')

  assert.ok(
    uiStoreContent.includes("step: 'select'"),
    'uiStore 初始開局步驟必須為 select'
  )
  assert.strictEqual(
    panelContent.includes('class="step-pool"'),
    false,
    'RoleAssignmentPanel 模板應已移除原步驟 1 (step-pool)'
  )
  assert.strictEqual(
    panelContent.includes('class="step-config"'),
    false,
    'RoleAssignmentPanel 模板應已移除原步驟 2 (step-config)'
  )
  assert.ok(
    panelContent.includes('watch(totalPlayers, (p) => {\n  applyDefaultCounts(p)\n}, { immediate: true })') ||
    panelContent.includes('applyDefaultCounts(p)'),
    'RoleAssignmentPanel 必須自動讀取外部玩家人數 (totalPlayers) 並套用預設配比'
  )
})

test('劇本管理系統 (ScriptEditorPanel) 應以「選取劇本」作為最左側首要顯示分頁', () => {
  const editorPath = path.resolve(__dirname, '../src/components/ScriptEditorPanel.vue')
  const editorContent = fs.readFileSync(editorPath, 'utf8')

  assert.ok(
    editorContent.includes("const activeTab = ref<'select' | 'create' | 'list' | 'categories'>('select')"),
    'ScriptEditorPanel 預設分頁必須為 select (選取劇本)'
  )
  const selectTabIdx = editorContent.indexOf("activeTab === 'select'")
  const createTabIdx = editorContent.indexOf("activeTab === 'create'")
  assert.ok(selectTabIdx > -1 && createTabIdx > -1 && selectTabIdx < createTabIdx, '「選取劇本」分頁按鈕必須位於「建立劇本」左邊')
  assert.ok(
    editorContent.includes('height: 85vh;') && editorContent.includes('height: 85dvh;'),
    'ScriptEditorPanel 高度應設為 85vh / 85dvh 以避免手機瀏覽器頂部網址列遮擋關閉按鈕'
  )
  assert.ok(
    editorContent.includes('class="edition-scroll-wrapper" style="margin: 0; padding: 0 16px 8px;"'),
    '選取劇本分頁的分類篩選列必須覆蓋為 margin: 0 以免第一顆「全部」按鈕貼死左邊界'
  )
})

test('外部工具列 (GrimoireBoard.vue .side-action-group) 應鎖定「開局」按鈕並於首夜階段顯示', () => {
  const boardPath = path.resolve(__dirname, '../src/components/GrimoireBoard.vue')
  const boardContent = fs.readFileSync(boardPath, 'utf8')

  assert.ok(
    boardContent.includes('key="role-assignment"'),
    '側邊工具列應包含 key="role-assignment" 的開局按鈕'
  )
  assert.ok(
    boardContent.includes("uiStore.openPanel('role-assignment'); uiStore.isSideToolbarExpanded = false"),
    '點擊開局按鈕應開啟 role-assignment 面板並收起側邊工具列'
  )
  assert.ok(
    boardContent.includes("gameStore.phase === 'FirstNight' || gameStore.phase === 'Setup'"),
    '工具列開局按鈕應限制於首夜階段顯示'
  )
})

test('左下角 + 號按鈕上方應新增「劇本管理」按鈕，且設置面板內仍保留「劇本管理」', () => {
  const boardPath = path.resolve(__dirname, '../src/components/GrimoireBoard.vue')
  const settingsPath = path.resolve(__dirname, '../src/components/SettingsPanel.vue')
  const boardContent = fs.readFileSync(boardPath, 'utf8')
  const settingsContent = fs.readFileSync(settingsPath, 'utf8')

  const scriptBtnIdx = boardContent.indexOf('class="script-manager-btn"')
  const addPlayerBtnIdx = boardContent.indexOf('class="add-player-btn"')
  assert.ok(scriptBtnIdx > -1, 'GrimoireBoard.vue 應包含 class="script-manager-btn" 的劇本管理按鈕')
  assert.ok(scriptBtnIdx < addPlayerBtnIdx, '劇本管理按鈕應位於新增玩家 (+號) 按鈕上方')
  assert.ok(
    boardContent.includes('@click="uiStore.openPanel(\'script-editor\')"'),
    '點擊左下角劇本管理按鈕應開啟 script-editor 面板'
  )
  assert.ok(
    settingsContent.includes('@click="openScriptEditor"'),
    'SettingsPanel.vue 內應繼續保留劇本管理按鈕'
  )
  assert.ok(
    boardContent.includes('.script-manager-btn {\n  position: fixed;\n  bottom: calc(30px + env(safe-area-inset-bottom, 16px) + 44px);\n  left: 12px;\n  width: 36px;\n  height: 36px;'),
    '左下角按鈕應縮小為 36px 並貼齊左下角 (left: 12px, bottom: 30px 基準) 以避開玩家令片'
  )
})

test('玩家令片 (PlayerToken.vue) 死亡標記應使用 /pic/shroud1.png 垂掛於令片正上方中央', () => {
  const tokenPath = path.resolve(__dirname, '../src/components/PlayerToken.vue')
  const tokenContent = fs.readFileSync(tokenPath, 'utf8')

  assert.ok(
    tokenContent.includes('src="/pic/shroud1.png"'),
    'PlayerToken.vue 應使用 /pic/shroud1.png 作為死亡帷幕圖片'
  )
  assert.ok(
    tokenContent.includes('class="death-shroud"'),
    'PlayerToken.vue 應包含 class="death-shroud" 樣式類別'
  )
  assert.strictEqual(
    tokenContent.includes('class="death-ribbon"'),
    false,
    'PlayerToken.vue 不應再包含舊版斜向死亡緞帶 (death-ribbon)'
  )
})

test('玩家令片 (PlayerToken.vue) 名字後方應於每天白天顯示提名權、被提權、死亡票圖示', () => {
  const tokenPath = path.resolve(__dirname, '../src/components/PlayerToken.vue')
  const tokenContent = fs.readFileSync(tokenPath, 'utf8')

  assert.ok(
    tokenContent.includes('v-if="gameStore.phase === \'Day\'" class="status-indicators-inline"'),
    'status-indicators-inline 應限定於白天 (Day) 階段顯示'
  )
  assert.ok(
    tokenContent.includes('v-if="player.is_alive && (player.can_nominate || (player.extra_nominations && player.extra_nominations > 0))"') &&
    tokenContent.includes('src="/pic/nomination.png"'),
    '存活玩家尚有提名權時應顯示 /pic/nomination.png'
  )
  assert.ok(
    tokenContent.includes('v-if="!player.is_nominated"') &&
    tokenContent.includes('src="/pic/vote.png"'),
    '玩家尚有被提權時應顯示 /pic/vote.png'
  )
  assert.ok(
    tokenContent.includes('v-if="!player.is_alive && (player.has_ghost_vote || (player.extra_votes && player.extra_votes > 0))"') &&
    tokenContent.includes('src="/pic/grave.png"'),
    '死亡玩家尚有死亡票時應顯示 /pic/grave.png'
  )
})
