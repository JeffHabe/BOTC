import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('夜晚行動順序面板 (NightOrder.vue) 右上角角色過濾按鈕與全劇本/已派發切換驗證', () => {
  const nightOrderPath = path.resolve(__dirname, '../src/components/NightOrder.vue')
  assert.ok(fs.existsSync(nightOrderPath), 'NightOrder.vue 必須存在')
  const content = fs.readFileSync(nightOrderPath, 'utf8')

  // 1. 驗證右上角包含切換過濾按鈕
  assert.ok(
    content.includes('class="filter-order-btn"'),
    'NightOrder.vue 頂部動作區必須包含 filter-order-btn'
  )
  assert.ok(
    content.includes('@click="toggleFilterMode"'),
    'filter-order-btn 必須綁定 toggleFilterMode 點擊切換事件'
  )
  assert.ok(
    content.includes("showAllRoles ? '📜 全部角色' : '👥 僅已派發'"),
    '過濾按鈕應依據 showAllRoles 切換顯示「全部角色」或「僅已派發」'
  )

  // 2. 驗證支援持久化存儲 (localStorage)
  assert.ok(
    content.includes("localStorage.getItem('botc-night-order-show-all')"),
    '必須支援 botc-night-order-show-all 持久化狀態讀取'
  )
  assert.ok(
    content.includes("localStorage.setItem('botc-night-order-show-all'"),
    '切換時必須將狀態存入 localStorage'
  )

  // 3. 驗證 currentOrder 在 showAllRoles 開啟時推入未派發角色
  assert.ok(
    content.includes('else if (showAllRoles.value)'),
    'currentOrder 計算邏輯中必須支援未指派角色在 showAllRoles 為 true 時推入列表'
  )

  // 4. 驗證未派發角色標籤與樣式
  assert.ok(
    content.includes('class="order-player-unassigned"'),
    '未派發角色必須渲染 order-player-unassigned 標籤'
  )
  assert.ok(
    content.includes("'order-item-unassigned': !char.player && !char.is_system"),
    '未派發角色項目必須套用 order-item-unassigned 類別'
  )
})

test('夜晚行動順序演算法邏輯：showAllRoles 開關對首夜與其他夜晚列表長度之影響', () => {
  // 模擬資料：劇本中有 4 個夜晚角色，目前遊戲中僅 1 位玩家被派發了 investigator
  const mockScriptRoles = [
    { id: 'poisoner', name: '投毒者', role_type: 'Minion', night_order_first: 3, night_order_other: 5 },
    { id: 'investigator', name: '調查員', role_type: 'Townsfolk', night_order_first: 5, night_order_other: null },
    { id: 'chef', name: '廚師', role_type: 'Townsfolk', night_order_first: 6, night_order_other: null },
    { id: 'empath', name: '共情者', role_type: 'Townsfolk', night_order_first: 7, night_order_other: 10 }
  ]

  const mockSystem = [
    { id: 'sys_minion_info', is_system: true, night_order_first: 1 },
    { id: 'sys_demon_info', is_system: true, night_order_first: 2 }
  ]

  const mockPlayers = [
    { id: 'p1', name: 'Alice', role: { id: 'investigator' } }
  ]

  const rolePlayersMap = new Map()
  mockPlayers.forEach(p => {
    if (!rolePlayersMap.has(p.role.id)) rolePlayersMap.set(p.role.id, [])
    rolePlayersMap.get(p.role.id).push(p)
  })

  function calculateOrder(showAll, isFirst) {
    const list = isFirst ? [...mockSystem, ...mockScriptRoles] : mockScriptRoles.filter(r => r.night_order_other !== null)
    const result = []
    list.forEach((char, idx) => {
      if (char.is_system) {
        result.push({ ...char, player: null })
      } else {
        const players = rolePlayersMap.get(char.id) || []
        if (players.length > 0) {
          players.forEach((player, pIdx) => {
            result.push({ ...char, player })
          })
        } else if (showAll) {
          result.push({ ...char, player: null })
        }
      }
    })
    return result
  }

  // 1. 首夜測試
  // showAll = false (僅已派發): 2 系統 + 1 調查員 = 3
  const firstFiltered = calculateOrder(false, true)
  assert.equal(firstFiltered.length, 3)
  assert.equal(firstFiltered.filter(i => i.player !== null).length, 1)

  // showAll = true (全劇本): 2 系統 + 4 劇本角色 = 6
  const firstAll = calculateOrder(true, true)
  assert.equal(firstAll.length, 6)
  assert.equal(firstAll.filter(i => i.player === null).length, 5) // 2 系統 + 3 未派發

  // 2. 其他夜晚測試
  // showAll = false (僅已派發): 調查員無其他夜晚，因此在場無人 = 0
  const otherFiltered = calculateOrder(false, false)
  assert.equal(otherFiltered.length, 0)

  // showAll = true (全劇本): 投毒者與共情者有其他夜晚行動 = 2
  const otherAll = calculateOrder(true, false)
  assert.equal(otherAll.length, 2)
  assert.equal(otherAll[0].id, 'poisoner')
  assert.equal(otherAll[1].id, 'empath')
})

