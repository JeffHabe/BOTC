<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="assignment-panel panel animate-slide-up">
      <div class="panel-header">
        <span class="panel-icon">🎲</span>
        <h2 class="panel-title">{{ panelTitle }}</h2>
        <div class="step-indicator">Step {{ currentStepNum }} / 6</div>
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

          <div class="collapsible-header" @click="isPresetExpanded = !isPresetExpanded">
            <span class="header-text">📋 角色池配置 & 預設</span>
            <span class="header-toggle">{{ isPresetExpanded ? '收起 ▲' : '展開 ▼' }}</span>
          </div>

          <div v-if="isPresetExpanded" class="collapsible-body animate-slide-down">
            <div class="info-banner">
              <span class="info-icon">ℹ️</span>
              <span><strong>角色池：</strong> 勾選的角色將參與隨機分派。未勾選的角色將被排除。</span>
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
                <div class="preset-actions">
                  <button v-if="activePresetId" class="btn-icon" @click="updatePreset" title="儲存變更">💾</button>
                  <button class="btn-icon" @click="showSaveModal = true" title="另存新檔">📁</button>
                  <button v-if="activePresetId" class="btn-icon" @click="exportPreset(activePresetId)" title="匯出預設 (複製)">📤</button>
                  <button class="btn-icon" @click="showImportModal = true" title="匯入預設">📥</button>
                  <button v-if="activePresetId" class="btn-icon text-danger" @click="deletePreset(activePresetId)" title="刪除預設">🗑️</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 匯入預設模態框 -->
          <div v-if="showImportModal" class="mini-modal">
            <div class="modal-content">
              <h4>匯入角色池配置</h4>
              <textarea v-model="importString" placeholder="請貼上匯出代碼..." class="import-textarea"></textarea>
              <div class="modal-btns">
                <button @click="showImportModal = false">取消</button>
                <button class="primary" @click="handleImport">確認匯入</button>
              </div>
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
            <input 
              v-model="searchQuery" 
              placeholder="搜尋角色名稱..." 
              class="search-input-assignment" 
              @keyup.enter="handleSearchEnter"
            />
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
              @click="handleSelectNext"
            >
              下一步 →
            </button>
          </div>

          <div class="search-bar-assignment">
            <span class="search-icon">🔍</span>
            <input 
              v-model="searchQuery" 
              placeholder="快速搜尋角色..." 
              class="search-input-assignment" 
              @keyup.enter="handleSearchEnter"
            />
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
                     :id="'role-item-' + role.id"
                     class="role-card"
                     :class="{ 'is-selected': isRoleSelected(role.id) }"
                     @click="toggleRoleSelection(role)"
                     @touchstart="handlePressStart(role)"
                     @touchend="handlePressEnd"
                     @mousedown="handlePressStart(role)"
                     @mouseup="handlePressEnd">
                  <div class="role-card-icon">
                    <img v-if="role.image" :src="role.image" class="r-img" />
                    <span v-else class="r-emoji">{{ getRoleTypeEmoji(role.role_type) }}</span>
                  </div>
                  <div class="role-card-name">{{ (role as any).displayName || role.name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 步驟 3.5: 酒鬼認知選擇 -->
        <div v-else-if="step === 'drunk'" class="step-drunk">
          <div class="action-footer top-actions compact">
            <button class="btn-ghost btn-xs" @click="step = 'select'">← 返回</button>
            <div class="step-hint">請為酒鬼選擇一個認知角色</div>
            <button class="btn-primary btn-xs" :disabled="!drunkFakeRoleId" @click="selectDrunkFake(drunkFakeRoleId!)">
              下一步 →
            </button>
          </div>
          
          <div class="search-bar-assignment">
            <span class="search-icon">🔍</span>
            <input 
              v-model="searchQuery" 
              placeholder="搜尋認知角色..." 
              class="search-input-assignment" 
              @keyup.enter="($event.target as HTMLInputElement).blur()"
            />
          </div>

          <div class="role-grid-container">
            <div v-if="availableDrunkFakes.length === 0" class="empty-pool-hint">
              無可用鎮民角色 (可能已全被選入玩家角色)
            </div>
            <div class="role-group">
              <div class="group-header" style="color: var(--color-townsfolk)">可選鎮民角色 (不在場)</div>
              <div class="role-grid">
                <div v-for="role in availableDrunkFakes" 
                     :key="role.id" 
                     :id="'role-item-' + role.id"
                     class="role-card"
                     :class="{ 'is-selected': drunkFakeRoleId === role.id }"
                     @click="selectDrunkFake(role.id)">
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

        <!-- 步驟 3.6: 提線木偶認知選擇 -->
        <div v-else-if="step === 'marionette'" class="step-drunk">
          <div class="action-footer top-actions compact">
            <button class="btn-ghost btn-xs" @click="hasDrunk ? (step = 'drunk') : (step = 'select')">← 返回</button>
            <div class="step-hint">請為提線木偶選擇一個認知角色</div>
            <button class="btn-primary btn-xs" :disabled="!marionetteFakeRoleId" @click="selectMarionetteFake(marionetteFakeRoleId!)">
              下一步 →
            </button>
          </div>
          
          <div class="search-bar-assignment">
            <span class="search-icon">🔍</span>
            <input 
              v-model="searchQuery" 
              placeholder="搜尋認知角色..." 
              class="search-input-assignment" 
              @keyup.enter="($event.target as HTMLInputElement).blur()"
            />
          </div>

          <div class="role-grid-container">
            <div v-if="availableMarionetteFakes.length === 0" class="empty-pool-hint">
              無可用善良角色 (可能已全被選入玩家角色)
            </div>
            <div class="role-group">
              <div class="group-header" style="color: var(--color-townsfolk)">可選善良角色 (不在場)</div>
              <div class="role-grid">
                <div v-for="role in availableMarionetteFakes" 
                     :key="role.id" 
                     :id="'role-item-' + role.id"
                     class="role-card"
                     :class="{ 'is-selected': marionetteFakeRoleId === role.id }"
                     @click="selectMarionetteFake(role.id)">
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
            <input 
              v-model="searchQuery" 
              placeholder="搜尋虛張角色..." 
              class="search-input-assignment" 
              @keyup.enter="handleSearchEnter"
            />
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
                     :id="'role-item-' + role.id"
                     class="role-card"
                     :class="{ 'is-selected': isBluffSelected(role.id) }"
                     @click="toggleBluffSelection(role.id)"
                     @touchstart="handlePressStart(role)"
                     @touchend="handlePressEnd"
                     @mousedown="handlePressStart(role)"
                     @mouseup="handlePressEnd">
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
        <div v-else-if="step === 'preview'" class="step-preview">
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
            <button class="btn-secondary" @click="startLottery">🎡 輪盤抽獎模式</button>
            <button class="btn-primary" @click="confirmAssignment">✅ 直接指派</button>
          </div>
        </div>

        <!-- 步驟 5: 輪盤抽獎 -->
        <div v-else-if="step === 'draw'" class="step-draw">
          <div class="preview-header">
            <button class="btn-ghost btn-sm" @click="step = 'preview'">← 返回預覽</button>
            <h3 class="preview-title">玩家抽取角色</h3>
          </div>

          <div class="draw-grid">
            <div v-for="(player, index) in gameStore.players" 
                 :key="player.id" 
                 class="draw-player-card"
                 :class="{ 'is-drawn': drawnPlayerIds.includes(player.id) }"
                 @click="!drawnPlayerIds.includes(player.id) && openWheel(player.id)">
              <div class="player-avatar">
                <span class="player-index-badge">{{ index + 1 }}</span>
                <span class="avatar-icon">👤</span>
                <div v-if="drawnPlayerIds.includes(player.id)" class="drawn-check">✅</div>
              </div>
              <div class="player-info">
                <div class="player-name">{{ player.name }}</div>
                <div v-if="drawnPlayerIds.includes(player.id)" class="drawn-status">
                  已完成抽獎
                </div>
              </div>
            </div>
          </div>

          <div class="draw-footer" v-if="drawnPlayerIds.length === totalPlayers">
            <button class="btn-primary confirm-all-btn" @click="finishLottery">查看最終分配結果 →</button>
          </div>

          <!-- 輪盤動畫 Overlay -->
          <div v-if="isSpinning || showResultModal || showReadyModal" class="wheel-overlay">
            <!-- 準備抽獎介面 -->
            <div v-if="showReadyModal" class="ready-modal animate-scale-up">
              <div class="ready-header">準備抽取角色</div>
              <div class="ready-player-name">{{ spinningPlayerName }}</div>
              <div class="ready-hint">請按下按鈕開始隨機篩選您的命運</div>
              <button class="btn-primary start-draw-btn" @click="startActualDraw">開始抽獎</button>
            </div>

            <!-- 全角色閃爍選擇器 -->
            <div v-if="isSpinning" class="flicker-container">
              <div class="flicker-grid">
                <div v-for="role in fullPoolCharacters" 
                     :key="role.id" 
                     class="flicker-item"
                     :class="{ 'is-highlighted': isIdMatch(activeFlickerId, role.id) }">
                  <img v-if="role.image" :src="role.image || undefined" class="flicker-token" />
                  <div v-else class="flicker-placeholder">👤</div>
                </div>
              </div>
              <div class="flicker-scanline"></div>
              <div class="flicker-status">
                從 {{ fullPoolCharacters.length }} 個劇本角色中篩選命運...
              </div>
              <div class="spinning-text">正在為 {{ spinningPlayerName }} 抽取角色...</div>
            </div>

            <div v-if="showResultModal" class="result-modal animate-scale-up">
              <div class="result-header">抽取結果</div>
              <div class="result-body">
                <div class="result-token-wrapper">
                  <div class="token-glow"></div>
                  <img v-if="getCharacterById(spinningResultId!)?.image" 
                       :src="getCharacterById(spinningResultId!)?.image || undefined" 
                       class="result-token-img" />
                  <span v-else class="result-token-placeholder">👤</span>
                </div>
                <div class="result-role-name">{{ getRoleName(spinningResultId!) }}</div>
                <div class="result-role-desc">您的角色已經準備就緒</div>
              </div>
              <button class="btn-primary" @click="closeResult">確認</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 角色詳情彈窗 -->
    <CharacterDetailOverlay 
      v-if="longPressChar" 
      :character="longPressChar" 
      @close="longPressChar = null" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch, nextTick } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { useScriptStore } from '../stores/scriptStore'
import type { CharacterDef } from '../types'
import { ROLE_TYPE_COLOR } from '../types'
import CharacterDetailOverlay from './CharacterDetailOverlay.vue'

const uiStore = useUIStore()
const gameStore = useGameStore()
const scriptStore = useScriptStore()

// 狀態管理
type Step = 'pool' | 'config' | 'select' | 'drunk' | 'marionette' | 'bluff' | 'preview' | 'draw'
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
const showImportModal = ref(false)
const importString = ref('')
const isPresetExpanded = ref(false)

// 抽獎與酒鬼邏輯
const drunkFakeRoleId = ref<string | null>(null)
const marionetteFakeRoleId = ref<string | null>(null)
const drawingResults = reactive<Record<string, string>>({}) // player_id -> role_id
const isSpinning = ref(false)
const spinningPlayerId = ref<string | null>(null)
const spinningResultId = ref<string | null>(null)
const showResultModal = ref(false)
const showReadyModal = ref(false)
const activeFlickerId = ref<string | null>(null)

const fullPoolCharacters = computed(() => {
  if (!gameStore.script) return []
  const excluded = new Set(excludedPoolIds.value)
  const validTypes = new Set(['townsfolk', 'outsider', 'minion', 'demon'])
  return gameStore.script.characters.filter(c => {
    const cType = c.role_type.trim().toLowerCase()
    return validTypes.has(cType) && !excluded.has(c.id)
  })
})

const drawnPlayerIds = computed(() => Object.keys(drawingResults))

const hasDrunk = computed(() => selectedRoleIds.value.includes('drunk'))
const hasMarionette = computed(() => selectedRoleIds.value.includes('marionette'))

const lotteryPool = computed(() => {
  if (!gameStore.script) return []
  
  // 基礎池：已選中的角色 ID
  let ids = [...selectedRoleIds.value]
  
  // 如果有酒鬼，將「酒鬼」替換為「偽裝角色」
  if (hasDrunk.value && drunkFakeRoleId.value) {
    const drunkIdx = ids.indexOf('drunk')
    if (drunkIdx > -1) {
      ids.splice(drunkIdx, 1, drunkFakeRoleId.value)
    }
  }

  // 如果有提線木偶，將「提線木偶」替換為「認知角色」
  if (hasMarionette.value && marionetteFakeRoleId.value) {
    const marionetteIdx = ids.indexOf('marionette')
    if (marionetteIdx > -1) {
      ids.splice(marionetteIdx, 1, marionetteFakeRoleId.value)
    }
  }
  
  // 排除已經被抽走的 ID
  const drawnRoleIds = Object.values(drawingResults)
  return ids.filter(id => !drawnRoleIds.includes(id))
})

const counts = reactive<Record<string, number>>({
  Townsfolk: 0,
  Outsider: 0,
  Minion: 0,
  Demon: 0
})

const selectedRoleIds = ref<string[]>([])
const selectedBluffIds = ref<string[]>([])
const searchQuery = ref('') // 新增搜尋關鍵字

// 長按顯示詳情邏輯
const longPressChar = ref<CharacterDef | null>(null)
let pressTimer: any = null

function handlePressStart(char: CharacterDef) {
  clearTimeout(pressTimer)
  pressTimer = setTimeout(() => {
    longPressChar.value = char
  }, 500) // 500ms 觸發長按
}

function handlePressEnd() {
  clearTimeout(pressTimer)
}

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
    drunk: '3.5 酒鬼偽裝',
    marionette: '3.6 木偶偽裝',
    bluff: '4. 挑選惡魔虛張',
    preview: '5. 最終預覽',
    draw: '6. 輪盤抽獎'
  }
  return titles[step.value]
})
const currentStepNum = computed(() => {
  const map: Record<Step, number> = { pool: 1, config: 2, select: 3, drunk: 3, marionette: 3, bluff: 4, preview: 5, draw: 6 }
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

function exportPreset(id: string) {
  const p = poolPresets.value.find(p => p.id === id)
  if (!p) return
  
  // 匯出關鍵資料
  const exportData = {
    name: p.name,
    script_id: p.script_id,
    excluded_ids: p.excluded_ids
  }
  
  try {
    // 處理中文編碼
    const str = btoa(encodeURIComponent(JSON.stringify(exportData)))
    navigator.clipboard.writeText(str).then(() => {
      alert('✅ 匯出成功！已將代碼複製到剪貼簿，請分享給其他說書人。')
    })
  } catch (e) {
    alert('❌ 匯出失敗')
  }
}

function handleImport() {
  if (!importString.value.trim()) return
  
  try {
    // 解碼 Base64
    const jsonStr = decodeURIComponent(atob(importString.value.trim()))
    const data = JSON.parse(jsonStr)
    
    if (!data.excluded_ids || !Array.isArray(data.excluded_ids)) {
      throw new Error('無效資料格式')
    }

    const newPreset: PoolPreset = {
      id: Date.now().toString(),
      name: (data.name || '匯入配置') + ' (匯入)',
      script_id: data.script_id || gameStore.script?.id || '',
      excluded_ids: data.excluded_ids
    }

    poolPresets.value.push(newPreset)
    localStorage.setItem('botc-pool-presets', JSON.stringify(poolPresets.value))
    
    importString.value = ''
    showImportModal.value = false
    alert('✅ 匯入成功！您可以在預設清單中選取它了。')
  } catch (e) {
    console.error(e)
    alert('❌ 匯入失敗，請確認代碼是否完整且正確。')
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
      const cType = c.role_type.trim().toLowerCase()
      const tType = t.key.trim().toLowerCase()
      const matchesType = cType === tType
      const matchesQuery = !query || c.name.toLowerCase().includes(query)
      return matchesType && matchesQuery
    })
  }))
})

const groupedCharacters = computed(() => {
  if (!gameStore.script) return []
  const excluded = new Set(excludedPoolIds.value)
  const query = searchQuery.value.trim().toLowerCase()
  
  return roleTypes.map(t => {
    let list: any[] = []
    
    gameStore.script!.characters.forEach(c => {
      const cType = c.role_type.trim().toLowerCase()
      const tType = t.key.trim().toLowerCase()
      const matchesType = cType === tType && !excluded.has(c.id)
      const matchesQuery = !query || c.name.toLowerCase().includes(query)
      
      if (matchesType && matchesQuery) {
        // 如果是「村夫」，則提供 3 個可選項
        if (c.name === '村夫') {
          list.push({ ...c, id: c.id })
          list.push({ ...c, id: c.id + '::COPY::2', displayName: '村夫 (2)' })
          list.push({ ...c, id: c.id + '::COPY::3', displayName: '村夫 (3)' })
        } else {
          list.push(c)
        }
      }
    })
    
    return {
      type: t.key,
      label: t.label,
      color: t.color,
      list
    }
  })
})

const availableBluffPool = computed(() => {
  if (!gameStore.script) return []
  const usedIds = new Set(selectedRoleIds.value)
  const excluded = new Set(excludedPoolIds.value)
  const query = searchQuery.value.trim().toLowerCase()
  
  // 虛張從「在池子內」且「未被指派給玩家」的村民與外來者中選擇
  return gameStore.script.characters.filter(c => {
    const isGoodType = c.role_type === 'Townsfolk' || c.role_type === 'Outsider'
    const isNotUsed = !usedIds.has(c.id) && !excluded.has(c.id) && c.id !== drunkFakeRoleId.value
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
    const isNotUsed = !usedIds.has(c.id) && !excluded.has(c.id) && c.id !== drunkFakeRoleId.value
    return isGoodType && isNotUsed
  })
  return new Set(pool.map(c => c.id))
})

watch(validBluffIds, (validSet) => {
  // 當可用名單改變時，過濾掉已經無效的選項，避免幽靈佔位
  selectedBluffIds.value = selectedBluffIds.value.filter(id => validSet.has(id))
})

function scriptTypeTotal(type: string) {
  const targetType = type.toLowerCase()
  return gameStore.script?.characters.filter(c => c.role_type.toLowerCase() === targetType).length || 0
}

function poolTypeCount(type: string) {
  if (!gameStore.script) return 0
  const targetType = type.toLowerCase()
  const excluded = new Set(excludedPoolIds.value)
  return gameStore.script.characters.filter(c => 
    c.role_type.toLowerCase() === targetType && !excluded.has(c.id)
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
  drunkFakeRoleId.value = null
  step.value = 'select'
}

/**
 * 處理搜尋框按下 Enter：跳轉到第一個符合條件的角色
 */
function handleSearchEnter() {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return

  let targetId: string | null = null

  // 1. 找到第一個匹配的角色 ID
  if (step.value === 'pool') {
    for (const group of fullGroupedCharacters.value) {
      if (group.list.length > 0) {
        targetId = group.list[0].id
        break
      }
    }
  } else if (step.value === 'select') {
    for (const group of groupedCharacters.value) {
      if (group.list.length > 0) {
        targetId = group.list[0].id
        break
      }
    }
  } else if (step.value === 'drunk') {
    if (availableDrunkFakes.value.length > 0) {
      targetId = availableDrunkFakes.value[0].id
    }
  } else if (step.value === 'marionette') {
    if (availableMarionetteFakes.value.length > 0) {
      targetId = availableMarionetteFakes.value[0].id
    }
  } else if (step.value === 'bluff') {
    if (availableBluffPool.value.length > 0) {
      targetId = availableBluffPool.value[0].id
    }
  }

  if (targetId) {
    const finalId = targetId
    // 1. 保留搜尋文字
    
    // 2. 核心修正：收起手機鍵盤
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    
    // 3. 等待 DOM 更新後捲動到目標
    nextTick(() => {
      const el = document.getElementById('role-item-' + finalId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // 4. 加入一個暫時的閃爍效果
        el.classList.add('jump-highlight')
        setTimeout(() => el.classList.remove('jump-highlight'), 2000)
      }
    })
  }
}

function handleSelectNext() {
  searchQuery.value = '' // 切換步驟時清除搜尋內容，避免看不到角色
  if (hasDrunk.value) {
    step.value = 'drunk'
  } else if (hasMarionette.value) {
    step.value = 'marionette'
  } else {
    step.value = 'bluff'
  }
}

const availableDrunkFakes = computed(() => {
  if (!gameStore.script) return []
  const query = searchQuery.value.toLowerCase()
  const used = new Set(selectedRoleIds.value)
  const excluded = new Set(excludedPoolIds.value) // 第一步排除的角色
  
  return gameStore.script.characters.filter(c => {
    // 必須是鎮民，且未被指派給玩家，且必須在第一步的角色池中（未被排除）
    const isInPool = !excluded.has(c.id)
    const isGood = c.role_type === 'Townsfolk' && !used.has(c.id) && isInPool
    const matchesQuery = !query || c.name.toLowerCase().includes(query)
    // 不能和提線木偶的假角色重複
    const notMarionetteFake = c.id !== marionetteFakeRoleId.value
    return isGood && matchesQuery && notMarionetteFake
  })
})

function selectDrunkFake(id: string) {
  drunkFakeRoleId.value = id
  if (hasMarionette.value) {
    step.value = 'marionette'
  } else {
    step.value = 'bluff'
  }
}

const availableMarionetteFakes = computed(() => {
  if (!gameStore.script) return []
  const query = searchQuery.value.toLowerCase()
  const used = new Set(selectedRoleIds.value)
  const excluded = new Set(excludedPoolIds.value)
  
  return gameStore.script.characters.filter(c => {
    const isInPool = !excluded.has(c.id)
    const isGood = (c.role_type === 'Townsfolk' || c.role_type === 'Outsider') && !used.has(c.id) && isInPool
    const matchesQuery = !query || c.name.toLowerCase().includes(query)
    const notDrunkFake = c.id !== drunkFakeRoleId.value
    return isGood && matchesQuery && notDrunkFake
  })
})

function selectMarionetteFake(id: string) {
  marionetteFakeRoleId.value = id
  step.value = 'bluff'
}



function startLottery() {
  // 初始化抽獎狀態
  for (const key in drawingResults) delete drawingResults[key]
  step.value = 'draw'
}

const spinningPlayerName = computed(() => {
  const p = gameStore.players.find(p => p.id === spinningPlayerId.value)
  return p ? p.name : ''
})

function openWheel(playerId: string) {
  spinningPlayerId.value = playerId
  showReadyModal.value = true
}

// 驗證某個抽獎狀態是否能保證提線木偶與惡魔相鄰
function isValidDrawState(testResults: Record<string, string>, remaining: string[]): boolean {
  if (!hasMarionette.value) return true // 沒有提線木偶則無限制

  const players = gameStore.players
  const N = players.length
  
  let mRoleId = 'marionette'
  if (marionetteFakeRoleId.value) mRoleId = marionetteFakeRoleId.value

  let dSeat = -1
  let mSeat = -1
  
  for (let s = 0; s < N; s++) {
    const roleId = testResults[players[s].id]
    if (!roleId) continue
    if (roleId === mRoleId) {
      mSeat = s
    } else {
      const char = getCharacterById(roleId)
      if (char?.role_type.toLowerCase() === 'demon') dSeat = s
    }
  }

  const hasDInRemaining = remaining.some(id => getCharacterById(id)?.role_type.toLowerCase() === 'demon')
  const hasMInRemaining = remaining.includes(mRoleId)

  const isAdj = (s1: number, s2: number) => (s1 === (s2 + 1) % N) || (s1 === (s2 - 1 + N) % N)
  const isSeatEmpty = (s: number) => !testResults[players[s].id]

  // 兩者皆已抽出
  if (!hasDInRemaining && !hasMInRemaining) {
    return isAdj(dSeat, mSeat)
  }

  // 抽出惡魔，剩下木偶
  if (!hasDInRemaining && hasMInRemaining) {
    return isSeatEmpty((dSeat + 1) % N) || isSeatEmpty((dSeat - 1 + N) % N)
  }

  // 抽出木偶，剩下惡魔
  if (hasDInRemaining && !hasMInRemaining) {
    return isSeatEmpty((mSeat + 1) % N) || isSeatEmpty((mSeat - 1 + N) % N)
  }

  // 兩者皆未抽出，必須保證場上至少還有「相鄰的兩個空位」
  for (let s = 0; s < N; s++) {
    if (isSeatEmpty(s) && isSeatEmpty((s + 1) % N)) {
      return true
    }
  }
  return false
}

function startActualDraw() {
  showReadyModal.value = false
  isSpinning.value = true
  
  const basePool = lotteryPool.value
  if (basePool.length === 0) return

  const curPlayerId = spinningPlayerId.value!

  // 動態過濾：只保留符合相鄰條件的角色
  const validPool = basePool.filter(roleId => {
    // 模擬將 roleId 分配給當前玩家
    const testResults = { ...drawingResults, [curPlayerId]: roleId }
    // 模擬剩餘池子
    const remaining = [...basePool]
    remaining.splice(remaining.indexOf(roleId), 1)

    return isValidDrawState(testResults, remaining)
  })

  // 從合法池中隨機抽取（防呆：如果沒有合法選項，就 fallback 抽原本的池子）
  const finalPool = validPool.length > 0 ? validPool : basePool
  const resultId = finalPool[Math.floor(Math.random() * finalPool.length)]

  const allChoices = fullPoolCharacters.value
  
  let count = 0
  const maxFlickers = 25 // 增加閃爍次數
  const flickerDelay = 70

  const runFlicker = () => {
    if (count < maxFlickers) {
      activeFlickerId.value = allChoices[Math.floor(Math.random() * allChoices.length)].id
      count++
      setTimeout(runFlicker, flickerDelay)
    } else {
      activeFlickerId.value = resultId
      setTimeout(() => {
        isSpinning.value = false
        spinningResultId.value = resultId
        showResultModal.value = true
        activeFlickerId.value = null
      }, 600)
    }
  }

  runFlicker()
}

function closeResult() {
  if (spinningPlayerId.value && spinningResultId.value) {
    drawingResults[spinningPlayerId.value] = spinningResultId.value
  }
  showResultModal.value = false
  spinningPlayerId.value = null
  spinningResultId.value = null
}

function getRoleName(id: string) {
  const char = getCharacterById(id)
  return char ? char.name : id
}

function getCharacterById(id: string) {
  if (!id) return null
  // 處理村夫副本 ID：從 "villager::COPY::2" 還原成 "villager"
  const realId = id.split('::COPY::')[0]
  
  // 優先從當前劇本找，找不到則從原始全域列表找
  return gameStore.script?.characters.find(c => c.id === realId) || 
         scriptStore.rawCharacterList.find(c => c.id === realId)
}

function isIdMatch(id1: string | null, id2: string | null) {
  if (!id1 || !id2) return false
  return id1.split('::COPY::')[0] === id2.split('::COPY::')[0]
}

async function finishLottery() {
  // 將抽獎結果轉換為實際指派
  // 注意：如果抽中酒鬼的認知角色，實際要指派「酒鬼」給該玩家
  const finalPlan = gameStore.players.map(p => {
    let roleId = drawingResults[p.id]
    
    // 酒鬼邏輯：如果抽中認知角色，則該玩家實際是酒鬼
    if (hasDrunk.value && roleId === drunkFakeRoleId.value) {
      roleId = 'drunk'
    }
    
    // 提線木偶邏輯：如果抽中認知角色，則該玩家實際是提線木偶
    if (hasMarionette.value && roleId === marionetteFakeRoleId.value) {
      roleId = 'marionette'
    }
    
    const char = getCharacterById(roleId)
    return { player_id: p.id, role: char || null }
  })

  // 更新預覽列表並跳回預覽頁面
  previewAssignments.value = finalPlan
  step.value = 'preview'
}

function currentTypeCount(type: string) {
  if (!gameStore.script) return 0
  const targetType = type.trim().toLowerCase()
  return selectedRoleIds.value.filter(id => {
    const char = getCharacterById(id)
    return char?.role_type.trim().toLowerCase() === targetType
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
      !isRoleSelected(c.id) && !excluded.has(c.id)
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



function createAdjacencyPlan(baseRoleIds: string[]): string[] {
  let pool = [...baseRoleIds]
  let finalPool: string[] = []
  
  // 找出提線木偶的目標 ID（可能是原 ID，也可能是替換後的認知角色 ID）
  let mRoleId = 'marionette'
  if (hasMarionette.value) {
    if (marionetteFakeRoleId.value && pool.includes(marionetteFakeRoleId.value)) {
      mRoleId = marionetteFakeRoleId.value
    } else if (pool.includes('marionette')) {
      mRoleId = 'marionette'
    }
  }

  const hasM = pool.includes(mRoleId)
  const demonId = pool.find(id => {
    const char = getCharacterById(id)
    return char?.role_type.toLowerCase() === 'demon'
  })

  // 若同時存在提線木偶與惡魔，強制綁定座位
  if (hasMarionette.value && hasM && demonId) {
    pool.splice(pool.indexOf(mRoleId), 1)
    pool.splice(pool.indexOf(demonId), 1)

    pool.sort(() => Math.random() - 0.5)

    const totalCount = pool.length + 2
    const demonPos = Math.floor(Math.random() * totalCount)
    // 隨機決定木偶在惡魔左邊或右邊（處理陣列環狀邊界）
    const offset = Math.random() < 0.5 ? 1 : -1
    const marionettePos = (demonPos + offset + totalCount) % totalCount

    finalPool = new Array(totalCount)
    finalPool[demonPos] = demonId
    finalPool[marionettePos] = mRoleId

    let pIdx = 0
    for (let i = 0; i < totalCount; i++) {
      if (!finalPool[i]) {
        finalPool[i] = pool[pIdx]
        pIdx++
      }
    }
  } else {
    // 正常隨機洗牌
    finalPool = [...pool].sort(() => Math.random() - 0.5)
  }
  return finalPool
}

function generatePlan() {
  if (!gameStore.script) return
  
  const bluffs = selectedBluffIds.value.map(id => getCharacterById(id)).filter(Boolean) as CharacterDef[]
  
  const finalPoolIds = createAdjacencyPlan(selectedRoleIds.value)
  
  previewAssignments.value = gameStore.players.map((p, i) => ({
    player_id: p.id,
    role: getCharacterById(finalPoolIds[i]) || null
  }))
  
  previewBluffs.value = bluffs
  step.value = 'preview'
}

function playerName(id: string) {
  return gameStore.players.find(p => p.id === id)?.name || id
}

async function confirmAssignment() {
  if (!gameStore.script) return

  // 為了符合用戶需求：酒鬼與提線木偶要顯示認知角色的頭像
  // 我們在正式指派時，將玩家的角色替換為「認知角色」
  // 但會額外加上一個對應的提示詞供說書人辨識
  const assignments = previewAssignments.value.map(a => {
    if (a.role?.id === 'drunk' && drunkFakeRoleId.value) {
      const fakeRole = getCharacterById(drunkFakeRoleId.value)
      return { player_id: a.player_id, role: fakeRole || a.role }
    }
    if (a.role?.id === 'marionette' && marionetteFakeRoleId.value) {
      const fakeRole = getCharacterById(marionetteFakeRoleId.value)
      return { player_id: a.player_id, role: fakeRole || a.role }
    }
    return a
  })

  await gameStore.bulkAssignRoles(assignments, previewBluffs.value)
  
  // 自動添加酒鬼提示詞
  if (hasDrunk.value && drunkFakeRoleId.value) {
    const drunkEntry = previewAssignments.value.find(a => a.role?.id === 'drunk')
    const drunkChar = getCharacterById('drunk')
    const reminderText = drunkChar?.reminders?.[0] || '是酒鬼'
    const sourceName = drunkChar?.name || '酒鬼'
    
    if (drunkEntry) {
      setTimeout(async () => {
        await gameStore.addReminder(drunkEntry.player_id, reminderText, sourceName)
      }, 500)
    }
  }

  // 自動添加提線木偶提示詞
  if (hasMarionette.value && marionetteFakeRoleId.value) {
    const marionetteEntry = previewAssignments.value.find(a => a.role?.id === 'marionette')
    const marionetteChar = getCharacterById('marionette')
    const reminderText = marionetteChar?.reminders?.[0] || '是提線木偶'
    const sourceName = marionetteChar?.name || '提線木偶'
    
    if (marionetteEntry) {
      setTimeout(async () => {
        await gameStore.addReminder(marionetteEntry.player_id, reminderText, sourceName)
      }, 500)
    }
  }

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

/* Collapsible Section */
.collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.header-text {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-gold-muted);
}

.header-toggle {
  font-size: 11px;
  color: var(--color-text-muted);
}

.collapsible-body {
  margin-bottom: 20px;
}

/* Preset Manager */
.preset-manager {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #252731; /* 改為不透明深色 */
  padding: 12px;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}

.preset-label {
  font-size: 11px;
  color: var(--color-gold);
}

.preset-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preset-actions {
  display: flex;
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
.modal-content input, .mini-modal textarea {
  width: 100%;
  padding: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: white;
  border-radius: 8px;
  margin-bottom: 20px;
}
.import-textarea {
  height: 120px;
  font-family: monospace;
  font-size: 11px;
  resize: none;
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
  background: #2a251a; /* 改為不透明深色底 */
  border: 1px solid rgba(201, 168, 76, 0.3);
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

/* Lottery Draw Styles */
.step-draw {
  padding: 10px;
}

.draw-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 30px;
}

.draw-player-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.draw-player-card:active { transform: scale(0.95); }
.draw-player-card.is-drawn {
  background: rgba(46, 204, 113, 0.1);
  border-color: rgba(46, 204, 113, 0.3);
  cursor: default;
}

.player-avatar {
  width: 50px;
  height: 50px;
  background: rgba(0,0,0,0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.avatar-icon { font-size: 24px; opacity: 0.5; }

.player-index-badge {
  position: absolute;
  top: -6px;
  left: -6px;
  background: var(--color-gold);
  color: #000;
  font-size: 10px;
  font-weight: bold;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.drawn-check {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 16px;
}

.player-name { font-size: 13px; font-weight: 600; text-align: center; }
.drawn-status { font-size: 11px; color: var(--color-gold-muted); margin-top: 2px; }

.wheel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(8px);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wheel-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
}

.flicker-container {
  width: 90%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  position: relative;
}

.flicker-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  padding: 20px;
  background: rgba(0,0,0,0.6);
  border-radius: 24px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  width: 100%;
  max-height: 60vh;
  overflow-y: auto;
  /* 隱藏捲動條但保留功能 */
  scrollbar-width: none;
}
.flicker-grid::-webkit-scrollbar { display: none; }

.flicker-status {
  font-size: 12px;
  color: var(--color-gold-muted);
  margin-top: 10px;
  letter-spacing: 1px;
}

.flicker-item {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  opacity: 0.2;
  transform: scale(0.85);
  transition: all 0.1s ease-out;
  background: rgba(255,255,255,0.05);
}

.flicker-item.is-highlighted {
  opacity: 1;
  transform: scale(1.1);
  box-shadow: 0 0 15px var(--color-gold);
  background: rgba(212,175,55,0.2);
  z-index: 10;
}

.flicker-token {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.flicker-placeholder { font-size: 20px; opacity: 0.5; }

.flicker-scanline {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: rgba(212,175,55,0.2);
  box-shadow: 0 0 10px var(--color-gold);
  pointer-events: none;
  animation: scan 3s linear infinite;
}

@keyframes scan {
  from { transform: translateY(0); }
  to { transform: translateY(400px); }
}

.wheel-spinner {
  width: 240px;
  height: 240px;
  border: 8px solid var(--color-gold);
  border-radius: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #1a1b23;
}

.wheel-slot {
  position: absolute;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  transform-origin: center center;
  white-space: nowrap;
}

/* 簡單排列轉盤文字 */
.wheel-slot:nth-child(1) { transform: rotate(0deg) translateY(-80px); }
.wheel-slot:nth-child(2) { transform: rotate(45deg) translateY(-80px); }
.wheel-slot:nth-child(3) { transform: rotate(90deg) translateY(-80px); }
.wheel-slot:nth-child(4) { transform: rotate(135deg) translateY(-80px); }
.wheel-slot:nth-child(5) { transform: rotate(180deg) translateY(-80px); }
.wheel-slot:nth-child(6) { transform: rotate(225deg) translateY(-80px); }
.wheel-slot:nth-child(7) { transform: rotate(270deg) translateY(-80px); }
.wheel-slot:nth-child(8) { transform: rotate(315deg) translateY(-80px); }

.wheel-pointer {
  font-size: 32px;
  color: var(--color-gold);
  margin-top: -20px;
  z-index: 2;
}

.spinning-text { color: white; font-size: 16px; font-weight: bold; }

.result-modal {
  background: #1a1b23;
  padding: 40px 30px;
  border-radius: 32px;
  border: 1px solid rgba(212, 175, 55, 0.5);
  box-shadow: 0 0 50px rgba(0,0,0,0.5), 0 0 20px rgba(212, 175, 55, 0.2);
  text-align: center;
  width: 85%;
  max-width: 340px;
}

.result-header { font-size: 14px; color: var(--color-text-muted); margin-bottom: 24px; text-transform: uppercase; letter-spacing: 2px; }
.role-card.jump-highlight {
  animation: jump-blink 1s ease-in-out infinite;
  box-shadow: 0 0 20px var(--color-gold);
  z-index: 10;
}

@keyframes jump-blink {
  0%, 100% { border-color: rgba(201, 168, 76, 0.3); transform: scale(1); }
  50% { border-color: var(--color-gold); transform: scale(1.05); background: rgba(201, 168, 76, 0.2); }
}

.result-token-wrapper {
  position: relative;
  width: 140px;
  height: 140px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.token-glow {
  position: absolute;
  inset: -10px;
  background: radial-gradient(circle, rgba(212, 175, 55, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  animation: pulse-glow 2s infinite ease-in-out;
}

@keyframes pulse-glow {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.2); opacity: 0.6; }
}

.result-token-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 10px 15px rgba(0,0,0,0.5));
  z-index: 2;
}

.result-token-placeholder {
  font-size: 60px;
  opacity: 0.3;
}

.result-role-name { font-size: 32px; font-weight: bold; color: var(--color-gold); margin-bottom: 12px; }
.result-role-desc { font-size: 14px; color: #888; margin-bottom: 30px; }

/* Ready Modal Styles */
.ready-modal {
  background: #1a1b23;
  padding: 40px 30px;
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  width: 85%;
  max-width: 340px;
}

.ready-header { font-size: 14px; color: var(--color-text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 2px; }
.ready-player-name { font-size: 28px; font-weight: bold; color: white; margin-bottom: 20px; }
.ready-hint { font-size: 14px; color: #888; margin-bottom: 32px; line-height: 1.5; }
.start-draw-btn { width: 100%; padding: 16px; font-size: 18px; letter-spacing: 1px; }

.animate-spin { animation: spin 0.15s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.draw-footer { padding: 20px; }
.confirm-all-btn { width: 100%; padding: 16px; font-size: 16px; }

.step-drunk { padding: 10px; }
.step-hint { font-size: 13px; color: var(--color-gold-muted); flex: 1; text-align: center; }

.preview-actions { display: flex; gap: 10px; }
.preview-actions button { flex: 1; }
</style>
