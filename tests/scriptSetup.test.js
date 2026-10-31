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
    boardContent.includes("uiStore.openPanel('role-assignment')"),
    '點擊開局按鈕應開啟 role-assignment 面板'
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

test('劇本標誌 (Logo) 在 Rust 後端、前端狀態同步與魔典畫布應完整支援並保持同步', () => {
  // 1. 檢查 server/src/game.rs 中的 Script 結構體必須含有 logo 與 name_en
  const gameRsPath = path.resolve(__dirname, '../server/src/game.rs')
  const gameRsContent = fs.readFileSync(gameRsPath, 'utf8')
  assert.ok(
    gameRsContent.includes('pub logo: Option<String>'),
    'server/src/game.rs Script 必須包含 pub logo: Option<String>'
  )
  assert.ok(
    gameRsContent.includes('pub name_en: Option<String>'),
    'server/src/game.rs Script 必須包含 pub name_en: Option<String>'
  )

  // 2. 檢查 gameStore.ts 中的 syncState 必須保留/還原 logo 與 name_en
  const gameStorePath = path.resolve(__dirname, '../src/stores/gameStore.ts')
  const gameStoreContent = fs.readFileSync(gameStorePath, 'utf8')
  assert.ok(
    gameStoreContent.includes('newState.script.logo = found.logo') ||
    gameStoreContent.includes('found.logo'),
    'gameStore.ts 的 syncState 必須從 found 中還原 logo'
  )

  // 3. 檢查 GrimoireBoard.vue 中的圖片來源與監聽器
  const grimoirePath = path.resolve(__dirname, '../src/components/GrimoireBoard.vue')
  const grimoireContent = fs.readFileSync(grimoirePath, 'utf8')
  assert.ok(
    grimoireContent.includes('scriptStore.getScriptImageUrl(gameStore.script.logo)'),
    'GrimoireBoard.vue 應使用 scriptStore.getScriptImageUrl 解析劇本 logo'
  )
  assert.ok(
    grimoireContent.includes('gameStore.script?.id'),
    'GrimoireBoard.vue 應監聽 script.id 以重設 logoLoadFailed'
  )
})

test('角色相剋規則 (conflicts) 應完整支援 ConflictRule 物件結構以防止《地獄二重奏》等劇本載入失敗', () => {
  const gameRsPath = path.resolve(__dirname, '../server/src/game.rs')
  const gameRsContent = fs.readFileSync(gameRsPath, 'utf8')
  assert.ok(
    gameRsContent.includes('pub enum ConflictRule') || gameRsContent.includes('pub struct ConflictRule'),
    'server/src/game.rs 必須定義 ConflictRule 類型'
  )
  assert.ok(
    gameRsContent.includes('pub conflicts: Vec<ConflictRule>'),
    'server/src/game.rs CharacterDef.conflicts 必須為 Vec<ConflictRule>'
  )
})

test('首夜狀態下回退按鈕應禁用且後端回退邏輯應嚴格鎖定首夜以防止跳至白天', () => {
  // 1. 檢查 StatusBar.vue 左側回退按鈕具備 disabled 屬性與對應樣式
  const statusBarPath = path.resolve(__dirname, '../src/components/StatusBar.vue')
  const statusBarContent = fs.readFileSync(statusBarPath, 'utf8')
  assert.ok(
    statusBarContent.includes(":disabled=\"gameStore.phase === 'FirstNight' || gameStore.phase === 'Setup'\""),
    'StatusBar.vue 的 ◀ 按鈕在首夜與準備階段必須設為 disabled'
  )
  assert.ok(
    statusBarContent.includes('.nav-btn:disabled'),
    'StatusBar.vue 必須包含 .nav-btn:disabled 樣式定義'
  )

  // 2. 檢查 server/src/game.rs 回退時不會將首夜或準備階段轉為白天
  const gameRsPath = path.resolve(__dirname, '../server/src/game.rs')
  const gameRsContent = fs.readFileSync(gameRsPath, 'utf8')
  assert.ok(
    gameRsContent.includes('GamePhase::FirstNight | GamePhase::Setup =>') &&
    gameRsContent.includes('gs.phase = GamePhase::FirstNight;'),
    'server/src/game.rs 中的 revert_phase 必須在首夜時鎖定，不可退至白天'
  )
})

test('魔典右側固定功能列表佈局驗證 (常駐顯示、水平夜晚與隱私、設置使用齒輪圖示)', () => {
  const grimoirePath = path.resolve(__dirname, '../src/components/GrimoireBoard.vue')
  const content = fs.readFileSync(grimoirePath, 'utf8')

  // 1. 驗證不再存在收放控制開關 menu-toggle-btn
  assert.ok(
    !content.includes('class="menu-toggle-btn"'),
    '已暫停收放功能，GrimoireBoard.vue 不應再包含 menu-toggle-btn 開關'
  )

  // 2. 驗證頂部水平橫排結構與按鈕
  assert.ok(
    content.includes('class="side-action-top-row"'),
    'GrimoireBoard.vue 必須包含 side-action-top-row 橫排容器'
  )
  assert.ok(
    content.includes('key="night-order"') && content.includes('/pic/day-and-night.png'),
    'side-action-top-row 必須包含夜晚順序按鈕'
  )
  assert.ok(
    content.includes('key="privacy"') && content.includes('uiStore.toggleRolesHidden()'),
    'side-action-top-row 必須包含隱藏角色/隱私按鈕'
  )
  assert.ok(
    content.includes('key="settings"') && content.includes('/pic/gear.png'),
    'side-action-top-row 設置按鈕的圖示必須使用齒輪 (/pic/gear.png)'
  )

  // 3. 驗證右側垂直直排結構與按鈕
  assert.ok(
    content.includes('class="side-action-vertical"'),
    'GrimoireBoard.vue 必須包含 side-action-vertical 垂直排列容器'
  )
  assert.ok(
    content.includes('key="shape"') && content.includes('uiStore.cycleGrimoireShape()'),
    'side-action-vertical 必須包含魔典圖形切換按鈕'
  )
  assert.ok(
    !content.includes('key="voting"'),
    'side-action-vertical 已取消右上角重複的投票管理按鈕'
  )
  assert.ok(
    content.includes('GrimoireVotingHud'),
    '魔典主畫布必須保留右下角的 GrimoireVotingHud'
  )
  assert.ok(
    content.includes('key="whiteboard"') && content.includes("uiStore.openPanel('whiteboard')"),
    'side-action-vertical 必須包含說書人資訊按鈕'
  )
})

test('玩家控制面板 (PlayerControlSheet.vue) 排版驗證 (死亡與變更角色同行、提名與被提名整合、今日可提名提示燈、移除提示標記與提名管理標題)', () => {
  const sheetPath = path.resolve(__dirname, '../src/components/PlayerControlSheet.vue')
  const content = fs.readFileSync(sheetPath, 'utf8')

  // 1. 驗證死亡/復活 與 變更角色在同一行（無 full-width）
  assert.ok(
    !content.includes('class="action-btn death-btn full-width"'),
    '死亡按鈕應移除 full-width，與變更角色並排在同一行'
  )
  assert.ok(
    !content.includes('class="action-btn role-btn full-width"'),
    '變更角色按鈕應與死亡按鈕並排在同一行'
  )

  // 2. 驗證移除「提示標記」按鈕
  assert.ok(
    !content.includes('class="action-btn reminder-btn"'),
    '應移除提示標記按鈕（外面玩家令片已有加號）'
  )
  assert.ok(
    !content.includes('handleReminderPicker'),
    '應清理已移除按鈕的 handleReminderPicker 函數'
  )

  // 3. 驗證移除「提名管理」標題與獨立外層容器，並將提名/被提名整合進上方 action-grid
  assert.ok(
    !content.includes('提名管理'),
    '不應再劃分獨立的「提名管理」標題'
  )
  assert.ok(
    !content.includes('class="nomination-actions"'),
    '不應再有 nomination-actions 容器'
  )
  assert.ok(
    content.includes('@click="handleStartNominationAs"') && content.includes('@click="handleNominateHim"'),
    '提名與被提名按鈕必須存在於核心操作區域中'
  )

  // 4. 驗證「今日可提名」與「死亡票」為提示燈而非開關
  assert.ok(
    content.includes('nominate-indicator-lamp'),
    '狀態項目必須使用提示燈結構 (nominate-indicator-lamp)'
  )
  assert.ok(
    content.includes('死亡票'),
    '靈魂投票權應更名為「死亡票」'
  )
  assert.ok(
    !content.includes('靈魂投票權'),
    '介面上不應再出現舊名稱「靈魂投票權」'
  )
  assert.ok(
    content.includes(":class=\"{ 'is-lit': player.has_ghost_vote"),
    '死亡票提示燈必須具備 is-lit 亮燈發光類別綁定'
  )
  assert.ok(
    !content.includes('handleToggleGhost'),
    '死亡票改為提示燈後，不應再包含切換開關函數 handleToggleGhost'
  )
  assert.ok(
    !content.includes('handleToggleNominate'),
    '今日可提名改為提示燈後，不應再包含切換開關函數 handleToggleNominate'
  )
  assert.ok(
    content.includes('canPlayerNominate') && content.includes(":class=\"{ 'is-lit': canPlayerNominate }\""),
    '提名權提示燈必須綁定 canPlayerNominate，確保死亡玩家絕不亮起可提名綠燈'
  )
})

test('劇本相剋規則 (conflicts) 前端兼容轉換與保留完整物件驗證', () => {
  const gameStorePath = path.resolve(__dirname, '../src/stores/gameStore.ts')
  const content = fs.readFileSync(gameStorePath, 'utf8')

  assert.ok(
    content.includes('c.conflicts = c.conflicts.map('),
    'gameStore.ts 在發送 set_script 前必須轉換 conflicts 為相容字串以支援舊版後端'
  )
  assert.ok(
    content.includes('orig.conflicts') && content.includes('newChar.conflicts = orig.conflicts'),
    'gameStore.ts 在 syncState 時必須保留前端完整的 conflicts Jinx 物件'
  )
})

test('魔像 (Golem) 整場對局僅限提名一次驗證 (VotingPanel 排除、PlayerControlSheet 禁用與說明文字)', () => {
  // 1. 檢查 VotingPanel.vue 的 canNominate 下拉清單中已過濾已提名的魔像
  const votingPath = path.resolve(__dirname, '../src/components/VotingPanel.vue')
  const votingContent = fs.readFileSync(votingPath, 'utf8')
  assert.ok(
    votingContent.includes("p.role?.id === 'golem'") &&
    votingContent.includes("gameStore.nominations.some(n => n.nominator_id === p.id)"),
    'VotingPanel.vue 必須將整場已發起過提名的魔像從可提名下拉選單中排除'
  )

  // 2. 檢查 PlayerControlSheet.vue 禁用魔像按鈕與顯示每局限一次提示文字
  const sheetPath = path.resolve(__dirname, '../src/components/PlayerControlSheet.vue')
  const sheetContent = fs.readFileSync(sheetPath, 'utf8')
  assert.ok(
    sheetContent.includes("p.role?.id === 'golem'") &&
    sheetContent.includes("gameStore.nominations.some(n => n.nominator_id === p.id)"),
    'PlayerControlSheet.vue 必須在魔像已有提名紀錄時判定禁用提名按鈕'
  )
  assert.ok(
    sheetContent.includes('每局限一次（已使用）') &&
    sheetContent.includes('每局限一次（可提名）'),
    'PlayerControlSheet.vue 必須提供魔像專屬之每局限一次說明文字'
  )

  // 3. 檢查後端 server/src/game.rs 換天推進時鎖定魔像提名權
  const gameRsPath = path.resolve(__dirname, '../server/src/game.rs')
  const gameRsContent = fs.readFileSync(gameRsPath, 'utf8')
  assert.ok(
    gameRsContent.includes('r.id == "golem"') &&
    gameRsContent.includes('has_nominated_before') &&
    gameRsContent.includes('p.can_nominate = false;'),
    'server/src/game.rs 在 advance_phase 換天推進時必須鎖定魔像，不重設其提名權'
  )
})

test('編輯劇本 (ScriptEditorPanel.vue) 進階設定收合功能驗證 (Logo/圖檔/匯入收合，預設隱藏提升角色瀏覽空間)', () => {
  const panelPath = path.resolve(__dirname, '../src/components/ScriptEditorPanel.vue')
  const content = fs.readFileSync(panelPath, 'utf8')

  // 1. 驗證進階設定收合按鈕與命名
  assert.ok(
    content.includes('class="advanced-settings-toggle-btn"'),
    'ScriptEditorPanel.vue 必須包含進階設定收合按鈕'
  )
  assert.ok(
    content.includes('進階設定'),
    '收合按鈕名稱必須為「進階設定」'
  )

  // 2. 驗證響應式變數與收合容器
  assert.ok(
    content.includes('isAdvancedSettingsExpanded'),
    'ScriptEditorPanel.vue 必須包含 isAdvancedSettingsExpanded 響應式變數'
  )
  assert.ok(
    content.includes('v-show="isAdvancedSettingsExpanded"'),
    '進階設定內容區塊必須由 isAdvancedSettingsExpanded 控制顯示與隱藏'
  )

  // 3. 驗證進階設定收合區塊完整包含劇本名稱、所屬分類、Logo 網址、匯入 JSON、實體正面與背面圖檔
  assert.ok(
    content.includes('newScriptName') &&
    content.includes('newScriptCategory') &&
    content.includes('newScriptLogo') &&
    content.includes('triggerJsonImport') &&
    content.includes('newScriptPhysicalImage') &&
    content.includes('newScriptPhysicalImageBack'),
    '進階設定收合區塊必須完整包含劇本名稱、所屬分類、Logo 網址、匯入 JSON、正面圖檔與背面圖檔'
  )
  assert.ok(
    content.includes('toggle-summary') && content.includes('newScriptName'),
    '進階設定按鈕必須在收合時呈現劇本名稱與分類之預覽資訊'
  )
})

test('《入骨相思知不知》劇本角色 ID 正規化與陣營計數驗證 (非 0 正確統計: 鎮民13/外來者4/爪牙4/惡魔4)', () => {
  // 1. 驗證 default_scripts.json 中《入骨相思知不知》已移除 _custom 後綴
  const scriptsPath = path.resolve(__dirname, '../public/data/default_scripts.json')
  const defaultScripts = JSON.parse(fs.readFileSync(scriptsPath, 'utf8'))
  const rugu = defaultScripts.scripts.find(s => s.name === '入骨相思知不知')
  assert.ok(rugu, 'default_scripts.json 必須包含《入骨相思知不知》')
  assert.strictEqual(rugu.characters.length, 25, '《入骨相思知不知》必須具備 25 個角色')

  // 驗證沒有殘留 _custom 後綴
  const customIds = rugu.characters.filter(c => c.id && c.id.endsWith('_custom'))
  assert.strictEqual(customIds.length, 0, '《入骨相思知不知》所有官方標準角色 ID 不得帶有 _custom 後綴')

  // 2. 驗證四大陣營角色數量精確分佈
  const townsfolk = rugu.characters.filter(c => c.role_type.toLowerCase() === 'townsfolk')
  const outsider = rugu.characters.filter(c => c.role_type.toLowerCase() === 'outsider')
  const minion = rugu.characters.filter(c => c.role_type.toLowerCase() === 'minion')
  const demon = rugu.characters.filter(c => c.role_type.toLowerCase() === 'demon')

  assert.strictEqual(townsfolk.length, 13, '鎮民池數量必須為 13')
  assert.strictEqual(outsider.length, 4, '外來者池數量必須為 4')
  assert.strictEqual(minion.length, 4, '爪牙池數量必須為 4')
  assert.strictEqual(demon.length, 4, '惡魔池數量必須為 4')

  // 3. 驗證 ScriptEditorPanel.vue 具備 _custom ID 容錯正規化映射機制
  const panelPath = path.resolve(__dirname, '../src/components/ScriptEditorPanel.vue')
  const panelContent = fs.readFileSync(panelPath, 'utf8')
  assert.ok(
    panelContent.includes("c.id.endsWith('_custom')") || panelContent.includes("id.endsWith('_custom')"),
    'ScriptEditorPanel.vue 必須具備 _custom 容錯相容正規化處理'
  )
})
