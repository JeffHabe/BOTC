<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="assignment-panel panel animate-slide-up">
      <div class="panel-header">
        <span class="panel-icon">🎲</span>
        <h2 class="panel-title">{{ panelTitle }}</h2>
        <div class="step-indicator">Step {{ currentStepNum }} / 4</div>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <div class="assignment-content">
        <!-- 步驟 1: 篩選可用角色池 -->
        <div v-if="step === 'pool'" class="step-pool">
          <div class="action-footer top-actions compact">
            <button class="btn-ghost btn-xs" @click="uiStore.closePanel()">← 關閉面板</button>
            <button 
              class="btn-primary btn-xs" 
              @click="step = 'config'"
            >
              設定人數配比 →
            </button>
          </div>

          <div class="preset-manager">
            <div class="preset-label">角色池預設：</div>
            <div class="preset-controls">
              <select v-model="activePresetId" class="preset-select" @change="e => {
                const p = currentScriptPresets.find(p => p.id === (e.target as HTMLSelectElement).value);
                if (p) applyPreset(p);
              }">
                <option value="">-- 選擇預設 --</option>
                <option v-for="p in currentScriptPresets" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <button v-if="activePresetId" class="btn-icon" @click="updatePreset" title="儲存變更">💾</button>
              <button class="btn-icon" @click="showSaveModal = true" title="另存新檔">📁</button>
              <button v-if="activePresetId" class="btn-icon text-danger" @click="deletePreset(activePresetId)" title="刪除預設">🗑️</button>
            </div>
          </div>

          <!-- 儲存預設模態框 -->
          <div v-if="showSaveModal" class="mini-modal">
            <div class="modal-content">
              <h4>儲存目前的篩選配置</h4>
              <input v-model="presetNameInput" placeholder="例如：新手平衡場" @keyup.enter="savePreset" />
              <div class="modal-btns">
                <button @click="showSaveModal = false">取消</button>
                <button class="primary" @click="savePreset">確定儲存</button>
              </div>
            </div>
          </div>

          <div class="pool-quick-actions">
            <button class="btn-ghost btn-xs" @click="includeAllRoles">✅ 全選角色</button>
            <button class="btn-ghost btn-xs" @click="excludeAllRoles">🚫 清空池子</button>
          </div>

          <div class="instruction">點擊角色可從本局池子中排除（變暗代表不使用）</div>
          
          <div class="search-bar-assignment">
            <span class="search-icon">🔍</span>
            <input v-model="searchQuery" placeholder="搜尋角色名稱..." class="search-input-assignment" />
            <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</button>
          </div>
          
          <div class="selection-status-bar sticky-tabs">
            <div v-for="type in roleTypes" :key="type.key" 
                 class="type-pill interactive"
                 @click="scrollToGroup(type.key)">
              {{ type.label }} (池: {{ poolTypeCount(type.key) }}/{{ scriptTypeTotal(type.key) }})
            </div>
          </div>

          <div class="role-grid-container">
            <div v-for="group in fullGroupedCharacters" :key="group.type" :id="'group-' + group.type" class="role-group">
              <div class="group-header" :style="{ color: group.color }">
                {{ group.label }} 
              </div>
              <div class="role-grid">
                <div v-for="role in group.list" 
                     :key="role.id" 
                     class="role-card"
                     :class="{ 'is-excluded': excludedPoolIds.includes(role.id) }"
                     @click="togglePoolInclusion(role.id)">
                  <div class="role-card-icon">
                    <img v-if="role.image" :src="role.image" class="r-img" />
                    <span v-else class="r-emoji">{{ getRoleTypeEmoji(role.role_type) }}</span>
                  </div>
                  <div class="role-card-name">{{ role.name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 步驟 2: 配置人數配比 -->
        <div v-else-if="step === 'config'" class="step-config">
          <div class="info-banner">
            <span class="info-icon">👥</span>
            <span>當前玩家人數: <strong>{{ totalPlayers }}</strong></span>
          </div>

          <div class="section-title">決定角色配比</div>
          <div class="counts-editor">
            <div v-for="type in roleTypes" :key="type.key" class="count-row">
              <div class="type-info">
                <span class="type-dot" :style="{ backgroundColor: type.color }"></span>
                <span class="type-label">{{ type.label }}</span>
              </div>
              <div class="count-controls">
                <button @click="adjustCount(type.key, -1)" class="minus">-</button>
                <div class="count-val">{{ counts[type.key] }}</div>
                <button @click="adjustCount(type.key, 1)" class="plus">+</button>
              </div>
              <div class="pool-hint" :class="{'is-error': poolTypeCount(type.key) < counts[type.key]}">
                (可用: {{ poolTypeCount(type.key) }})
              </div>
            </div>
          </div>

          <div class="config-footer">
            <div class="total-status" :class="{ 'is-match': totalConfigured === totalPlayers }">
              總計配置: {{ totalConfigured }} / {{ totalPlayers }}
            </div>
            <div class="footer-btns" style="display:flex; gap:12px;">
              <button class="btn-ghost" @click="step = 'pool'">← 角色池</button>
              <button 
                class="btn-primary start-btn" 
                :disabled="totalConfigured !== totalPlayers || !isPoolLargeEnough"
                @click="goToSelect"
                style="flex:1;"
              >
                挑選玩家角色 →
              </button>
            </div>
          </div>
        </div>



        <!-- 步驟 3: 挑選具體角色 -->
        <div v-else-if="step === 'select'" class="step-select">
          <div class="action-footer top-actions compact">
            <button class="btn-ghost btn-xs" @click="step = 'config'">← 返回配比</button>
            <button class="btn-secondary btn-xs" @click="autoFillRoles">🎲 隨機補齊</button>
            <button 
              class="btn-primary btn-xs" 
              :disabled="!isSelectionComplete"
              @click="step = 'bluff'"
            >
              選虛張 →
            </button>
          </div>

          <div class="search-bar-assignment">
            <span class="search-icon">🔍</span>
            <input v-model="searchQuery" placeholder="快速搜尋角色..." class="search-input-assignment" />
            <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</button>
          </div>

          <div class="selection-status-bar sticky-tabs">
            <div v-for="type in roleTypes" :key="type.key" 
                 class="type-pill interactive" 
                 :class="{ 'is-done': currentTypeCount(type.key) === counts[type.key] }"
                 @click="scrollToGroup(type.key)">
              {{ type.label }} {{ currentTypeCount(type.key) }}/{{ counts[type.key] }}
            </div>
          </div>

          <div class="role-grid-container">
            <div v-for="group in groupedCharacters" :key="group.type" :id="'group-' + group.type" class="role-group">
              <div class="group-header" :style="{ color: group.color }">{{ group.label }}</div>
              <div class="role-grid">
                <div v-for="role in group.list" 
                     :key="role.id" 
                     class="role-card"
                     :class="{ 'is-selected': isRoleSelected(role.id) }"
                     @click="toggleRoleSelection(role)">
                  <div class="role-card-icon">
                    <img v-if="role.image" :src="role.image" class="r-img" />
                    <span v-else class="r-emoji">{{ getRoleTypeEmoji(role.role_type) }}</span>
                  </div>
                  <div class="role-card-name">{{ role.name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 步驟 3: 挑選惡魔虛張 -->
        <div v-else-if="step === 'bluff'" class="step-bluff">
          <div class="action-footer top-actions compact">
            <button class="btn-ghost btn-xs" @click="step = 'select'">← 選角色</button>
            <button class="btn-secondary btn-xs" @click="autoFillBluffs">🎲 隨機挑選</button>
            <button 
              class="btn-primary btn-xs" 
              :disabled="selectedBluffIds.length !== 3"
              @click="generatePlan"
            >
              預覽 →
            </button>
          </div>

          <div class="search-bar-assignment">
            <span class="search-icon">🔍</span>
            <input v-model="searchQuery" placeholder="搜尋虛張角色..." class="search-input-assignment" />
            <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</button>
          </div>

          <div class="selection-status-bar sticky-tabs">
            <div class="type-pill" :class="{ 'is-done': selectedBluffIds.length === 3 }">
              惡魔虛張角色 {{ selectedBluffIds.length }}/3
            </div>
            <div class="step-hint">（剩餘 {{ 3 - selectedBluffIds.length }} 個空位）</div>
          </div>

          <div class="role-grid-container">
            <div class="role-group">
              <div class="group-header" style="color: var(--color-townsfolk)">可選偽裝角色</div>
              <div class="role-grid">
                <!-- 只顯示未被選為玩家角色的村民 -->
                <div v-for="role in availableBluffPool" 
                     :key="role.id" 
                     class="role-card"
                     :class="{ 'is-selected': isBluffSelected(role.id) }"
                     @click="toggleBluffSelection(role.id)">
                  <div class="role-card-icon">
                    <img v-if="role.image" :src="role.image" class="r-img" />
                    <span v-else class="r-emoji">👤</span>
                  </div>
                  <div class="role-card-name">{{ role.name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 步驟 4: 預覽結果 -->
        <div v-else class="step-preview">
          <div class="preview-header">
            <button class="btn-ghost btn-sm" @click="step = 'bluff'">← 返回修改</button>
            <h3 class="preview-title">預覽分配結果</h3>
          </div>

          <div class="preview-list">
            <div v-for="item in previewAssignments" :key="item.player_id" class="preview-item">
              <span class="p-name">{{ playerName(item.player_id) }}</span>
              <span class="p-divider">→</span>
              <span v-if="item.role" class="p-role" :class="item.role.role_type.toLowerCase()">
                {{ item.role.name }}
              </span>
              <span v-else class="p-role none">未分配</span>
            </div>

            <div class="divider"><span>惡魔虛張</span></div>
            <div class="bluff-list">
              <div v-for="(b, i) in previewBluffs" :key="i" class="bluff-item">
                <span v-if="b" class="b-role">{{ b.name }}</span>
                <span v-else class="b-role none">無虛張</span>
              </div>
            </div>
          </div>

          <div class="preview-actions">
            <button class="btn-ghost" @click="generatePlan">🎲 重新洗牌</button>
            <button class="btn-primary" @click="confirmAssignment">✅ 正式指派</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import type { CharacterDef } from '../types'
import { ROLE_TYPE_COLOR } from '../types'

const uiStore = useUIStore()
const gameStore = useGameStore()

// 狀態管理
type Step = 'pool' | 'config' | 'select' | 'bluff' | 'preview'
const step = ref<Step>('pool')
const totalPlayers = computed(() => gameStore.players.length)

// 角色池狀態使用 UI Store 持久化
const excludedPoolIds = computed({
  get: () => uiStore.excludedPoolIds,
  set: (val) => uiStore.excludedPoolIds = val
})
const activePresetId = computed({
  get: () => uiStore.activePoolPresetId,
  set: (val) => uiStore.activePoolPresetId = val
})
interface PoolPreset {
  id: string
  name: string
  script_id: string
  excluded_ids: string[]
}
const poolPresets = ref<PoolPreset[]>([])
const presetNameInput = ref('')
const showSaveModal = ref(false)

const counts = reactive<Record<string, number>>({
  Townsfolk: 0,
  Outsider: 0,
  Minion: 0,
  Demon: 0
})

const selectedRoleIds = ref<string[]>([])
const selectedBluffIds = ref<string[]>([])
const searchQuery = ref('') // 新增搜尋關鍵字

// 基礎映射
const roleTypes = [
  { key: 'Townsfolk', label: '村民', color: ROLE_TYPE_COLOR.Townsfolk },
  { key: 'Outsider', label: '外來者', color: ROLE_TYPE_COLOR.Outsider },
  { key: 'Minion', label: '爪牙', color: ROLE_TYPE_COLOR.Minion },
  { key: 'Demon', label: '惡魔', color: ROLE_TYPE_COLOR.Demon },
]

onMounted(() => {
  const p = totalPlayers.value
  // 使用標準推薦人數
  if (p === 5) { counts.Townsfolk = 3; counts.Outsider = 0; counts.Minion = 1; counts.Demon = 1; }
  else if (p === 6) { counts.Townsfolk = 3; counts.Outsider = 1; counts.Minion = 1; counts.Demon = 1; }
  else if (p === 7) { counts.Townsfolk = 5; counts.Outsider = 0; counts.Minion = 1; counts.Demon = 1; }
  else if (p === 8) { counts.Townsfolk = 5; counts.Outsider = 1; counts.Minion = 1; counts.Demon = 1; }
  else if (p === 9) { counts.Townsfolk = 5; counts.Outsider = 2; counts.Minion = 1; counts.Demon = 1; }
  else if (p === 10) { counts.Townsfolk = 7; counts.Outsider = 0; counts.Minion = 2; counts.Demon = 1; }
  else if (p === 11) { counts.Townsfolk = 7; counts.Outsider = 1; counts.Minion = 2; counts.Demon = 1; }
  else if (p === 12) { counts.Townsfolk = 7; counts.Outsider = 2; counts.Minion = 2; counts.Demon = 1; }
  else if (p >= 13) { counts.Townsfolk = 9; counts.Outsider = 0 + (p-13); counts.Minion = 3; counts.Demon = 1; }
  else {
    counts.Townsfolk = Math.max(0, p - 3)
    counts.Demon = 1; counts.Minion = 1; counts.Outsider = 1;
  }
})

// 計算屬性
const totalConfigured = computed(() => Object.values(counts).reduce((a, b) => a + b, 0))
const panelTitle = computed(() => {
  const titles: Record<Step, string> = {
    pool: '1. 篩選可用角色池',
    config: '2. 設定人數配比',
    select: '3. 挑選玩家角色',
    bluff: '4. 挑選惡魔虛張',
    preview: '5. 最終預覽'
  }
  return titles[step.value]
})
const currentStepNum = computed(() => {
  const map: Record<Step, number> = { pool: 1, config: 2, select: 3, bluff: 4, preview: 5 }
  return map[step.value]
})

onMounted(() => {
  loadPresets()
})

function loadPresets() {
  const saved = localStorage.getItem('botc-pool-presets')
  if (saved) {
    try {
      poolPresets.value = JSON.parse(saved)
    } catch (e) {
      console.error('Failed to load presets', e)
    }
  }
}

function savePreset() {
  if (!presetNameInput.value.trim() || !gameStore.script) return
  const newPreset: PoolPreset = {
    id: Date.now().toString(),
    name: presetNameInput.value.trim(),
    script_id: gameStore.script.id,
    excluded_ids: [...excludedPoolIds.value]
  }
  poolPresets.value.push(newPreset)
  localStorage.setItem('botc-pool-presets', JSON.stringify(poolPresets.value))
  presetNameInput.value = ''
  showSaveModal.value = false
}

function updatePreset() {
  if (!activePresetId.value || !gameStore.script) return
  const preset = poolPresets.value.find(p => p.id === activePresetId.value)
  if (preset) {
    preset.excluded_ids = [...excludedPoolIds.value]
    localStorage.setItem('botc-pool-presets', JSON.stringify(poolPresets.value))
    alert(`角色池預設 "${preset.name}" 已更新！`)
  }
}

function applyPreset(preset: PoolPreset) {
  excludedPoolIds.value = [...preset.excluded_ids]
  uiStore.activePoolPresetName = preset.name
}

function deletePreset(id: string) {
  poolPresets.value = poolPresets.value.filter(p => p.id !== id)
  localStorage.setItem('botc-pool-presets', JSON.stringify(poolPresets.value))
  if (activePresetId.value === id) {
    activePresetId.value = ''
    uiStore.activePoolPresetName = ''
  }
}

const currentScriptPresets = computed(() => {
  if (!gameStore.script) return []
  return poolPresets.value.filter(p => p.script_id === gameStore.script!.id)
})

const fullGroupedCharacters = computed(() => {
  if (!gameStore.script) return []
  const query = searchQuery.value.trim().toLowerCase()
  return roleTypes.map(t => ({
    type: t.key,
    label: t.label,
    color: t.color,
    list: gameStore.script!.characters.filter(c => {
      const matchesType = c.role_type === t.key
      const matchesQuery = !query || c.name.toLowerCase().includes(query)
      return matchesType && matchesQuery
    })
  }))
})

const groupedCharacters = computed(() => {
  if (!gameStore.script) return []
  const excluded = new Set(excludedPoolIds.value)
  const query = searchQuery.value.trim().toLowerCase()
  return roleTypes.map(t => ({
    type: t.key,
    label: t.label,
    color: t.color,
    list: gameStore.script!.characters.filter(c => {
      const matchesType = c.role_type === t.key && !excluded.has(c.id)
      const matchesQuery = !query || c.name.toLowerCase().includes(query)
      return matchesType && matchesQuery
    })
  }))
})

const availableBluffPool = computed(() => {
  if (!gameStore.script) return []
  const usedIds = new Set(selectedRoleIds.value)
  const excluded = new Set(excludedPoolIds.value)
  const query = searchQuery.value.trim().toLowerCase()
  
  // 虛張從「在池子內」且「未被指派給玩家」的村民與外來者中選擇
  return gameStore.script.characters.filter(c => {
    const isGoodType = c.role_type === 'Townsfolk' || c.role_type === 'Outsider'
    const isNotUsed = !usedIds.has(c.id) && !excluded.has(c.id) && !c.setup
    const matchesQuery = !query || c.name.toLowerCase().includes(query)
    return isGoodType && isNotUsed && matchesQuery
  })
})

const validBluffIds = computed(() => {
  if (!gameStore.script) return new Set<string>()
  const usedIds = new Set(selectedRoleIds.value)
  const excluded = new Set(excludedPoolIds.value)
  
  const pool = gameStore.script.characters.filter(c => {
    const isGoodType = c.role_type === 'Townsfolk' || c.role_type === 'Outsider'
    const isNotUsed = !usedIds.has(c.id) && !excluded.has(c.id) && !c.setup
    return isGoodType && isNotUsed
  })
  return new Set(pool.map(c => c.id))
})

watch(validBluffIds, (validSet) => {
  // 當可用名單改變時，過濾掉已經無效的選項，避免幽靈佔位
  selectedBluffIds.value = selectedBluffIds.value.filter(id => validSet.has(id))
})

function scriptTypeTotal(type: string) {
  return gameStore.script?.characters.filter(c => c.role_type === type && !c.setup).length || 0
}

function poolTypeCount(type: string) {
  if (!gameStore.script) return 0
  const excluded = new Set(excludedPoolIds.value)
  return gameStore.script.characters.filter(c => 
    c.role_type === type && !c.setup && !excluded.has(c.id)
  ).length
}

const isPoolLargeEnough = computed(() => {
  for (const type of roleTypes) {
    if (poolTypeCount(type.key) < counts[type.key]) return false
  }
  return true
})

const isSelectionComplete = computed(() => {
  return selectedRoleIds.value.length === totalPlayers.value
})

// 方法
function adjustCount(key: string, delta: number) {
  counts[key] = Math.max(0, counts[key] + delta)
}

function goToSelect() {
  selectedRoleIds.value = []
  step.value = 'select'
}

function currentTypeCount(type: string) {
  if (!gameStore.script) return 0
  return selectedRoleIds.value.filter(id => {
    const char = gameStore.script!.characters.find(c => c.id === id)
    return char?.role_type === type
  }).length
}

function isRoleSelected(id: string) {
  return selectedRoleIds.value.includes(id)
}

function isBluffSelected(id: string) {
  return selectedBluffIds.value.includes(id)
}

function toggleRoleSelection(role: CharacterDef) {
  const idx = selectedRoleIds.value.indexOf(role.id)
  if (idx > -1) {
    selectedRoleIds.value.splice(idx, 1)
  } else {
    // 只要總人數未達上限就可以選，不嚴格限制單一陣營
    if (selectedRoleIds.value.length < totalPlayers.value) {
      selectedRoleIds.value.push(role.id)
    } else {
      alert(`已經選滿 ${totalPlayers.value} 個玩家角色囉！`)
    }
  }
}

function togglePoolInclusion(id: string) {
  const idx = excludedPoolIds.value.indexOf(id)
  if (idx > -1) {
    excludedPoolIds.value.splice(idx, 1)
  } else {
    excludedPoolIds.value.push(id)
  }
}

function includeAllRoles() {
  excludedPoolIds.value = []
}

function excludeAllRoles() {
  if (!gameStore.script) return
  excludedPoolIds.value = gameStore.script.characters.map(c => c.id)
}

function toggleBluffSelection(id: string) {
  const idx = selectedBluffIds.value.indexOf(id)
  if (idx > -1) {
    selectedBluffIds.value.splice(idx, 1)
  } else if (selectedBluffIds.value.length < 3) {
    selectedBluffIds.value.push(id)
  }
}

function autoFillRoles() {
  if (!gameStore.script) return
  const script = gameStore.script
  
  // 如果已經填滿了，則先清空以便「重抽」
  if (isSelectionComplete.value) {
    selectedRoleIds.value = []
  }
  
  // 優先補齊原始配給人數，但不超過總剩餘空位
  for (const type of roleTypes) {
    const needed = Math.max(0, counts[type.key] - currentTypeCount(type.key))
    if (needed <= 0) continue
    
    const remainingSlots = totalPlayers.value - selectedRoleIds.value.length
    if (remainingSlots <= 0) break
    
    // 從未被選中的角色中挑選，且必須在篩選後的池子內
    const actualPick = Math.min(needed, remainingSlots)
    const excluded = new Set(excludedPoolIds.value)
    const available = script.characters.filter(c => 
      c.role_type === type.key && !isRoleSelected(c.id) && !excluded.has(c.id)
    )
    const shuffled = [...available].sort(() => Math.random() - 0.5)
    selectedRoleIds.value.push(...shuffled.slice(0, actualPick).map(c => c.id))
  }
  
  // 如果因為手動挑選打亂了數量，導致配給補完後人數仍然不足，則全隨機補齊剩下的空缺
  let remainingSlots = totalPlayers.value - selectedRoleIds.value.length
  if (remainingSlots > 0) {
    const excluded = new Set(excludedPoolIds.value)
    const available = script.characters.filter(c => 
      !c.setup && !isRoleSelected(c.id) && !excluded.has(c.id)
    )
    const shuffled = [...available].sort(() => Math.random() - 0.5)
    selectedRoleIds.value.push(...shuffled.slice(0, remainingSlots).map(c => c.id))
  }
}

function autoFillBluffs() {
  // 如果已經選了 3 個，則先清空以便「重抽」
  if (selectedBluffIds.value.length === 3) {
    selectedBluffIds.value = []
  }

  const pool = availableBluffPool.value
  const needed = 3 - selectedBluffIds.value.length
  if (needed <= 0) return
  
  const available = pool.filter(c => !isBluffSelected(c.id))
  const shuffled = [...available].sort(() => Math.random() - 0.5)
  selectedBluffIds.value.push(...shuffled.slice(0, needed).map(c => c.id))
}

const previewAssignments = ref<{ player_id: string, role: CharacterDef | null }[]>([])
const previewBluffs = ref<(CharacterDef | null)[]>([null, null, null])

function generatePlan() {
  if (!gameStore.script) return
  const script = gameStore.script
  
  // 從選中的 ID 獲取完整角色定義
  const pool = selectedRoleIds.value.map(id => script.characters.find(c => c.id === id)!).filter(Boolean)
  const bluffs = selectedBluffIds.value.map(id => script.characters.find(c => c.id === id)!).filter(Boolean)
  
  // 隨機洗牌分配給玩家
  const finalPool = [...pool].sort(() => Math.random() - 0.5)
  previewAssignments.value = gameStore.players.map((p, i) => ({
    player_id: p.id,
    role: finalPool[i] || null
  }))
  
  previewBluffs.value = bluffs
  step.value = 'preview'
}

function playerName(id: string) {
  return gameStore.players.find(p => p.id === id)?.name || id
}

async function confirmAssignment() {
  await gameStore.bulkAssignRoles(previewAssignments.value, previewBluffs.value)
  uiStore.closePanel()
}

function scrollToGroup(typeKey: string) {
  const el = document.getElementById('group-' + typeKey)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function getRoleTypeEmoji(type: string) {
  const map: Record<string, string> = { Townsfolk: '👤', Outsider: '👤', Minion: '🔱', Demon: '😈' }
  return map[type] || '❓'
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 1500;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 0 8px;
}

.assignment-panel {
  width: 100%;
  max-width: 480px;
  height: 90vh; /* 固定高度，防止切換步驟時面板跳動 */
  display: flex;
  flex-direction: column;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
  background: #1a1b23;
}

.panel-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.2);
}

.panel-title {
  flex: 1;
  font-family: var(--font-title);
  font-size: 16px;
  color: var(--color-gold);
}

.step-indicator {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
  margin-right: 12px;
  color: var(--color-text-muted);
}

.close-btn { background: none; border: none; font-size: 18px; color: var(--color-text-muted); padding: 4px; cursor: pointer; }

.assignment-content { 
  flex: 1; 
  overflow-y: auto; 
  padding: 20px;
  scrollbar-width: thin;
}

/* Step Common styles */
.section-title {
  font-size: 12px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
}

.pool-hint {
  font-size: 11px;
  color: var(--color-text-muted);
  flex: 1;
  text-align: right;
}
.pool-hint.is-error {
  color: #ff5252;
}

.instruction {
  font-size: 14px;
  color: #fff;
  margin-bottom: 16px;
  text-align: center;
}

.selection-status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
  background: rgba(0,0,0,0.2);
  padding: 10px;
  border-radius: 10px;
}

.type-pill {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--color-text-muted);
}

.type-pill.is-done {
  background: rgba(201, 168, 76, 0.2);
  border-color: var(--color-gold-muted);
  color: var(--color-gold-bright);
}

.action-footer.top-actions.compact {
  margin-top: -4px; /* 向上微調與標題靠攏 */
  margin-bottom: 12px;
  gap: 6px;
}

.btn-xs {
  padding: 4px;
  font-size: 13px;
  min-height: 44px;
  flex: 1; /* 確保按鈕均分寬度 */
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selection-status-bar.sticky-tabs {
  position: sticky;
  top: -20px;
  z-index: 30;
  background: #1a1b23;
  margin: 0 -20px 20px;
  padding: 10px 20px;
  border-radius: 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.type-pill.interactive {
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-pill.interactive:active {
  transform: scale(0.95);
  background: rgba(255,255,255,0.1);
}

/* Preset Manager */
.preset-manager {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0,0,0,0.2);
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.preset-label {
  font-size: 11px;
  color: var(--color-gold);
}

.preset-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preset-select {
  flex: 1;
  padding: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
  border-radius: 6px;
  outline: none;
  font-size: 13px;
}

.btn-icon {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: background 0.2s;
  color: white;
}

.btn-icon:hover { background: rgba(255,255,255,0.1); }
.text-danger { border-color: rgba(255, 68, 68, 0.3); }
.text-danger:hover { background: rgba(255, 68, 68, 0.1); }

.pool-quick-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.pool-quick-actions button {
  flex: 1;
  font-size: 11px;
  padding: 6px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  background: rgba(255,255,255,0.03);
  color: #ccc;
}
.pool-quick-actions button:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.2);
}

/* Mini Modal */
.mini-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-content {
  background: #1a1c24;
  border: 1px solid var(--color-gold);
  border-radius: 16px;
  padding: 20px;
  width: 100%;
  max-width: 300px;
}
.modal-content h4 { margin-top: 0; font-size: 14px; margin-bottom: 16px; color: var(--color-gold); }
.modal-content input {
  width: 100%;
  padding: 10px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
  border-radius: 8px;
  margin-bottom: 20px;
}
.modal-btns { display: flex; gap: 10px; }
.modal-btns button { flex: 1; padding: 10px; border-radius: 8px; border: none; font-size: 13px; }
.modal-btns button.primary { background: var(--color-gold); color: black; font-weight: bold; }

/* 搜尋框樣式 */
.search-bar-assignment {
  position: relative;
  margin-bottom: 12px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  opacity: 0.5;
}

.search-input-assignment {
  width: 100%;
  padding: 10px 36px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.search-input-assignment:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--color-gold-muted);
}

.search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #888;
  font-size: 14px;
  cursor: pointer;
}

.warning-text { font-size: 11px; color: #ff4d4f; margin-left: 8px; font-weight: normal; }

.role-card.is-excluded {
  opacity: 0.3;
  filter: grayscale(1);
}

/* Role Grid styles */
.role-grid-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.role-group {
  scroll-margin-top: 100px;
}

.group-header {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 12px;
  border-left: 3px solid currentColor;
  padding-left: 8px;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.role-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 10px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-card:hover { background: rgba(255,255,255,0.08); }

.role-card.is-selected {
  background: rgba(201, 168, 76, 0.2);
  border-color: var(--color-gold);
  box-shadow: 0 0 10px rgba(201, 168, 76, 0.3);
}

.role-card-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.r-img { width: 100%; height: 100%; object-fit: contain; }
.r-emoji { font-size: 24px; }

.role-card-name {
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

/* Footer styles */
.action-footer {
  display: flex;
  gap: 10px;
  margin-top: 30px;
}

.action-footer button { flex: 1; padding: 12px; }

/* Existing preserved styles */
.info-banner {
  background: rgba(201, 168, 76, 0.1);
  border-radius: 10px;
  padding: 10px 16px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.counts-editor { display: flex; flex-direction: column; gap: 16px; margin-bottom: 30px; }
.count-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.type-info { display: flex; align-items: center; gap: 10px; flex: 1; }
.type-dot { width: 8px; height: 8px; border-radius: 50%; }
.type-label { font-size: 14px; font-weight: 600; }
.count-controls { display: flex; align-items: center; background: rgba(0,0,0,0.2); border-radius: 20px; padding: 2px; }
.count-controls button { width: 32px; height: 32px; border-radius: 50%; border: none; background: none; color: white; font-size: 18px; cursor: pointer; }
.count-val { width: 40px; text-align: center; font-weight: 700; font-size: 16px; }

.config-footer { text-align: center; }
.total-status { font-size: 12px; color: var(--color-text-muted); margin-bottom: 12px; }
.total-status.is-match { color: var(--color-gold); font-weight: bold; }
.start-btn { width: 100%; padding: 14px; }

.preview-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.preview-title { font-family: var(--font-title); font-size: 14px; color: var(--color-gold-muted); }
.preview-list { background: rgba(0,0,0,0.15); border-radius: 12px; padding: 12px; margin-bottom: 20px; }
.preview-item { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 8px; }
.p-name { font-weight: 600; width: 80px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
.p-divider { color: var(--color-text-muted); }
.p-role { font-weight: 700; }
.p-role.townsfolk { color: var(--color-townsfolk); }
.p-role.outsider  { color: var(--color-outsider); }
.p-role.minion    { color: var(--color-minion); }
.p-role.demon     { color: var(--color-demon); }

.bluff-list { display: flex; justify-content: space-around; gap: 8px; }
.bluff-item { font-size: 12px; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 4px; color: var(--color-townsfolk); border: 1px solid rgba(74, 155, 212, 0.2); }

.divider { display: flex; align-items: center; margin: 16px 0; font-size: 11px; color: var(--color-text-muted); }
.divider::before, .divider::after { content: ''; flex: 1; border-top: 1px solid rgba(255,255,255,0.08); }
.divider span { padding: 0 10px; }

.preview-actions { display: flex; gap: 10px; }
.preview-actions button { flex: 1; }
</style>
