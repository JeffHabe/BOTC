<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="assignment-panel panel animate-slide-up">
      <div class="panel-header">
        <span class="panel-icon">🎲</span>
        <h2 class="panel-title">{{ panelTitle }}</h2>
        <div class="step-indicator">Step {{ currentStepNum }} / 4</div>
        <button class="btn-icon reset-all-btn" @click="handleResetSetup" title="重新開始">🔄</button>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <div class="assignment-content">
        <!-- 步驟 1 (原步驟 3): 挑選具體角色 -->
        <div v-if="step === 'select'" class="step-select">
          <div class="action-footer top-actions compact">
            <button class="btn-ghost btn-xs" @click="uiStore.closePanel()">← 關閉面板</button>
            <button class="btn-secondary btn-xs" @click="autoFillRoles">🎲 隨機補齊</button>
            <button 
              class="btn-primary btn-xs" 
              :disabled="!isSelectionComplete"
              @click="handleSelectNext"
            >
              下一步 →
            </button>
          </div>



          <!-- 配置變動警告 -->
          <div v-if="setupWarnings.length > 0" class="setup-warning-banner animate-pulse-subtle">
            <div class="warning-header">
              <span class="warning-icon">⚠️</span>
              <strong>配置變動警告：</strong>
            </div>
            <div class="warning-list">
              <div v-for="w in setupWarnings" :key="w.id" class="warning-item">
                角色 <strong>【{{ w.name }}】</strong> 具有變更配置的能力：<span class="ability-tag">{{ w.match }}</span>
              </div>
            </div>
            <div class="warning-footer">挑選角色時請自行依此能力增減對應陣營角色數量。</div>
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

          <!-- 功能分類篩選 (Class Filter) -->
          <div class="class-filter-container">
            <button 
              v-for="cls in ['全部', '首夜', '每夜', '每夜*', '限一次', '特殊', '勝敗']" 
              :key="cls"
              class="class-filter-pill"
              :class="{ 'is-active': selectedClass === (cls === '全部' ? '' : cls) }"
              @click="selectedClass = (cls === '全部' ? '' : cls)"
            >
              {{ cls }}
            </button>
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
                     @contextmenu.prevent="showDetails(role)"
                     >
                  <div class="role-card-icon" :class="(role.role_type || '').toLowerCase()">
                    <img v-if="role.image" :src="role.image" class="r-img" />
                    <span v-else class="role-text-fallback">{{ role.name.charAt(0) }}</span>
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
                  <div class="role-card-icon townsfolk">
                    <img v-if="role.image" :src="role.image" class="r-img" />
                    <span v-else class="role-text-fallback">{{ role.name.charAt(0) }}</span>
                  </div>
                  <div class="role-card-name">{{ role.name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 步驟 3.6: 悟道者認知選擇 -->
        <div v-else-if="step === 'wudaozhe'" class="step-drunk">
          <div class="action-footer top-actions compact">
            <button class="btn-ghost btn-xs" @click="hasDrunk ? (step = 'drunk') : (step = 'select')">← 返回</button>
            <div class="step-hint">請為悟道者選擇一個認知角色</div>
            <button class="btn-primary btn-xs" :disabled="!wudaozheFakeRoleId" @click="selectWudaozheFake(wudaozheFakeRoleId!)">
              下一步 →
            </button>
          </div>
          
          <div class="search-bar-assignment">
            <span class="search-icon">🔍</span>
            <input 
              v-model="searchQuery" 
              placeholder="搜尋認知外來者..." 
              class="search-input-assignment" 
              @keyup.enter="($event.target as HTMLInputElement).blur()"
            />
          </div>

          <div class="role-grid-container">
            <div v-if="availableWudaozheFakes.length === 0" class="empty-pool-hint">
              無可用外來者角色 (可能已全被選入玩家角色)
            </div>
            <div class="role-group">
              <div class="group-header" style="color: var(--color-outsider)">可選外來者角色 (不在場)</div>
              <div class="role-grid">
                <div v-for="role in availableWudaozheFakes" 
                     :key="role.id" 
                     :id="'role-item-' + role.id"
                     class="role-card"
                     :class="{ 'is-selected': wudaozheFakeRoleId === role.id }"
                     @click="selectWudaozheFake(role.id)">
                  <div class="role-card-icon outsider">
                    <img v-if="role.image" :src="role.image" class="r-img" />
                    <span v-else class="role-text-fallback">{{ role.name.charAt(0) }}</span>
                  </div>
                  <div class="role-card-name">{{ role.name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 步驟 3.7: 瘋子認知選擇 (惡魔) -->
        <div v-else-if="step === 'lunatic'" class="step-drunk">
          <div class="action-footer top-actions compact">
            <button class="btn-ghost btn-xs" @click="hasWudaozhe ? (step = 'wudaozhe') : hasDrunk ? (step = 'drunk') : (step = 'select')">← 返回</button>
            <div class="step-hint">請為瘋子選擇一個認知惡魔</div>
            <button class="btn-primary btn-xs" :disabled="!lunaticFakeRoleId" @click="selectLunaticFake(lunaticFakeRoleId!)">
              下一步 →
            </button>
          </div>
          
          <div class="search-bar-assignment">
            <span class="search-icon">🔍</span>
            <input 
              v-model="searchQuery" 
              placeholder="搜尋惡魔角色..." 
              class="search-input-assignment" 
              @keyup.enter="($event.target as HTMLInputElement).blur()"
            />
          </div>

          <div class="role-grid-container">
            <div v-if="availableLunaticFakes.length === 0" class="empty-pool-hint">
              無可用惡魔角色
            </div>
            <div class="role-group">
              <div class="group-header" style="color: var(--color-demon)">可選惡魔角色</div>
              <div class="role-grid">
                <div v-for="role in availableLunaticFakes" 
                     :key="role.id" 
                     :id="'role-item-' + role.id"
                     class="role-card"
                     :class="{ 'is-selected': lunaticFakeRoleId === role.id }"
                     @click="selectLunaticFake(role.id)">
                  <div class="role-card-icon demon">
                    <img v-if="role.image" :src="role.image" class="r-img" />
                    <span v-else class="role-text-fallback">{{ role.name.charAt(0) }}</span>
                  </div>
                  <div class="role-card-name">{{ role.name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 步驟 3.8: 提線木偶認知選擇 -->
        <div v-else-if="step === 'marionette'" class="step-drunk">
          <div class="action-footer top-actions compact">
            <button class="btn-ghost btn-xs" @click="hasLunatic ? (step = 'lunatic') : hasWudaozhe ? (step = 'wudaozhe') : hasDrunk ? (step = 'drunk') : (step = 'select')">← 返回</button>
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
            <div v-for="group in groupedMarionetteFakes" :key="group.key" class="role-group">
              <div class="group-header" :style="{ color: group.color }">可選{{ group.label }}角色 (不在場)</div>
              <div class="role-grid">
                <div v-for="role in group.list" 
                     :key="role.id" 
                     :id="'role-item-' + role.id"
                     class="role-card"
                     :class="{ 'is-selected': marionetteFakeRoleId === role.id }"
                     @click="selectMarionetteFake(role.id)">
                  <div class="role-card-icon" :class="(role.role_type || '').toLowerCase()">
                    <img v-if="role.image" :src="role.image" class="r-img" />
                    <span v-else class="role-text-fallback">{{ role.name.charAt(0) }}</span>
                  </div>
                  <div class="role-card-name">{{ role.name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 步驟 4: 挑選惡魔偽裝 -->
        <div v-else-if="step === 'bluff'" class="step-bluff">
          <div class="action-footer top-actions compact">
            <button class="btn-ghost btn-xs" @click="hasMarionette ? (step = 'marionette') : hasLunatic ? (step = 'lunatic') : hasWudaozhe ? (step = 'wudaozhe') : hasDrunk ? (step = 'drunk') : (step = 'select')">← 選角色</button>
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
              placeholder="搜尋偽裝角色..." 
              class="search-input-assignment" 
              @keyup.enter="handleSearchEnter"
            />
            <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</button>
          </div>

          <div class="selection-status-bar sticky-tabs">
            <div class="type-pill" :class="{ 'is-done': selectedBluffIds.length === 3 }">
              惡魔偽裝角色 {{ selectedBluffIds.length }}/3
            </div>
            <div class="step-hint">（剩餘 {{ 3 - selectedBluffIds.length }} 個空位）</div>
          </div>

          <div class="role-grid-container">
            <div v-for="group in groupedBluffCharacters" :key="group.key" class="role-group">
              <div class="group-header" :style="{ color: group.color }">可選{{ group.label }}角色</div>
              <div class="role-grid">
                <!-- 只顯示未被選為玩家角色的角色 -->
                <div v-for="role in group.list" 
                     :key="role.id" 
                     :id="'role-item-' + role.id"
                     class="role-card"
                     :class="{ 'is-selected': isBluffSelected(role.id) }"
                     @click="toggleBluffSelection(role.id)"
                     @contextmenu.prevent="showDetails(role)"
                     >
                  <div class="role-card-icon" :class="(role.role_type || '').toLowerCase()">
                    <img v-if="role.image" :src="role.image" class="r-img" />
                    <span v-else class="role-text-fallback">{{ role.name.charAt(0) }}</span>
                  </div>
                  <div class="role-card-name">{{ role.name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 步驟 5: 預覽結果 -->
        <div v-else-if="step === 'preview'" class="step-preview">
          <div class="preview-header">
            <button class="btn-ghost btn-sm" @click="step = 'bluff'">← 返回修改</button>
            <h3 class="preview-title">預覽分配結果</h3>
          </div>

          <div class="preview-list">
            <div v-for="item in previewAssignments" :key="item.player_id" class="preview-item">
              <span class="p-name">{{ playerName(item.player_id) }}</span>
              <span class="p-divider">→</span>
              <span v-if="item.role" class="p-role" :class="(item.role.role_type || '').toLowerCase()">
                {{ item.role.name }}
              </span>
              <span v-else class="p-role none">未分配</span>
            </div>

            <div class="divider"><span>惡魔偽裝</span></div>
            <div class="bluff-list">
              <div v-for="(b, i) in previewBluffs" :key="i" class="bluff-item">
                <span v-if="b" class="b-role">{{ b.name }}</span>
                <span v-else class="b-role none">無偽裝</span>
              </div>
            </div>
          </div>

          <div class="preview-actions">
            <button class="btn-ghost" @click="generatePlan">🎲 重新洗牌</button>
            <button class="btn-secondary" @click="startLottery">🔮 輪盤抽獎</button>
            <button class="btn-primary" @click="confirmAssignment">✅ 直接指派</button>
          </div>
          <!-- 新手保護模式總開關 -->
          <div class="newbie-protection-card">
            <div class="protection-header">
              <div class="protection-title-area">
                <span class="protection-emoji">🔰</span>
                <div class="protection-text">
                  <div class="protection-title">新手保護模式</div>
                  <div class="protection-desc">啟用後，可手動標記場上的新手玩家。輪盤抽獎時，系統將優先為新手抽取善良角色（鎮民/外來者），降低拿邪惡牌的挫折感。</div>
                </div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="isNewbieProtectionEnabled">
                <span class="slider round"></span>
              </label>
            </div>
            
            <div v-if="isNewbieProtectionEnabled" class="protection-help animate-fade-in">
              💡 說書人可以點擊下方玩家卡片下方的 <span>新手 🔰</span> 按鈕來進行標記
            </div>
          </div>
        </div>

        <!-- 步驟 5.1: 輪盤抽獎 -->
        <div v-else-if="step === 'draw'" class="step-draw">
          <div class="preview-header">
            <button class="btn-ghost btn-sm" @click="step = 'preview'">← 返回預覽</button>
            <h3 class="preview-title">玩家抽取角色</h3>
          </div>


          <div class="draw-grid">
            <div v-for="(player, index) in gameStore.players" 
                 :key="player.id" 
                 class="draw-player-card"
                 :class="{ 
                   'is-drawn': drawnPlayerIds.includes(player.id),
                   'is-newbie-card': isNewbieProtectionEnabled && newbiePlayerIds.includes(player.id)
                 }"
                 @click="!drawnPlayerIds.includes(player.id) && openWheel(player.id)">
              <div class="player-avatar">
                <span class="player-index-badge">{{ index + 1 }}</span>
                <span class="avatar-icon">👤</span>
                <div v-if="drawnPlayerIds.includes(player.id)" class="drawn-check">✅</div>
              </div>
              <div class="player-info">
                <div class="player-name">
                  {{ player.name }}
                  <!-- 只有在抽獎完成（按鈕隱藏）後，才在名字旁保留靜態新手徽章作為歷史記錄 -->
                  <span v-if="isNewbieProtectionEnabled && newbiePlayerIds.includes(player.id) && drawnPlayerIds.includes(player.id)" class="newbie-badge">🔰</span>
                </div>
                <div v-if="drawnPlayerIds.includes(player.id)" class="drawn-status">
                  已完成抽獎
                </div>
              </div>
              
              <!-- 標記新手按鈕 (單一精確指示器) -->
              <div v-if="isNewbieProtectionEnabled && !drawnPlayerIds.includes(player.id)" class="newbie-toggle-area">
                <button 
                  class="btn-newbie-toggle" 
                  :class="{ 'active': newbiePlayerIds.includes(player.id) }"
                  @click.stop="toggleNewbie(player.id)">
                  {{ newbiePlayerIds.includes(player.id) ? '🔰' : '🔰' }}
                </button>
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
              <div class="ready-actions">
                <button class="btn-primary start-draw-btn" @click="startActualDraw">開始抽獎</button>
                <button class="btn-ghost cancel-draw-btn" @click="cancelReadyModal">返回上一頁</button>
              </div>
            </div>

            <!-- 全角色閃爍選擇器 -->
            <div v-if="isSpinning" class="flicker-container">
              <div class="flicker-grid">
                <div v-for="role in fullPoolCharacters" 
                     :key="role.id" 
                     class="flicker-item"
                     :class="{ 'is-highlighted': isIdMatch(activeFlickerId, role.id) }">
                  <img v-if="role.image" :src="role.image || undefined" class="flicker-token" />
                  <span v-else class="role-text-fallback flicker-placeholder" :class="(role.role_type || '').toLowerCase()">{{ role.name.charAt(0) }}</span>
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
                  <span v-else-if="getCharacterById(spinningResultId!)" class="role-text-fallback result-token-placeholder" :class="(getCharacterById(spinningResultId!)?.role_type || '').toLowerCase()">{{ getCharacterById(spinningResultId!)?.name.charAt(0) }}</span>
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
      @close="closeDetails" 
      @click.stop
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { useScriptStore } from '../stores/scriptStore'
import type { CharacterDef } from '../types'
import { ROLE_TYPE_COLOR } from '../types'
import CharacterDetailOverlay from './CharacterDetailOverlay.vue'

const uiStore = useUIStore()
const gameStore = useGameStore()
const scriptStore = useScriptStore()

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'Esc') {
    e.stopImmediatePropagation()
    if (longPressChar.value) {
      longPressChar.value = null
    } else if (showResultModal.value) {
      showResultModal.value = false
    } else if (showReadyModal.value) {
      showReadyModal.value = false
      spinningPlayerId.value = null
    } else {
      uiStore.closePanel()
    }
  }
}



// 狀態管理
type Step = 'pool' | 'config' | 'select' | 'drunk' | 'wudaozhe' | 'lunatic' | 'marionette' | 'bluff' | 'preview' | 'draw'

// 從 UI Store 同步狀態 (移除原步驟 1、2，直接從挑選角色 select 開始)
const savedState = uiStore.setupWizardState as any
const initialStep: Step =
  !savedState.step || savedState.step === 'pool' || savedState.step === 'config'
    ? 'select'
    : savedState.step
const step = ref<Step>(initialStep)
const totalPlayers = computed(() => gameStore.players.length)

// 限制未正式啟用授權的用戶
watch(step, () => {
  if (uiStore.licenseStatus !== 'Loading' && (uiStore.licenseStatus !== 'Valid' || !uiStore.licenseIsActivated)) {
    uiStore.closePanel()
    uiStore.showAlert(
      '開局功能已鎖定',
      `完整開局功能需要啟用正式授權金鑰。請前往「設置選項」->「軟體使用授權」貼上金鑰啟用。\n\n您的裝置識別碼：\n${uiStore.licenseDeviceId}\n(可前往設定選單複製此識別碼並發送給管理員)`
    )
  }
}, { immediate: true })

// 深度監聽所有變數並同步回 UI Store
watch([step], () => syncToStore())

function syncToStore() {
  uiStore.setupWizardState = {
    step: step.value,
    counts: { ...counts },
    selectedRoleIds: [...selectedRoleIds.value],
    selectedBluffIds: [...selectedBluffIds.value],
    drunkFakeRoleId: drunkFakeRoleId.value,
    wudaozheFakeRoleId: wudaozheFakeRoleId.value,
    lunaticFakeRoleId: lunaticFakeRoleId.value,
    marionetteFakeRoleId: marionetteFakeRoleId.value,
    drawingResults: { ...drawingResults },
    previewAssignments: [...previewAssignments.value],
    previewBluffs: [...previewBluffs.value],
    newbiePlayerIds: [...newbiePlayerIds.value],
    isNewbieProtectionEnabled: isNewbieProtectionEnabled.value
  }
}

// 角色池狀態使用 UI Store 持久化
const excludedPoolIds = computed({
  get: () => uiStore.excludedPoolIds,
  set: (val) => uiStore.excludedPoolIds = val
})

// 抽獎與酒鬼邏輯
const drunkFakeRoleId = ref<string | null>(savedState.drunkFakeRoleId)
const wudaozheFakeRoleId = ref<string | null>(savedState.wudaozheFakeRoleId)
const lunaticFakeRoleId = ref<string | null>(savedState.lunaticFakeRoleId)
const marionetteFakeRoleId = ref<string | null>(savedState.marionetteFakeRoleId)
const drawingResults = reactive<Record<string, string>>({ ...savedState.drawingResults }) // player_id -> role_id
const isSpinning = ref(false)
const spinningPlayerId = ref<string | null>(null)
const spinningResultId = ref<string | null>(null)
const showResultModal = ref(false)
const showReadyModal = ref(false)
const activeFlickerId = ref<string | null>(null)

// 新手保護機制狀態
const isNewbieProtectionEnabled = ref<boolean>(savedState.isNewbieProtectionEnabled || false)
const newbiePlayerIds = ref<string[]>(savedState.newbiePlayerIds || [])

function toggleNewbie(playerId: string) {
  const idx = newbiePlayerIds.value.indexOf(playerId)
  if (idx > -1) {
    newbiePlayerIds.value.splice(idx, 1)
  } else {
    newbiePlayerIds.value.push(playerId)
  }
}

watch([
  drunkFakeRoleId, 
  wudaozheFakeRoleId, 
  lunaticFakeRoleId, 
  marionetteFakeRoleId, 
  drawingResults, 
  isNewbieProtectionEnabled, 
  newbiePlayerIds
], () => syncToStore(), { deep: true })

/**
 * 檢測劇本中的角色資料是否合規
 */
function checkScriptValidity(script: any) {
  if (!script || !script.characters) return
  const invalidChars = script.characters.filter((c: any) => {
    if (!c.role_type) return true
    const t = c.role_type.trim().toLowerCase()
    const valid = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled', 'loric']
    return !valid.includes(t)
  })

  if (invalidChars.length > 0) {
    const names = invalidChars.map((c: any) => `「${c.name || c.id}」`).join('、')
    uiStore.showAlert(
      '劇本資料不合規',
      `偵測到劇本中的角色 ${names} 角色類型 (role_type) 為空或無效。\n\n這會導致開局人數範本及角色分組無法正常顯示，請前往【劇本管理】編輯並修正這些角色的類型。`
    )
  }
}

watch(() => gameStore.script, (newScript) => {
  if (newScript) {
    checkScriptValidity(newScript)
  }
}, { immediate: true })

const fullPoolCharacters = computed(() => {
  if (!gameStore.script) return []
  const excluded = new Set(excludedPoolIds.value)
  const validTypes = new Set(['townsfolk', 'outsider', 'minion', 'demon'])
  return gameStore.script.characters.filter(c => {
    const cType = (c.role_type || '').trim().toLowerCase()
    return validTypes.has(cType) && !excluded.has(c.id)
  })
})

const drawnPlayerIds = computed(() => Object.keys(drawingResults))

const hasDrunk = computed(() => selectedRoleIds.value.includes('drunk'))
const hasWudaozhe = computed(() => selectedRoleIds.value.includes('wudaozhe'))
const hasLunatic = computed(() => selectedRoleIds.value.includes('lunatic'))
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

  // 如果有悟道者，將「悟道者」替換為「偽裝角色」
  if (hasWudaozhe.value && wudaozheFakeRoleId.value) {
    const wudaozheIdx = ids.indexOf('wudaozhe')
    if (wudaozheIdx > -1) {
      ids.splice(wudaozheIdx, 1, wudaozheFakeRoleId.value)
    }
  }

  // 如果有瘋子，將「瘋子」替換為「認知角色」
  if (hasLunatic.value && lunaticFakeRoleId.value) {
    const lunaticIdx = ids.indexOf('lunatic')
    if (lunaticIdx > -1) {
      ids.splice(lunaticIdx, 1, lunaticFakeRoleId.value)
    }
  }

  // 如果有提線木偶，將「提線木偶」替換為「認知角色」
  if (hasMarionette.value && marionetteFakeRoleId.value) {
    const marionetteIdx = ids.indexOf('marionette')
    if (marionetteIdx > -1) {
      ids.splice(marionetteIdx, 1, marionetteFakeRoleId.value)
    }
  }
  
  // 排除已經被抽走的 ID (採用多重集減法，防止相同 ID 被一次性過濾光)
  const drawnRoleIds = Object.values(drawingResults)
  for (const drawnId of drawnRoleIds) {
    const idx = ids.indexOf(drawnId)
    if (idx > -1) {
      ids.splice(idx, 1) // 僅移除第一個匹配的 ID，保留其他重複的 ID
    }
  }
  return ids
})

const counts = reactive<Record<string, number>>(
  savedState.counts && Object.values(savedState.counts).some(v => (v as number) > 0)
    ? { ...savedState.counts }
    : { Townsfolk: 0, Outsider: 0, Minion: 0, Demon: 0 }
)

const selectedRoleIds = ref<string[]>([...(savedState.selectedRoleIds || [])])
const selectedBluffIds = ref<string[]>([...(savedState.selectedBluffIds || [])])

watch([counts, selectedRoleIds, selectedBluffIds], () => syncToStore(), { deep: true })

// --- 新增：檢測配置變動角色 ---
const setupWarnings = computed(() => {
  if (!gameStore.script) return []
  const keywords = ['[+1外來者]', '[+1爪牙]', '[+0~1外來者]', '[+2外來者]', '[-1外來者]', '[-2外來者]']
  
  return selectedRoleIds.value.map(id => {
    const char = gameStore.script?.characters.find(c => c.id === id)
    if (!char) return null
    const match = keywords.find(k => char.ability.includes(k))
    if (match) return { id: char.id, name: char.name, match }
    return null
  }).filter((w): w is { id: string; name: string; match: string } => w !== null)
})

const searchQuery = ref('') // 新增搜尋關鍵字
const selectedClass = ref('') // 新增分類篩選

// 當步驟切換時，自動重置搜尋和分類，避免進入新步驟時列表為空
watch(() => step.value, () => {
  searchQuery.value = ''
  selectedClass.value = ''
})

// 長按顯示詳情邏輯
const longPressChar = ref<CharacterDef | null>(null)
let hasTriggeredLongPress = false

function showDetails(char: CharacterDef) {
  longPressChar.value = char
  hasTriggeredLongPress = true
}

function closeDetails() {
  hasTriggeredLongPress = true
  setTimeout(() => {
    longPressChar.value = null
    setTimeout(() => {
      hasTriggeredLongPress = false
    }, 200)
  }, 50)
}
// 基礎映射
const roleTypes = [
  { key: 'Townsfolk', label: '鎮民', color: ROLE_TYPE_COLOR.Townsfolk },
  { key: 'Outsider', label: '外來者', color: ROLE_TYPE_COLOR.Outsider },
  { key: 'Minion', label: '爪牙', color: ROLE_TYPE_COLOR.Minion },
  { key: 'Demon', label: '惡魔', color: ROLE_TYPE_COLOR.Demon },
]

function applyDefaultCounts(p: number) {
  // 根據外部玩家人數套用標準推薦配比
  if (p === 5) { counts.Townsfolk = 3; counts.Outsider = 0; counts.Minion = 1; counts.Demon = 1; }
  else if (p === 6) { counts.Townsfolk = 3; counts.Outsider = 1; counts.Minion = 1; counts.Demon = 1; }
  else if (p === 7) { counts.Townsfolk = 5; counts.Outsider = 0; counts.Minion = 1; counts.Demon = 1; }
  else if (p === 8) { counts.Townsfolk = 5; counts.Outsider = 1; counts.Minion = 1; counts.Demon = 1; }
  else if (p === 9) { counts.Townsfolk = 5; counts.Outsider = 2; counts.Minion = 1; counts.Demon = 1; }
  else if (p === 10) { counts.Townsfolk = 7; counts.Outsider = 0; counts.Minion = 2; counts.Demon = 1; }
  else if (p === 11) { counts.Townsfolk = 7; counts.Outsider = 1; counts.Minion = 2; counts.Demon = 1; }
  else if (p === 12) { counts.Townsfolk = 7; counts.Outsider = 2; counts.Minion = 2; counts.Demon = 1; }
  else if (p >= 13) { counts.Townsfolk = 9; counts.Outsider = 0 + (p - 13); counts.Minion = 3; counts.Demon = 1; }
  else {
    counts.Townsfolk = Math.max(0, p - 3)
    counts.Demon = 1; counts.Minion = 1; counts.Outsider = 1;
  }
}

watch(totalPlayers, (p) => {
  applyDefaultCounts(p)
}, { immediate: true })

// 計算屬性
const panelTitle = computed(() => {
  const titles: Record<Step, string> = {
    pool: '1. 挑選玩家角色',
    config: '1. 挑選玩家角色',
    select: '1. 挑選玩家角色',
    drunk: '1.5 酒鬼認知',
    wudaozhe: '1.52 悟道者認知',
    lunatic: '1.55 瘋子認知',
    marionette: '1.6 木偶偽裝',
    bluff: '2. 挑選惡魔偽裝',
    preview: '3. 最終預覽',
    draw: '4. 輪盤抽獎'
  }
  return titles[step.value]
})
const currentStepNum = computed(() => {
  const map: Record<Step, number> = { pool: 1, config: 1, select: 1, drunk: 1, wudaozhe: 1, lunatic: 1, marionette: 1, bluff: 2, preview: 3, draw: 4 }
  return map[step.value]
})

const groupedCharacters = computed(() => {
  if (!gameStore.script) return []
  const excluded = new Set(excludedPoolIds.value)
  const query = searchQuery.value.trim().toLowerCase()
  
  return roleTypes.map(t => {
    let list: any[] = []
    
    gameStore.script!.characters.forEach(c => {
      const cType = (c.role_type || '').trim().toLowerCase()
      const tType = t.key.trim().toLowerCase()
      const matchesType = cType === tType && !excluded.has(c.id)
      const matchesQuery = !query || c.name.toLowerCase().includes(query)
      const globalChar = scriptStore.rawCharacterList.find(rc => rc.id === c.id.split('::COPY::')[0])
      const charClass = c.class || (globalChar ? globalChar.class : null)
      const matchesClass = !selectedClass.value || charClass === selectedClass.value
      
      if (matchesType && matchesQuery && matchesClass) {
        // 如果是「村夫」，則提供 3 個可選項
        if (c.name === '村夫') {
          list.push({ ...c, id: c.id })
          list.push({ ...c, id: c.id + '::COPY::2', displayName: '村夫 (2)' })
          list.push({ ...c, id: c.id + '::COPY::3', displayName: '村夫 (3)' })
        } else if (c.id === 'legion' || c.name === '軍團') {
          // 根據參與玩家數量的 70% 創建軍團角色選項
          const count = Math.max(1, Math.ceil(totalPlayers.value * 0.7))
          list.push({ ...c, id: c.id })
          for (let i = 2; i <= count; i++) {
            list.push({ ...c, id: `${c.id}::COPY::${i}`, displayName: `${c.name} (${i})` })
          }
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
  
  // 偽裝從「在池子內」且「未被指派給玩家」的鎮民與外來者中選擇
  return gameStore.script.characters.filter(c => {
    const isGoodType = c.role_type === 'Townsfolk' || c.role_type === 'Outsider'
    const isNotUsed = !usedIds.has(c.id) && !excluded.has(c.id) && c.id !== drunkFakeRoleId.value
    const matchesQuery = !query || c.name.toLowerCase().includes(query)
    return isGoodType && isNotUsed && matchesQuery
  })
})

const groupedBluffCharacters = computed(() => {
  const all = availableBluffPool.value
  const types = [
    { key: 'Townsfolk', label: '鎮民', color: 'var(--color-townsfolk)' },
    { key: 'Outsider', label: '外來者', color: 'var(--color-outsider)' }
  ]
  
  return types.map(t => ({
    ...t,
    list: all.filter(c => c.role_type === t.key)
  })).filter(g => g.list.length > 0)
})

const groupedMarionetteFakes = computed(() => {
  const all = availableMarionetteFakes.value
  const types = [
    { key: 'Townsfolk', label: '鎮民', color: 'var(--color-townsfolk)' },
    { key: 'Outsider', label: '外來者', color: 'var(--color-outsider)' }
  ]
  
  return types.map(t => ({
    ...t,
    list: all.filter(c => c.role_type === t.key)
  })).filter(g => g.list.length > 0)
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

const isSelectionComplete = computed(() => {
  return selectedRoleIds.value.length === totalPlayers.value
})

/**
 * 處理搜尋框按下 Enter：跳轉到第一個符合條件的角色
 */
function handleSearchEnter() {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return

  let targetId: string | null = null

  // 1. 找到第一個匹配的角色 ID
  if (step.value === 'select') {
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
  } else if (step.value === 'wudaozhe') {
    if (availableWudaozheFakes.value.length > 0) {
      targetId = availableWudaozheFakes.value[0].id
    }
  } else if (step.value === 'lunatic') {
    if (availableLunaticFakes.value.length > 0) {
      targetId = availableLunaticFakes.value[0].id
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
  } else if (hasWudaozhe.value) {
    step.value = 'wudaozhe'
  } else if (hasLunatic.value) {
    step.value = 'lunatic'
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
    const notWudaozheFake = c.id !== wudaozheFakeRoleId.value
    return isGood && matchesQuery && notMarionetteFake && notWudaozheFake
  })
})

function selectDrunkFake(id: string) {
  drunkFakeRoleId.value = id
  if (hasWudaozhe.value) {
    step.value = 'wudaozhe'
  } else if (hasLunatic.value) {
    step.value = 'lunatic'
  } else if (hasMarionette.value) {
    step.value = 'marionette'
  } else {
    step.value = 'bluff'
  }
}

const availableWudaozheFakes = computed(() => {
  if (!gameStore.script) return []
  const query = searchQuery.value.toLowerCase()
  const used = new Set(selectedRoleIds.value)
  const excluded = new Set(excludedPoolIds.value) // 第一步排除的角色
  
  return gameStore.script.characters.filter(c => {
    // 必須是外來者，且未被指派給玩家，且必須在第一步的角色池中（未被排除）
    const isInPool = !excluded.has(c.id)
    const isGood = c.role_type === 'Outsider' && !used.has(c.id) && isInPool
    const matchesQuery = !query || c.name.toLowerCase().includes(query)
    // 不能和提線木偶、酒鬼的假角色重複
    const notMarionetteFake = c.id !== marionetteFakeRoleId.value
    const notDrunkFake = c.id !== drunkFakeRoleId.value
    return isGood && matchesQuery && notMarionetteFake && notDrunkFake
  })
})

function selectWudaozheFake(id: string) {
  wudaozheFakeRoleId.value = id
  if (hasLunatic.value) {
    step.value = 'lunatic'
  } else if (hasMarionette.value) {
    step.value = 'marionette'
  } else {
    step.value = 'bluff'
  }
}

const availableLunaticFakes = computed(() => {
  if (!gameStore.script) return []
  const query = searchQuery.value.toLowerCase()
  const excluded = new Set(excludedPoolIds.value)
  
  return gameStore.script.characters.filter(c => {
    // 瘋子認知惡魔可以是劇本內任何惡魔角色
    const isDemon = c.role_type === 'Demon' && !excluded.has(c.id)
    const matchesQuery = !query || c.name.toLowerCase().includes(query)
    return isDemon && matchesQuery
  })
})

function selectLunaticFake(id: string) {
  lunaticFakeRoleId.value = id
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

function cancelReadyModal() {
  showReadyModal.value = false
  spinningPlayerId.value = null
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
      if (char?.role_type?.toLowerCase() === 'demon') dSeat = s
    }
  }

  const hasDInRemaining = remaining.some(id => getCharacterById(id)?.role_type?.toLowerCase() === 'demon')
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
  let finalPool = validPool.length > 0 ? validPool : basePool

  // 新手保護機制：如果啟用總開關，且當前玩家被標記為新手
  if (isNewbieProtectionEnabled.value && newbiePlayerIds.value.includes(curPlayerId)) {
    const nonDemonPool = finalPool.filter(roleId => {
      const char = getCharacterById(roleId)
      return char && char.role_type !== 'Demon'
    })
    // 只有在池內確實還有非惡魔角色的情況下才進行過濾，防止卡死
    if (nonDemonPool.length > 0) {
      finalPool = nonDemonPool
    }
  }
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
  // 由於酒鬼、瘋子、提線木偶、悟道者的認知角色可能與當局真實的角色重複，
  // 我們需要採用「多重集配對還原」演算法，避免誤殺/重複覆寫真實的角色。

  // 1. 複製一份本局真實選定的角色 pool 作為待配對池
  const remainingRealRoles = [...selectedRoleIds.value]

  // 2. 建立第一輪分配 (優先分配完全相等的角色)
  const matchedPlan: Record<string, string> = {}
  
  // 先把已經抽出的所有 roleId 與玩家 ID 對齊
  const rawResults = gameStore.players.map(p => ({
    playerId: p.id,
    drawnId: drawingResults[p.id]
  }))

  // 第一輪：優先匹配完全相同的角色 (例如真實的 'imp' 給抽到 'imp' 且為真實惡魔的人)
  for (const item of rawResults) {
    if (!item.drawnId) continue
    const idx = remainingRealRoles.indexOf(item.drawnId)
    if (idx > -1) {
      matchedPlan[item.playerId] = item.drawnId
      remainingRealRoles.splice(idx, 1) // 拿掉已分配的角色
    }
  }

  // 第二輪：針對未配對成功的玩家，尋找其偽裝角色的來源角色 (如 'drunk', 'lunatic' 等)
  for (const item of rawResults) {
    if (matchedPlan[item.playerId]) continue // 已經配對成功的跳過
    if (!item.drawnId) continue

    let matchedRealId: string | null = null

    // 檢查是否是酒鬼的偽裝角色，且池子裡還有酒鬼
    if (hasDrunk.value && item.drawnId === drunkFakeRoleId.value) {
      const idx = remainingRealRoles.indexOf('drunk')
      if (idx > -1) {
        matchedRealId = 'drunk'
        remainingRealRoles.splice(idx, 1)
      }
    }
    // 檢查是否是悟道者的偽裝角色，且池子裡還有悟道者
    if (!matchedRealId && hasWudaozhe.value && item.drawnId === wudaozheFakeRoleId.value) {
      const idx = remainingRealRoles.indexOf('wudaozhe')
      if (idx > -1) {
        matchedRealId = 'wudaozhe'
        remainingRealRoles.splice(idx, 1)
      }
    }
    // 檢查是否是瘋子的認知角色，且池子裡還有瘋子
    if (!matchedRealId && hasLunatic.value && item.drawnId === lunaticFakeRoleId.value) {
      const idx = remainingRealRoles.indexOf('lunatic')
      if (idx > -1) {
        matchedRealId = 'lunatic'
        remainingRealRoles.splice(idx, 1)
      }
    }
    // 檢查是否是提線木偶的認知角色，且池子裡還有提線木偶
    if (!matchedRealId && hasMarionette.value && item.drawnId === marionetteFakeRoleId.value) {
      const idx = remainingRealRoles.indexOf('marionette')
      if (idx > -1) {
        matchedRealId = 'marionette'
        remainingRealRoles.splice(idx, 1)
      }
    }

    // 將配對結果寫入
    matchedPlan[item.playerId] = matchedRealId || item.drawnId
  }

  // 3. 組裝 finalPlan
  const finalPlan = gameStore.players.map(p => {
    const finalRoleId = matchedPlan[p.id] || drawingResults[p.id]
    const char = getCharacterById(finalRoleId)
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
    return (char?.role_type || '').trim().toLowerCase() === targetType
  }).length
}

function isRoleSelected(id: string) {
  return selectedRoleIds.value.includes(id)
}

function isBluffSelected(id: string) {
  return selectedBluffIds.value.includes(id)
}

function toggleRoleSelection(role: CharacterDef) {
  if (longPressChar.value || hasTriggeredLongPress) return
  const idx = selectedRoleIds.value.indexOf(role.id)
  if (idx > -1) {
    selectedRoleIds.value.splice(idx, 1)
  } else {
    // 只要總人數未達上限就可以選，不嚴格限制單一陣營
    if (selectedRoleIds.value.length < totalPlayers.value) {
      selectedRoleIds.value.push(role.id)
    } else {
      uiStore.showAlert('已選滿', `已經選滿 ${totalPlayers.value} 個玩家角色囉！`)
    }
  }
}

function toggleBluffSelection(id: string) {
  if (longPressChar.value || hasTriggeredLongPress) return
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

const previewAssignments = ref<{ player_id: string, role: CharacterDef | null }[]>([...(savedState.previewAssignments || [])])
const previewBluffs = ref<(CharacterDef | null)[]>([...(savedState.previewBluffs || [null, null, null])])

watch([previewAssignments, previewBluffs], () => syncToStore(), { deep: true })



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
    return char?.role_type?.toLowerCase() === 'demon'
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
    if (a.role?.id === 'wudaozhe' && wudaozheFakeRoleId.value) {
      const fakeRole = getCharacterById(wudaozheFakeRoleId.value)
      return { player_id: a.player_id, role: fakeRole || a.role }
    }
    if (a.role?.id === 'lunatic' && lunaticFakeRoleId.value) {
      const fakeRole = getCharacterById(lunaticFakeRoleId.value)
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

  // 自動添加悟道者提示詞
  if (hasWudaozhe.value && wudaozheFakeRoleId.value) {
    const wudaozheEntry = previewAssignments.value.find(a => a.role?.id === 'wudaozhe')
    const wudaozheChar = getCharacterById('wudaozhe')
    const reminderText = wudaozheChar?.remindersGlobal?.[0] || '是悟道者'
    const sourceName = wudaozheChar?.name || '悟道者'
    
    if (wudaozheEntry) {
      setTimeout(async () => {
        await gameStore.addReminder(wudaozheEntry.player_id, reminderText, sourceName)
      }, 500)
    }
  }

  // 自動添加瘋子提示詞
  if (hasLunatic.value && lunaticFakeRoleId.value) {
    const lunaticEntry = previewAssignments.value.find(a => a.role?.id === 'lunatic')
    const lunaticChar = getCharacterById('lunatic')
    const reminderText = lunaticChar?.remindersGlobal?.[0] || '是瘋子'
    const sourceName = lunaticChar?.name || '瘋子'
    
    if (lunaticEntry) {
      setTimeout(async () => {
        await gameStore.addReminder(lunaticEntry.player_id, reminderText, sourceName)
      }, 500)
    }
  }

  // 自動添加提線木偶提示詞
  if (hasMarionette.value && marionetteFakeRoleId.value) {
    const marionetteEntry = previewAssignments.value.find(a => a.role?.id === 'marionette')
    const marionetteChar = getCharacterById('marionette')
    const reminderText = marionetteChar?.remindersGlobal?.[0] || '是提線木偶'
    const sourceName = marionetteChar?.name || '提線木偶'
    
    if (marionetteEntry) {
      setTimeout(async () => {
        await gameStore.addReminder(marionetteEntry.player_id, reminderText, sourceName)
      }, 500)
    }
  }

  uiStore.resetSetupWizard()
  uiStore.closePanel()
}

function handleResetSetup() {
  uiStore.showConfirm(
    '重置設定',
    '確定要清除目前的指派進度並重新開始嗎？',
    () => {
      uiStore.resetSetupWizard()
    // 重新載入初始狀態
      const newState = uiStore.setupWizardState as any
      step.value = newState.step
      Object.assign(counts, newState.counts)
      selectedRoleIds.value = [...newState.selectedRoleIds]
      selectedBluffIds.value = [...newState.selectedBluffIds]
      drunkFakeRoleId.value = newState.drunkFakeRoleId
      wudaozheFakeRoleId.value = newState.wudaozheFakeRoleId
      lunaticFakeRoleId.value = newState.lunaticFakeRoleId
      marionetteFakeRoleId.value = newState.marionetteFakeRoleId
      isNewbieProtectionEnabled.value = newState.isNewbieProtectionEnabled || false
      newbiePlayerIds.value = [...(newState.newbiePlayerIds || [])]
      for (const key in drawingResults) delete drawingResults[key]
      Object.assign(drawingResults, newState.drawingResults)
      previewAssignments.value = [...newState.previewAssignments]
      previewBluffs.value = [...newState.previewBluffs]

    // 觸發 initial counts logic
      const p = totalPlayers.value
      if (p === 5) { counts.Townsfolk = 3; counts.Outsider = 0; counts.Minion = 1; counts.Demon = 1; }
      else if (p === 6) { counts.Townsfolk = 3; counts.Outsider = 1; counts.Minion = 1; counts.Demon = 1; }
      else if (p === 7) { counts.Townsfolk = 5; counts.Outsider = 0; counts.Minion = 1; counts.Demon = 1; }
      else if (p === 8) { counts.Townsfolk = 5; counts.Outsider = 1; counts.Minion = 1; counts.Demon = 1; }
      else if (p === 9) { counts.Townsfolk = 5; counts.Outsider = 2; counts.Minion = 1; counts.Demon = 1; }
      else if (p === 10) { counts.Townsfolk = 7; counts.Outsider = 0; counts.Minion = 2; counts.Demon = 1; }
      else if (p === 11) { counts.Townsfolk = 7; counts.Outsider = 1; counts.Minion = 2; counts.Demon = 1; }
      else if (p === 12) { counts.Townsfolk = 7; counts.Outsider = 2; counts.Minion = 2; counts.Demon = 1; }
      else if (p >= 13) { counts.Townsfolk = 9; counts.Outsider = 0 + (p-13); counts.Minion = 3; counts.Demon = 1; }
      else { counts.Townsfolk = Math.max(0, p - 3); counts.Demon = 1; counts.Minion = 1; counts.Outsider = 1; }
    },
    true
  )
}

function scrollToGroup(typeKey: string) {
  const el = document.getElementById('group-' + typeKey)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
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

.reset-all-btn {
  width: 28px;
  height: 28px;
  min-height: 28px !important;
  padding: 0 !important;
  font-size: 14px !important;
  margin-right: 4px;
  background: none;
  border: none;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
}

.reset-all-btn:hover {
  opacity: 1;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
}

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
  font-size: 10px;
  color: #fff;
  margin-bottom: 2px;
  text-align: right;
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
  margin: 0 -20px 4px;
  padding: 6px 20px 8px;
  border-radius: 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-wrap: nowrap;
  justify-content: space-between;
  gap: 6px;
}

.selection-status-bar.sticky-tabs .type-pill {
  flex: 1;
  text-align: center;
  padding: 4px 2px;
  white-space: nowrap;
}

.type-pill.interactive {
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-pill.interactive:active {
  transform: scale(0.95);
  background: rgba(255,255,255,0.1);
}

.pool-quick-actions button:active {
  transform: scale(0.98);
  background: var(--color-bg-elevated);
}

/* 配置變動警告樣式 */
.setup-warning-banner {
  background: rgba(122, 26, 26, 0.2);
  border: 1px solid var(--color-red-bright);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #fff;
}
.warning-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  color: var(--color-red-bright);
}
.warning-icon {
  font-size: 16px;
}
.warning-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
}
.warning-item {
  padding-left: 22px;
  position: relative;
}
.warning-item::before {
  content: '•';
  position: absolute;
  left: 8px;
  color: var(--color-red-bright);
}
.ability-tag {
  background: var(--color-red);
  padding: 1px 4px;
  border-radius: 4px;
  font-family: monospace;
  font-weight: bold;
}
.warning-footer {
  font-size: 11px;
  opacity: 0.8;
  font-style: italic;
  text-align: right;
}

@keyframes pulse-subtle {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.01); }
}
.animate-pulse-subtle {
  animation: pulse-subtle 2s infinite ease-in-out;
}

/* Collapsible Section */
.collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.header-text {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-gold-muted);
}

.current-script-name {
  margin-left: 12px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  font-size: 12px;
  color: var(--color-text-primary);
  font-weight: normal;
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

.searchable-select-container {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.select-trigger {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  cursor: pointer;
}

.select-input {
  width: 100%;
  padding: 8px 30px 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(201, 168, 76, 0.3);
  color: white;
  border-radius: 6px;
  outline: none;
  font-size: 13px;
  transition: border-color 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.select-input:focus {
  border-color: #c9a84c;
  box-shadow: 0 0 8px rgba(201, 168, 76, 0.2);
  cursor: text;
}

.select-input::placeholder {
  color: #e0e0e0;
  opacity: 1;
}

.select-arrow {
  position: absolute;
  right: 10px;
  pointer-events: none;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  transition: transform 0.2s;
}

.select-arrow.is-open {
  transform: rotate(180deg);
  color: #c9a84c;
}

.select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  background: #15171e;
  border: 1px solid rgba(201, 168, 76, 0.4);
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  z-index: 200;
  max-height: 280px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-y;
  scrollbar-width: thin;
  scrollbar-color: #c9a84c rgba(0, 0, 0, 0.4);
}

/* 劇本選單專屬加粗滾動條（寬度 18px，適配觸控螢幕手指拖曳） */
.select-dropdown::-webkit-scrollbar {
  width: 18px;
}

.select-dropdown::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.4);
  border-left: 1px solid rgba(201, 168, 76, 0.25);
  border-radius: 0 8px 8px 0;
}

.select-dropdown::-webkit-scrollbar-thumb {
  background: #c9a84c;
  border: 3px solid #15171e;
  border-radius: 9px;
  min-height: 42px;
}

.select-dropdown::-webkit-scrollbar-thumb:hover,
.select-dropdown::-webkit-scrollbar-thumb:active {
  background: #ffd875;
}

.dropdown-scroll {
  padding: 4px 0;
  user-select: none;
  -webkit-user-select: none;
}

.dropdown-group-header {
  padding: 6px 12px;
  font-size: 11px;
  color: #c9a84c;
  font-weight: 700;
  letter-spacing: 0.5px;
  background: rgba(201, 168, 76, 0.05);
  border-top: 1px solid rgba(255, 255, 255, 0.03);
}

.dropdown-group:first-child .dropdown-group-header {
  border-top: none;
}

.dropdown-option {
  padding: 10px 16px;
  font-size: 13.5px;
  color: #e0e0e0;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: rgba(201, 168, 76, 0.2);
}

.dropdown-option:hover {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

.dropdown-option.is-active {
  background: rgba(201, 168, 76, 0.2);
  color: #ffd875;
  font-weight: 600;
  border-left: 3px solid #c9a84c;
  padding-left: 13px;
}

.no-options {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
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
  margin-bottom: 4px;
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
  max-height: 85vh;
  overflow-y: auto;
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
.modal-btns button.secondary { background: #2b5c8f; color: white; font-weight: bold; }

/* 搜尋框樣式 */
.search-bar-assignment {
  position: relative;
  margin-bottom: 4px;
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

/* 功能分類篩選樣式 */
.class-filter-container {
  display: flex;
  gap: 6px;
  margin: 10px 0 14px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none; /* Firefox */
}

.class-filter-container::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.class-filter-pill {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 5px 12px;
  font-size: 12px;
  color: #ccc;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.class-filter-pill:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: white;
  transform: translateY(-1px);
}

.class-filter-pill:active {
  transform: translateY(0) scale(0.95);
}

.class-filter-pill.is-active {
  background: rgba(201, 168, 76, 0.2);
  border-color: var(--color-gold);
  color: var(--color-gold-bright, #fff);
  box-shadow: 0 0 10px rgba(201, 168, 76, 0.25);
  font-weight: bold;
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
  font-size: 8px;
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

/* 官方配比參考表格樣式 */
.reference-table-wrapper {
  margin-top: 24px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 12px rgba(0, 0, 0, 0.3);
}

.reference-title {
  font-size: 12px;
  color: var(--color-gold);
  font-weight: bold;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.reference-table-scroll {
  width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

.reference-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  text-align: center;
  min-width: 320px;
}

.reference-table th, .reference-table td {
  padding: 6px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.reference-table th {
  color: var(--color-text-muted);
  font-weight: 600;
  background: rgba(0, 0, 0, 0.15);
}

.reference-table th:first-child, .reference-table td:first-child {
  text-align: left;
  padding-left: 8px;
  font-weight: bold;
  min-width: 60px;
  position: sticky;
  left: 0;
  background: #1a1b23; /* 與 .assignment-panel 背景一致，防止滾動重疊 */
  z-index: 2;
  box-shadow: 2px 0 5px rgba(0,0,0,0.2);
}

.ref-label.townsfolk { color: var(--color-townsfolk); }
.ref-label.outsider { color: var(--color-outsider); }
.ref-label.minion { color: var(--color-minion); }
.ref-label.demon { color: var(--color-demon); }

/* 當前玩家人數的高亮列 */
.highlight-col {
  background: rgba(201, 168, 76, 0.15) !important;
  color: var(--color-gold) !important;
  font-weight: bold;
  box-shadow: inset 0 0 0 1px rgba(201, 168, 76, 0.3);
}

.reference-table td.highlight-col {
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
}

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
  max-height: 85vh;
  overflow-y: auto;
}

.result-header { font-size: 18px; color: var(--color-text-muted); margin-bottom: 24px; text-transform: uppercase; letter-spacing: 2px; }
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

.result-role-name { font-size: 42px; font-weight: bold; color: var(--color-gold); margin-bottom: 12px; }
.result-role-desc { font-size: 18px; color: #888; margin-bottom: 30px; }

/* Ready Modal Styles */
.ready-modal {
  background: #1a1b23;
  padding: 40px 30px;
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  width: 85%;
  max-width: 340px;
  max-height: 85vh;
  overflow-y: auto;
}

.ready-header { font-size: 14px; color: var(--color-text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 2px; }
.ready-player-name { font-size: 28px; font-weight: bold; color: white; margin-bottom: 20px; }
.ready-hint { font-size: 14px; color: #888; margin-bottom: 32px; line-height: 1.5; }
.ready-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.start-draw-btn { width: 100%; padding: 16px; font-size: 18px; letter-spacing: 1px; }
.cancel-draw-btn { width: 100%; padding: 12px; font-size: 14px; color: #888; }

.animate-spin { animation: spin 0.15s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.draw-footer { padding: 20px; }
.confirm-all-btn { width: 100%; padding: 16px; font-size: 16px; }

.step-drunk { padding: 10px; }
.step-hint { font-size: 13px; color: var(--color-gold-muted); flex: 1; text-align: center; }

.preview-actions { 
  display: grid; 
  grid-template-columns: repeat(2, 1fr); 
  gap: 12px; 
  margin-top: 24px;
}
.preview-actions button { 
  width: 100%; 
  padding: 12px 8px;
  font-size: 14px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
}
.preview-actions button:nth-child(3) {
  grid-column: span 2;
  padding: 14px;
  font-size: 16px;
  letter-spacing: 1px;
}
/* 新手保護模式樣式 */
.newbie-protection-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
  margin: 16px 16px 0px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.protection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.protection-title-area {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.protection-emoji {
  font-size: 20px;
  line-height: 1;
}

.protection-text {
  display: flex;
  flex-direction: column;
}

.protection-title {
  font-size: 13px;
  font-weight: bold;
  color: white;
}

.protection-desc {
  font-size: 10px;
  color: #aaa;
  line-height: 1.4;
  margin-top: 2px;
}

.protection-help {
  font-size: 10px;
  color: var(--color-gold-muted);
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
  padding-top: 8px;
  margin-top: 4px;
}

.protection-help span {
  font-weight: bold;
  color: white;
}

/* Switch 開關樣式 */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.15);
  transition: .3s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
}

input:checked + .slider {
  background-color: #3b82f6; /* 亮藍色 */
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.slider.round {
  border-radius: 24px;
}

.slider.round:before {
  border-radius: 50%;
}

/* 新手徽章與按鈕 */
.newbie-badge {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #60a5fa; /* 藍色 */
  font-size: 9px;
  font-weight: bold;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 6px;
  display: inline-flex;
  align-items: center;
}

.newbie-toggle-area {
  width: 100%;
  display: flex;
  justify-content: center;
  z-index: 5;
}

.btn-newbie-toggle {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #bbb;
  font-size: 11px;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-newbie-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.btn-newbie-toggle.active {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.4);
  color: #60a5fa;
}

.btn-newbie-toggle.active:hover {
  background: rgba(59, 130, 246, 0.25);
}

/* 標記新手卡片樣式變換 */
.draw-player-card.is-newbie-card {
  border-color: rgba(59, 130, 246, 0.2) !important;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.04) 0%, rgba(26, 27, 35, 0.95) 100%) !important;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out both;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.similar-script-notice-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(229, 181, 79, 0.12); /* 淡淡的金黃色 */
  border: 1px solid rgba(229, 181, 79, 0.3);
  padding: 8px 12px;
  border-radius: 8px;
  margin: 10px 0;
  font-size: 12px;
  color: #f1c40f;
  line-height: 1.4;
  backdrop-filter: blur(10px);
}

.similar-script-notice-banner .notice-icon {
  font-size: 15px;
  flex-shrink: 0;
}

.similar-script-notice-banner .notice-text {
  flex: 1;
}

.similar-script-notice-banner .notice-text strong {
  color: #fff;
}

.btn-notice-action {
  background: var(--color-gold, #e5b54f);
  color: #111;
  border: none;
  font-weight: bold;
  border-radius: 4px;
  padding: 3.5px 8px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 11px;
  transition: all 0.2s ease;
}

.btn-notice-action:hover {
  background: #f39c12;
  transform: scale(1.02);
}
.role-card-icon .role-text-fallback,
.flicker-item .role-text-fallback {
  font-size: 20px;
  font-weight: 900;
  font-family: 'ChineseFont', var(--font-title), sans-serif;
  color: currentColor;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  user-select: none;
}
.result-token-wrapper .role-text-fallback {
  font-size: 64px;
  font-weight: 900;
  font-family: 'ChineseFont', var(--font-title), sans-serif;
  color: currentColor;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  user-select: none;
}
.role-card-icon.townsfolk,
.flicker-item .role-text-fallback.townsfolk,
.result-token-wrapper .role-text-fallback.townsfolk { color: var(--color-townsfolk); }

.role-card-icon.outsider,
.flicker-item .role-text-fallback.outsider,
.result-token-wrapper .role-text-fallback.outsider { color: var(--color-outsider); }

.role-card-icon.minion,
.flicker-item .role-text-fallback.minion,
.result-token-wrapper .role-text-fallback.minion { color: var(--color-minion); }

.role-card-icon.demon,
.flicker-item .role-text-fallback.demon,
.result-token-wrapper .role-text-fallback.demon { color: var(--color-demon); }

.role-card-icon.traveler,
.flicker-item .role-text-fallback.traveler,
.result-token-wrapper .role-text-fallback.traveler { color: var(--color-traveler); }

.role-card-icon img,
.r-img {
  pointer-events: none !important;
}
</style>
