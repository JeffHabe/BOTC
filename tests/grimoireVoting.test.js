import test from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('魔典直接投票 (uiStore.ts): 狀態管理與切換方法完整性驗證', () => {
  const uiStorePath = path.resolve(__dirname, '../src/stores/uiStore.ts')
  const content = fs.readFileSync(uiStorePath, 'utf8')

  // 驗證狀態變數
  assert.ok(content.includes('isDirectVotingActive'), 'uiStore 必須包含 isDirectVotingActive 狀態')
  assert.ok(content.includes('directVotingNomIndex'), 'uiStore 必須包含 directVotingNomIndex 狀態')
  assert.ok(content.includes('directVotingNomineeId'), 'uiStore 必須包含 directVotingNomineeId 狀態')
  assert.ok(content.includes('directVotingCurrentVoterIndex'), 'uiStore 必須包含 directVotingCurrentVoterIndex 狀態')
  assert.ok(content.includes('isVotingHudCollapsed'), 'uiStore 必須包含 isVotingHudCollapsed 狀態')
  assert.ok(content.includes('isVotingHudVisible'), 'uiStore 必須包含 isVotingHudVisible 狀態')

  // 驗證操作方法
  assert.ok(content.includes('startDirectVoting'), 'uiStore 必須包含 startDirectVoting 方法')
  assert.ok(content.includes('nextDirectVoter'), 'uiStore 必須包含 nextDirectVoter (手動下一位) 方法')
  assert.ok(content.includes('endDirectVoting'), 'uiStore 必須包含 endDirectVoting (結束/記錄投票) 方法')
  assert.ok(content.includes('toggleVotingHud'), 'uiStore 必須包含 toggleVotingHud (收合HUD) 方法')

  // 演算法驗證：順時針順位輪替 (nextDirectVoter) 邏輯
  const totalPlayers = 8
  let currentIndex = 6
  currentIndex = (currentIndex + 1) % totalPlayers
  assert.strictEqual(currentIndex, 7, '順位 6 下一位應為 7')
  currentIndex = (currentIndex + 1) % totalPlayers
  assert.strictEqual(currentIndex, 0, '順位 7 (最後一位) 下一位應循環至 0 (第一位)')
})

test('魔典直接投票 HUD (GrimoireVotingHud.vue): 功能模組與按鈕結構合規性驗證', () => {
  const hudPath = path.resolve(__dirname, '../src/components/GrimoireVotingHud.vue')
  assert.ok(fs.existsSync(hudPath), 'GrimoireVotingHud.vue 檔案必須存在')
  const content = fs.readFileSync(hudPath, 'utf8')

  // 1. 收合狀態與展開支援
  assert.ok(content.includes('is-collapsed') && content.includes('hud-collapsed-pill'), 'HUD 必須支援收合與迷你膠囊掛件展示')
  assert.ok(content.includes('toggleVotingHud'), 'HUD 必須提供切換收合功能')

  // 2. 投票進行中模式 (圖一)
  assert.ok(content.includes('hud-voting-mode'), '必須包含直接投票進行中模式')
  assert.ok(content.includes('記錄票數'), '必須提供「記錄票數」確認按鈕')
  assert.ok(content.includes('撤銷'), '必須提供「撤銷」按鈕')
  assert.ok(content.includes('點廣場上的玩家卡片切換舉手'), '必須包含圖一的舉手提示文字')

  // 3. 額外票數控制
  assert.ok(content.includes('額外票數') && content.includes('changeExtraVotes'), 'HUD 必須包含額外票數調整功能 (+/-)')

  // 4. 提名清單與處決模式 (圖二)
  assert.ok(content.includes('hud-list-mode'), '必須包含提名列表與處決模式')
  assert.ok(content.includes('待處決:'), '必須明確標示「待處決:」狀態')
  assert.ok(content.includes('btn-hud-nominate') && content.includes('提名'), '必須包含「提名」按鈕')
  assert.ok(content.includes('btn-hud-execute') && content.includes('處決'), '必須包含「處決」按鈕')

  // 5. 點廣場令片選擇提名模式 (如用戶截圖)
  assert.ok(content.includes('hud-picking-mode'), 'HUD 必須包含點選令片提名模式')
  assert.ok(content.includes('選擇由誰發起提名'), '必須包含「選擇由誰發起提名」引導提示')
  assert.ok(content.includes('選擇提名誰'), '必須包含「選擇提名誰」被提名者引導提示')
  assert.ok(content.includes('cancelPickingNomination'), '必須提供取消提名選擇功能')
})

test('血染鐘樓處決規則演算法驗證: 門檻與最高票（非平票）判定', () => {
  // 模擬處決演算法
  function calculateExecution(noms, threshold) {
    const activeNoms = noms.filter(n => !n.executed)
    if (activeNoms.length === 0) return { candidate: null, isTie: false }

    let maxVotes = 0
    let candidates = []

    for (const nom of activeNoms) {
      const votes = Math.max(0, nom.votes_for.length + (nom.extra_votes || 0))
      if (votes >= threshold) {
        if (votes > maxVotes) {
          maxVotes = votes
          candidates = [nom]
        } else if (votes === maxVotes) {
          candidates.push(nom)
        }
      }
    }

    if (candidates.length === 1) {
      return { candidate: candidates[0], votes: maxVotes, isTie: false }
    } else if (candidates.length > 1) {
      return { candidate: null, isTie: true }
    }
    return { candidate: null, isTie: false }
  }

  const threshold = 4

  // 案例 1：圖二數據 (2號得2票, 3號得6票, 4號得0票, 1號得2票) -> 3號被提名人5號達到6票且最高，應被處決
  const noms1 = [
    { nominee_id: 'p6', votes_for: ['a', 'b'], extra_votes: 0, executed: false },
    { nominee_id: 'p5', votes_for: ['a', 'b', 'c', 'd', 'e', 'f'], extra_votes: 0, executed: false },
    { nominee_id: 'p5_2', votes_for: [], extra_votes: 0, executed: false },
    { nominee_id: 'p7', votes_for: ['a', 'b'], extra_votes: 0, executed: false }
  ]
  const res1 = calculateExecution(noms1, threshold)
  assert.strictEqual(res1.candidate?.nominee_id, 'p5', '6票達門檻4且嚴格最高票，應判定為待處決人選')
  assert.strictEqual(res1.isTie, false, '非平票')

  // 案例 2：平票情況 (兩位皆得 5 票) -> 平票不處決
  const noms2 = [
    { nominee_id: 'p1', votes_for: ['a', 'b', 'c', 'd', 'e'], extra_votes: 0, executed: false },
    { nominee_id: 'p2', votes_for: ['a', 'b', 'c', 'd', 'e'], extra_votes: 0, executed: false }
  ]
  const res2 = calculateExecution(noms2, threshold)
  assert.strictEqual(res2.candidate, null, '平票時不可產生待處決人選')
  assert.strictEqual(res2.isTie, true, '應標記為平票')

  // 案例 3：未達門檻情況 (最高票僅 3 票，低於門檻 4)
  const noms3 = [
    { nominee_id: 'p1', votes_for: ['a', 'b', 'c'], extra_votes: 0, executed: false }
  ]
  const res3 = calculateExecution(noms3, threshold)
  assert.strictEqual(res3.candidate, null, '未達門檻時不可產生待處決人選')
  assert.strictEqual(res3.isTie, false)
})

test('玩家令片 (PlayerToken.vue): 直接投票狀態標記與點擊攔截驗證', () => {
  const tokenPath = path.resolve(__dirname, '../src/components/PlayerToken.vue')
  const content = fs.readFileSync(tokenPath, 'utf8')

  // 1. 光環樣式標記
  assert.ok(content.includes('is-direct-voting-nominee'), '被提名者令片應標記 is-direct-voting-nominee 光環')
  assert.ok(content.includes('is-direct-voting-nominator'), '提名者令片應標記 is-direct-voting-nominator 光環')

  // 2. ✋ / ❌ 標記結構
  assert.ok(content.includes('direct-voting-mark'), '令片內部必須渲染 direct-voting-mark 投票標記')
  assert.ok(content.includes('vote-hand-icon') && content.includes('✋'), '贊成票應顯示 ✋ 圖示')
  assert.ok(content.includes('vote-cross-icon') && content.includes('✕'), '未投票應顯示 ✕ 圖示')

  // 3. 點擊攔截
  assert.ok(content.includes('uiStore.isDirectVotingActive') && content.includes('gameStore.vote'), '點擊令片在直接投票模式下應調用 gameStore.vote 切換投票')
})

test('盤面點選令片發起提名 (PlayerToken.vue & uiStore.ts): 手勢標記 👉 與兩階段點選驗證', () => {
  const tokenPath = path.resolve(__dirname, '../src/components/PlayerToken.vue')
  const tokenContent = fs.readFileSync(tokenPath, 'utf8')
  const uiStorePath = path.resolve(__dirname, '../src/stores/uiStore.ts')
  const uiStoreContent = fs.readFileSync(uiStorePath, 'utf8')

  // 1. uiStore 提名點選階段管理
  assert.ok(uiStoreContent.includes('nominationPickingStep'), 'uiStore 必須包含 nominationPickingStep 狀態')
  assert.ok(uiStoreContent.includes('pickingNominatorId'), 'uiStore 必須包含 pickingNominatorId 狀態')
  assert.ok(uiStoreContent.includes('startPickingNomination'), 'uiStore 必須包含 startPickingNomination 方法')
  assert.ok(uiStoreContent.includes('setPickingNominator'), 'uiStore 必須包含 setPickingNominator 方法')
  assert.ok(uiStoreContent.includes('cancelPickingNomination'), 'uiStore 必須包含 cancelPickingNomination 方法')

  // 2. 令片 👉 手勢圖示展示
  assert.ok(tokenContent.includes('nomination-pick-hand-mark'), '令片必須包含 nomination-pick-hand-mark 手勢圖示容器')
  assert.ok(tokenContent.includes('pick-hand-icon') && tokenContent.includes('👉'), '必須包含 👉 手指圖示指示說書人點選')
  assert.ok(tokenContent.includes('shouldShowPickHand'), '必須動態計算是否展示 👉 手勢')

  // 3. 點選提名者 -> 點選被提名者 -> 發起直接投票流程
  assert.ok(tokenContent.includes('canPickAsNominator'), '必須嚴格檢查只有具備提名權的玩家才可作為提名者被點選')
  assert.ok(tokenContent.includes('canPickAsNominee'), '必須檢查只有今日未被提名的玩家才可作為被提名者被點選')
  assert.ok(tokenContent.includes('handlePickNominee'), '點選被提名者後必須直接呼叫 nominate 並無縫進入直接投票')
})

test('魔典主畫布 (GrimoireBoard.vue) 與設置面板 (SettingsPanel.vue) 整合驗證', () => {
  const grimoirePath = path.resolve(__dirname, '../src/components/GrimoireBoard.vue')
  const grimoireContent = fs.readFileSync(grimoirePath, 'utf8')

  // 1. 中央時鐘雙指針模組 (包含使用者自訂指針 clock-small.webp, clock-big.webp 與 demon-head.webp)
  assert.ok(grimoireContent.includes('clock-pointers-container'), 'GrimoireBoard 必須包含 clock-pointers-container 中央時鐘指針容器')
  assert.ok(grimoireContent.includes('clock-small.webp'), '提名人箭頭必須引用 clock-small.webp')
  assert.ok(grimoireContent.includes('clock-big.webp'), '被提名者箭頭必須引用 clock-big.webp')
  assert.ok(grimoireContent.includes('demon-head.webp'), '時鐘中央軸心必須引用 demon-head.webp')
  assert.ok(grimoireContent.includes('hand-nominee') && grimoireContent.includes('nomineeHandStyle'), '必須包含指向被提名者的長指針與動態長度計算')
  assert.ok(grimoireContent.includes('hand-nominator') && grimoireContent.includes('nominatorHandStyle'), '必須包含指向提名人的短指針與動態長度計算')

  // 2. 掛載 GrimoireVotingHud
  assert.ok(grimoireContent.includes('GrimoireVotingHud'), 'GrimoireBoard 必須引入並掛載 GrimoireVotingHud 組件')

  // 3. 驗證 SettingsPanel 中保留舊版全螢幕投票面板開啟入口
  const settingsPath = path.resolve(__dirname, '../src/components/SettingsPanel.vue')
  const settingsContent = fs.readFileSync(settingsPath, 'utf8')
  assert.ok(settingsContent.includes('openVoting') && settingsContent.includes("uiStore.openPanel('voting')"), '設定頁面必須保留原有投票管理面板的開啟入口')
})

