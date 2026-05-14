<template>
  <div 
    class="grimoire-board" 
    :class="{ 
      'is-night': gameStore.isNight, 
      'is-dragging': isDragging,
      'is-arranging': uiStore.isArrangingPlayers,
      'panel-open': uiStore.activePanel !== 'none' || uiStore.reminderPickerPlayerId !== null || uiStore.isRolePickerOpen
    }"
    @mousedown="handleMouseDown"
    @touchstart="handleMouseDown"
  >
    <StatusBar />
    <TimerWidget />

    <!-- 排列模式覆蓋層 -->
    <transition name="fade">
      <div v-if="uiStore.isArrangingPlayers" class="arrange-mode-overlay">
        <div class="arrange-header">
          <span class="arrange-title">排列座位模式</span>
          <button class="arrange-done-btn" @click="uiStore.isArrangingPlayers = false">完成</button>
        </div>
        <div class="arrange-hint">拖曳玩家頭像以交換座位</div>
      </div>
    </transition>

    <!-- 背景層 -->
    <div class="scene-bg" :style="bgStyle">
      <div class="bg-gradient" />
      <div class="bg-gradient" />
      <div class="fog" />
      <div class="fog" />
      <div class="fog fog-2" />
    </div>

    <!-- 空場提示 -->
    <div v-if="players.length === 0" class="empty-hint">
      
      <h3 class="empty-title">魔典尚未開啓</h3>
      <p class="empty-sub">點撃左下角+按鈕，</p>
      <p class="empty-sub">開始邀請玩家進入小鎮...</p>

    </div>

    <!-- 玩家令片容器 (矩形環狀佈局) -->
    <div 
      class="tokens-fixed-area"
      :style="{ 
        transform: `translate(${uiStore.grimoireTranslateX}px, ${uiStore.grimoireTranslateY}px) scale(${uiStore.grimoireScale})`,
        transformOrigin: 'center 55%'
      }"
    >
      <!-- 中央劇本標誌 -->
      <div class="center-logo-box" @click="uiStore.openPanel('role-assignment')">
        <div class="center-logo-inner">
          <img v-if="gameStore.script?.logo" :src="gameStore.script.logo" class="center-logo-img" />
          <!-- <span v-else class="center-logo-icon">📖</span> -->
            <div class="empty-icon">
          <img src="/app-icon.png" class="empty-logo" />
        </div>
        </div>
        <div class="center-script-name">{{ uiStore.activePoolPresetName || gameStore.script?.name || '選擇劇本' }}</div>
      </div>

      <!-- 玩家令片 (絕對定位) -->
      <div
        v-for="(player, index) in players" 
        :key="player.id"
        class="token-wrapper"
        :class="{ 'is-dragging-token': dragState.index === index, 'is-jiggling': uiStore.isArrangingPlayers && dragState.index !== index }"
        :style="allTokenStyles[index]"
        @mousedown="onTokenMouseDown($event, player, index)"
        @touchstart="onTokenMouseDown($event, player, index)"
      >
        <PlayerToken 
          :player="player" 
          :index="index" 
          :is-on-right-side="getIsRightSide(index)"
          :angle="getEquidistantAngle(index, players.length)"
        />
      </div>

      <!-- 傳說角色展示區 (Fabled Zone) -->
      <div v-if="gameStore.activeFabled.length > 0" class="fabled-zone">
        <div 
          v-for="id in gameStore.activeFabled" 
          :key="id"
          class="fabled-active-token"
          @click="showFabledTooltip(id)"
          @contextmenu.prevent="uiStore.openPanel('fabled-selector')"
        >
          <img :src="getCharacterIcon(id)" class="fabled-active-img" />
        </div>
      </div>
    </div>

    <!-- 偽裝聲勢 (Demon Bluffs) - 右下角垂直托盤設計 (可收納) -->
    <div class="bluffs-drawer" :class="{ 'is-expanded': uiStore.isBluffsExpanded, 'tab-lunatic': uiStore.activeBluffTab === 'lunatic' }">
      <!-- 功能標籤組 -->
      <div class="bluffs-tabs">
        <!-- 瘋子分頁 (僅展開時顯示) -->
        <button 
          v-if="uiStore.isBluffsExpanded" 
          class="bluffs-tab-btn lunatic-tab" 
          :class="{ active: uiStore.activeBluffTab === 'lunatic' }"
          @click="uiStore.activeBluffTab = 'lunatic'"
          title="瘋子偽裝"
        >
          <span class="icon">🌀</span>
        </button>

        <!-- 檢視按鈕 (僅展開時顯示) -->
        <button v-if="uiStore.isBluffsExpanded" class="bluffs-showcase-btn" @click="uiStore.isBluffsShowcase = true" title="展示給惡魔/瘋子">
          <span class="icon">👁️</span>
        </button>

        <!-- 惡魔分頁 (僅展開時顯示) -->
        <button 
          v-if="uiStore.isBluffsExpanded" 
          class="bluffs-tab-btn demon-tab" 
          :class="{ active: uiStore.activeBluffTab === 'demon' }"
          @click="uiStore.activeBluffTab = 'demon'"
          title="惡魔偽裝"
        >
          <span class="icon">👹</span>
        </button>

        <!-- 收納按鈕 -->
        <button class="bluffs-toggle-tab" @click="uiStore.isBluffsExpanded = !uiStore.isBluffsExpanded">
          <span class="tab-icon">{{ uiStore.isBluffsExpanded ? '›' : '‹' }}</span>
          <span class="tab-text">偽裝</span>
        </button>
      </div>

      <div class="bluffs-box-fixed">
        <div class="bluffs-title">
          {{ uiStore.activeBluffTab === 'lunatic' ? '瘋子的偽裝' : '惡魔的偽裝' }}
        </div>
        <div class="bluffs-list">
          <div 
            v-for="(role, idx) in (uiStore.activeBluffTab === 'lunatic' ? gameStore.lunaticBluffs : gameStore.demonBluffs)" 
            :key="idx"
            class="bluff-slot-vertical"
            :class="{ 'is-locked': gameStore.phase !== 'FirstNight' }"
            @click="gameStore.phase === 'FirstNight' && (uiStore.activeBluffTab === 'lunatic' ? uiStore.openRolePickerForLunaticBluff(idx) : uiStore.openRolePickerForBluff(idx))"
          >
            <!-- 角色令片內部設計 -->
            <div v-if="role" class="bluff-token-classic">
              <div class="bluff-inner-content">
                <div class="bluff-canvas-inner">
                  <img :src="getBluffIcon(role)" class="bluff-img" />
                </div>
                <!-- 角色名稱 (內部) -->
                <div class="bluff-name-inner">
                  {{ role.name }}
                </div>
              </div>
            </div>

            <!-- 空位樣式 -->
            <div v-else class="bluff-empty-parchment">
              <span class="bluff-plus">+</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 側邊或浮動按鈕 -->
    <button class="add-player-btn" @click="uiStore.addPlayerDialogOpen = true">
      <span class="icon">➕</span>
    </button>

    <div class="side-action-group" :class="{ 'is-expanded': uiStore.isSideToolbarExpanded }">
      <!-- 主開關按鈕 -->
      <button 
        class="menu-toggle-btn" 
        @click="uiStore.isSideToolbarExpanded = !uiStore.isSideToolbarExpanded"
        :title="uiStore.isSideToolbarExpanded ? '收起選單' : '功能選單'"
      >
        <span class="icon">{{ uiStore.isSideToolbarExpanded ? '✕' : '⚙️' }}</span>
      </button>

      <!-- 被收藏的功能項 -->
      <transition-group name="side-stagger">
        <template v-if="uiStore.isSideToolbarExpanded">
          <button key="settings" class="menu-btn" @click="uiStore.openPanel('settings')" title="設置">
            <span class="icon">🛠️</span>
          </button>

          <button key="night-order" class="menu-btn" @click="uiStore.openPanel('night-order')" title="夜晚順序">
            <span class="icon">🌙</span>
          </button>

          <button 
            key="privacy"
            class="privacy-btn" 
            :class="{ 'is-active': uiStore.isRolesHidden }"
            @click="uiStore.toggleRolesHidden()"
            :title="uiStore.isRolesHidden ? '顯示角色' : '隱藏角色'"
          >
            <div class="privacy-icon-wrapper">
              <span class="icon">👁️</span>
              <span v-if="uiStore.isRolesHidden" class="ban-icon">🚫</span>
            </div>
          </button>
          
          <button 
            key="shape"
            class="side-action-btn" 
            @click="uiStore.cycleGrimoireShape" 
            :title="`魔典圖形: ${currentShapeLabel}`"
          >
            <span class="icon">{{ currentShapeIcon }}</span>
          </button>
          
          <button key="whiteboard" class="menu-btn" @click="uiStore.openPanel('whiteboard')" title="說書人資訊">
            <span class="icon">📝</span>
          </button>
        </template>
      </transition-group>
    </div>


    <!-- 縮放按鈕 (底部中央水平排列) -->
    <div class="zoom-controls-bottom">
      <button class="side-action-btn" @click="uiStore.zoomOut()" title="縮小">
        <span class="icon">➖</span>
      </button>
      <button class="side-action-btn reset-btn" @click="uiStore.resetZoom()" title="重置縮放">
        <span class="percentage">{{ Math.round(uiStore.grimoireScale * 100) }}%</span>
      </button>
      <button class="side-action-btn" @click="uiStore.zoomIn()" title="放大">
        <span class="icon">➕</span>
      </button>
    </div>

    <!-- 面板層 -->
    <transition name="fade">
      <div v-if="uiStore.activePanel !== 'none'" class="panel-overlay-mask" />
    </transition>

    <transition name="slide-up">
      <component :is="activePanelComponent" v-if="uiStore.activePanel !== 'none'" />
    </transition>

    <!-- 彈窗層 -->
    <AddPlayerDialog v-if="uiStore.addPlayerDialogOpen" />
    <RenameDialog v-if="uiStore.renameDialogPlayer" />
    <ConfirmDialog v-if="uiStore.confirmDialog" />
    <RolePicker v-if="uiStore.isRolePickerOpen" />
    <ReminderPicker v-if="uiStore.reminderPickerPlayerId" />

    <!-- 底部操作面板 -->
    <PlayerControlSheet />

    <!-- 惡魔展示模式覆蓋層 (Demon Showcase Mode) -->
    <transition name="showcase-fade">
      <div v-if="uiStore.isBluffsShowcase" class="bluffs-showcase-overlay" @click="uiStore.isBluffsShowcase = false">
        <div class="showcase-header">
          <h2 class="showcase-title">惡魔的偽裝</h2>
          <p class="showcase-hint">隨時點擊空白處返回魔典</p>
        </div>
        
        <div class="showcase-grid">
          <div 
            v-for="(role, idx) in (uiStore.activeBluffTab === 'lunatic' ? gameStore.lunaticBluffs : gameStore.demonBluffs)" 
            :key="idx"
            class="showcase-item"
          >
            <template v-if="role">
              <div class="showcase-token-large">
                <div class="showcase-inner-content">
                  <div class="showcase-canvas-inner">
                    <img :src="getBluffIcon(role)" class="showcase-img" />
                  </div>
                  <div class="showcase-name-inner">
                    {{ role.name }}
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="showcase-empty">
              <div class="empty-circle-dashed">?</div>
            </div>
          </div>
        </div>

        <button class="showcase-close-btn" @click.stop="uiStore.isBluffsShowcase = false">
          完成閱讀
        </button>
      </div>
    </transition>

    <!-- 單人角色展示模式 (Individual Showcase) -->
    <transition name="showcase-fade">
      <div v-if="uiStore.isSingleRoleShowcase && selectedPlayer" class="bluffs-showcase-overlay" @click="uiStore.isSingleRoleShowcase = false">
        <div class="showcase-header">
          <h2 class="showcase-title">{{ selectedPlayer.name }} 的角色</h2>
          <p class="showcase-hint">展示給玩家閱讀</p>
        </div>
        
        <div class="showcase-grid">
          <div class="showcase-item">
            <template v-if="selectedPlayer.role">
              <div class="showcase-token-large">
                <div class="showcase-inner-content">
                  <div class="showcase-canvas-inner">
                    <img :src="getBluffIcon(selectedPlayer.role)" class="showcase-img" />
                  </div>
                  <div class="showcase-name-inner">
                    {{ selectedPlayer.role.name }}
                  </div>
                </div>
              </div>
            </template>
            <div v-else class="showcase-empty">
              <div class="empty-circle-dashed">未分配</div>
            </div>
          </div>
        </div>

        <button class="showcase-close-btn" @click.stop="uiStore.isSingleRoleShowcase = false">
          返回控制台
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, reactive, defineAsyncComponent } from 'vue'
import type { CSSProperties } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'
import { useScriptStore } from '../stores/scriptStore'

import PlayerToken from './PlayerToken.vue'
import StatusBar from './StatusBar.vue'
import TimerWidget from './TimerWidget.vue'
import SettingsPanel from './SettingsPanel.vue'
import VotingPanel from './VotingPanel.vue'
import RoleAssignmentPanel from './RoleAssignmentPanel.vue'
import Whiteboard from './Whiteboard.vue'
// 懶加載大型面板組件，減少初始負擔
// const SettingsPanel = defineAsyncComponent(() => import('./SettingsPanel.vue'))
// const VotingPanel = defineAsyncComponent(() => import('./VotingPanel.vue'))
// const RoleAssignmentPanel = defineAsyncComponent(() => import('./RoleAssignmentPanel.vue'))
// const Whiteboard = defineAsyncComponent(() => import('./Whiteboard.vue'))
const NightOrder = defineAsyncComponent(() => import('./NightOrder.vue'))
const CharacterSheet = defineAsyncComponent(() => import('./CharacterSheet.vue'))
const CharacterEditorPanel = defineAsyncComponent(() => import('./CharacterEditorPanel.vue'))
const PlayerOrderPanel = defineAsyncComponent(() => import('./PlayerOrderPanel.vue'))
const GameLogPanel = defineAsyncComponent(() => import('./GameLogPanel.vue'))
const FabledSelectorPanel = defineAsyncComponent(() => import('./FabledSelectorPanel.vue'))

import AddPlayerDialog from './AddPlayerDialog.vue'
import RenameDialog from './RenameDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import RolePicker from './RolePicker.vue'
import ReminderPicker from './ReminderPicker.vue'
import PlayerControlSheet from './PlayerControlSheet.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()
const scriptStore = useScriptStore()

// --- 視窗大小追蹤 (用於修正正圓形比例) ---
const windowSize = ref({ width: window.innerWidth, height: window.innerHeight })
function updateWindowSize() {
  windowSize.value = { width: window.innerWidth, height: window.innerHeight }
}

onMounted(() => {
  window.addEventListener('resize', updateWindowSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWindowSize)
})

// --- 螢幕喚醒鎖 (Wake Lock) ---
let wakeLock: any = null

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await (navigator as any).wakeLock.request('screen')
      console.log('Wake Lock is active')
    } catch (err: any) {
      console.error(`${err.name}, ${err.message}`)
    }
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    // 回到前景時校準計時器
    uiStore.calibrateTimer()
    // 重新請求喚醒鎖
    requestWakeLock()
  }
}

onMounted(async () => {
  await scriptStore.loadCharacters()
  await gameStore.loadState()
  // 如果目前沒有劇本，預設選擇第一項（全角色大全）
  if (!gameStore.script && scriptStore.allScripts.length > 0) {
    await scriptStore.selectScript(scriptStore.allScripts[0])
  }

  // 啟用喚醒鎖
  requestWakeLock()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  if (wakeLock) {
    wakeLock.release()
    wakeLock = null
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

const bgStyle = computed(() => {
  if (gameStore.isNight) {
    return uiStore.customNightBackground 
      ? { 
          backgroundImage: `url(${uiStore.customNightBackground})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          backgroundColor: '#000'
        }
      : {}
  } else {
    return uiStore.customDayBackground 
      ? { 
          backgroundImage: `url(${uiStore.customDayBackground})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          backgroundColor: '#f4e4bc'
        }
      : {}
  }
})

// --- 點擊與拖曳狀態 ---
const players = computed(() => gameStore.players)
const selectedPlayer = computed(() => 
  gameStore.players.find(p => p.id === uiStore.selectedPlayerId)
)

// --- 拖拽平移與雙指縮放邏輯 (Panning & Pinch-to-Zoom Logic) ---
const isDragging = ref(false)
const isPinching = ref(false)
const startPos = { x: 0, y: 0 }
const startTranslate = { x: 0, y: 0 }
const startPinchDist = ref(0)
const startScale = ref(1)

function getDistance(touches: TouchList) {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function handleMouseDown(e: MouseEvent | TouchEvent) {
  if (uiStore.isArrangingPlayers) return // 在排列模式下，禁止拖曳背景

  // 核心修正：如果「任何」面板正在開啟中，禁止拖拽背景
  if (
    uiStore.activePanel !== 'none' || 
    uiStore.reminderPickerPlayerId !== null || 
    uiStore.isRolePickerOpen || 
    uiStore.selectedPlayerId !== null
  ) {
    return
  }

  // 額外保險：如果點擊到了特定組件的範圍，也不觸發拖拽
  if ((e.target as HTMLElement).closest('.token-wrapper') || 
      (e.target as HTMLElement).closest('button') || 
      (e.target as HTMLElement).closest('.bluffs-drawer') ||
      (e.target as HTMLElement).closest('.panel-overlay-mask') ||
      (e.target as HTMLElement).closest('.overlay') || 
      (e.target as HTMLElement).closest('.control-sheet')) return

  if ('touches' in e && e.touches.length === 2) {
    // 雙指縮放開始
    isPinching.value = true
    isDragging.value = false
    startPinchDist.value = getDistance(e.touches)
    startScale.value = uiStore.grimoireScale
  } else {
    // 單指拖拽開始
    isDragging.value = true
    isPinching.value = false
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    startPos.x = clientX
    startPos.y = clientY
    startTranslate.x = uiStore.grimoireTranslateX
    startTranslate.y = uiStore.grimoireTranslateY
  }

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('touchmove', handleMouseMove, { passive: false })
  window.addEventListener('touchend', handleMouseUp)
}

function handleMouseMove(e: MouseEvent | TouchEvent) {
  if (isPinching.value && 'touches' in e && e.touches.length === 2) {
    // 執行雙指縮放
    const currentDist = getDistance(e.touches)
    const ratio = currentDist / startPinchDist.value
    // 限制縮放範圍在 0.5 到 3 之間
    const newScale = Math.min(Math.max(startScale.value * ratio, 0.5), 3)
    uiStore.grimoireScale = newScale
    if (e.cancelable) e.preventDefault()
    return
  }

  if (!isDragging.value) return
  
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  
  const dx = clientX - startPos.x
  const dy = clientY - startPos.y
  
  uiStore.setGrimoireTranslate(startTranslate.x + dx, startTranslate.y + dy)
  
  if (e.cancelable) e.preventDefault()
}

function handleMouseUp() {
  isDragging.value = false
  isPinching.value = false
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('touchmove', handleMouseMove)
  window.removeEventListener('touchend', handleMouseUp)
}

// --- 排列座位拖曳邏輯 (Arrange Mode Drag & Drop) ---
const dragState = reactive({
  isDragging: false,
  playerId: '',
  index: -1,
  xPercent: 0,
  yPercent: 0
})

// --- 效能優化：預先計算所有令片位置，避免平移/縮放時重複執行幾何運算 ---
const allTokenStyles = computed(() => {
  return players.value.map((_, index): CSSProperties => {
    // 如果正在拖曳排列，該令片的樣式由 dragState 決定（這部分仍需動態）
    if (dragState.isDragging && dragState.index === index) {
      const n = players.value.length
      const baseSize = n > 14 ? 68 : n > 11 ? 80 : n > 8 ? 92 : 105
      return {
        position: 'absolute',
        left: `${dragState.xPercent}%`,
        top: `${dragState.yPercent}%`,
        transform: 'translate(-50%, -50%) scale(1.15)',
        width: `${baseSize}px`,
        height: `${baseSize}px`,
        zIndex: 100,
        transition: 'none'
      }
    }
    return getPlayerPosStyle(index)
  })
})

function onTokenMouseDown(e: MouseEvent | TouchEvent, player: any, index: number) {
  if (!uiStore.isArrangingPlayers) return
  e.preventDefault()
  e.stopPropagation()

  dragState.isDragging = true
  dragState.playerId = player.id
  dragState.index = index

  updateDragPos(e)

  window.addEventListener('mousemove', onTokenMouseMove)
  window.addEventListener('touchmove', onTokenMouseMove, { passive: false })
  window.addEventListener('mouseup', onTokenMouseUp)
  window.addEventListener('touchend', onTokenMouseUp)
}

function updateDragPos(e: MouseEvent | TouchEvent) {
  const container = document.querySelector('.tokens-fixed-area')
  if (!container) return
  const rect = container.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  
  dragState.xPercent = ((clientX - rect.left) / rect.width) * 100
  dragState.yPercent = ((clientY - rect.top) / rect.height) * 100
}

function onTokenMouseMove(e: MouseEvent | TouchEvent) {
  if (!dragState.isDragging) return
  e.preventDefault()
  updateDragPos(e)
  checkDragSwap()
}

function checkDragSwap() {
  const n = players.value.length
  let closestIndex = -1
  let minDist = Infinity

  for (let i = 0; i < n; i++) {
    if (i === dragState.index) continue
    
    const angle = getEquidistantAngle(i, n)
    const { a, b, nFactor, yCenter } = LAYOUT_CONFIG.value
    const cosT = Math.cos(angle)
    const sinT = Math.sin(angle)
    const targetX = 50 + a * Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / nFactor)
    const targetY = yCenter + b * Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / nFactor)

    const dx = dragState.xPercent - targetX
    const dy = dragState.yPercent - targetY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < minDist) {
      minDist = dist
      closestIndex = i
    }
  }

  // 觸發交換的距離閾值 (百分比)
  if (closestIndex !== -1 && minDist < 10) {
    swapPlayersLocally(dragState.index, closestIndex)
    dragState.index = closestIndex
    if ('vibrate' in navigator) (navigator as any).vibrate(15)
  }
}

function swapPlayersLocally(idx1: number, idx2: number) {
  if (gameStore.state) {
    const arr = [...gameStore.state.players]
    const temp = arr[idx1]
    arr[idx1] = arr[idx2]
    arr[idx2] = temp
    gameStore.state.players = arr
  }
}

function onTokenMouseUp() {
  if (dragState.isDragging) {
    dragState.isDragging = false
    dragState.index = -1
    dragState.playerId = ''
    gameStore.reorderPlayers(players.value.map(p => p.id))
  }
  window.removeEventListener('mousemove', onTokenMouseMove)
  window.removeEventListener('touchmove', onTokenMouseMove)
  window.removeEventListener('mouseup', onTokenMouseUp)
  window.removeEventListener('touchend', onTokenMouseUp)
}



const currentShapeIcon = computed(() => {
  const map = { circle: '⏺️', oval: '0️⃣', rect: '⏹️' }
  return map[uiStore.grimoireShape as keyof typeof map] || '⏺️'
})

const currentShapeLabel = computed(() => {
  const map = { circle: '經典正圓', oval: '優雅橢圓', rect: '工整矩形' }
  return map[uiStore.grimoireShape as keyof typeof map] || ''
})

// 佈局全局參數：改為計算屬性，支援動態切換形狀
const LAYOUT_CONFIG = computed(() => {
  const shape = uiStore.grimoireShape
  const ratio = windowSize.value.width / windowSize.value.height

  switch (shape) {
    case 'circle':
      // 核心邏輯：擴大半徑 (44%) 以增加周長，減少擁擠
      const baseA = 50
      return {
        a: baseA,
        b: baseA * ratio, // 修正比例
        nFactor: 2,
        yCenter: 55, // 圓形模式下完全居中
        samples: 600
      }
    case 'rect':
      // 矩形模式優化：增加響應式高度，並稍微降低 nFactor 讓過渡更平滑
      const baseARect = 41
      return {
        a: baseARect,
        b: Math.min(baseARect * ratio * 1.3, 38), // 隨比例增加高度，但設定上限防止太長
        nFactor: 3.2, // 從 4.0 降到 3.2，讓角落不那麼死板
        yCenter: 50,
        samples: 800
      }
    case 'oval':
    default:
      return {
        a: 38,
        b: 30,
        nFactor: 2.0,
        yCenter: 55,
        samples: 600
      }
  }
})

/**
 * 弧長均分數據快取 (Arc-Length Parametrization)
 * 預先計算超橢圓的弧長分佈，避免每個令片重複運算了 600 次循環。
 */
const arcData = computed(() => {
  const { a, b, nFactor, samples } = LAYOUT_CONFIG.value
  const arcLengths = new Float32Array(samples + 1)
  let totalLength = 0
  
  // 核心修正：只有「正圓形」需要強制物理等距
  // 矩形和橢圓為了順著長螢幕邊緣佈置，使用百分比空間均分最自然
  const needsRatioFix = uiStore.grimoireShape === 'circle'
  const ratio = needsRatioFix ? (windowSize.value.width / windowSize.value.height) : 1.0

  const getPt = (ang: number) => {
    const cosT = Math.cos(ang); const sinT = Math.sin(ang)
    return {
      x: a * Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / nFactor),
      y: b * Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / nFactor)
    }
  }

  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * 2 * Math.PI
    if (i > 0) {
      const prevT = ((i - 1) / samples) * 2 * Math.PI
      const p1 = getPt(prevT); const p2 = getPt(t)
      
      // 根據模式決定是否修正 y 軸權重
      const dx = p2.x - p1.x
      const dy = (p2.y - p1.y) / ratio
      totalLength += Math.sqrt(dx * dx + dy * dy)
    }
    arcLengths[i] = totalLength
  }

  return { arcLengths, totalLength }
})

function getEquidistantAngle(index: number, n: number) {
  const { samples } = LAYOUT_CONFIG.value
  const { arcLengths, totalLength } = arcData.value
  
  const targetLen = (index / n) * totalLength
  
  // 二分查找 (Binary Search) 加速定位
  let low = 0, high = samples
  while (low < high) {
    const mid = (low + high) >>> 1
    if (arcLengths[mid] < targetLen) low = mid + 1
    else high = mid
  }

  const i = low
  const l1 = arcLengths[i - 1] || 0
  const l2 = arcLengths[i]
  const t1 = ((i - 1) / samples) * 2 * Math.PI
  const t2 = (i / samples) * 2 * Math.PI
  
  const fraction = (l2 === l1) ? 0 : (targetLen - l1) / (l2 - l1)
  const rawT = t1 + fraction * (t2 - t1)
  
  return rawT - Math.PI / 2
}

function getIsRightSide(index: number) {
  const n = players.value.length
  if (n === 0) return false
  const angle = getEquidistantAngle(index, n)
  // cos(angle) > 0 表示在右半圓
  return Math.cos(angle) > 0.1
}

function getPlayerPosStyle(index: number): CSSProperties {
  const n = players.value.length
  if (n === 0) return {}

  // 根據人數動態縮放令片
  // 根據人數動態縮放令片 (針對多人模式進一步縮小以釋放空間)
  const baseSize = n > 14 ? 68 : n > 11 ? 80 : n > 8 ? 92 : 105
  
  // 獲取等距角度
  const angle = getEquidistantAngle(index, n)
  const { a, b, nFactor, yCenter } = LAYOUT_CONFIG.value
  
  const cosT = Math.cos(angle)
  const sinT = Math.sin(angle)
  
  // 座標映射 (嚴格同步超級橢圓公式)
  const x = 50 + a * Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / nFactor)
  const y = yCenter + b * Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / nFactor)

  return {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)',
    width: `${baseSize}px`,
    height: `${baseSize}px`,
    transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
  }
}

function getBluffIcon(role: any) {
  return role.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${role.id}`
}

function getCharacterIcon(id: string) {
  const char = scriptStore.rawCharacterList.find(c => c.id === id)
  return char?.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${id}`
}

function showFabledTooltip(id: string) {
  const char = scriptStore.rawCharacterList.find(c => c.id === id)
  if (char) {
    uiStore.showConfirm('傳說角色: ' + char.name, char.ability, () => {}, false)
  }
}

const activePanelComponent = computed(() => {
  switch (uiStore.activePanel) {
    case 'settings': return SettingsPanel
    case 'voting': return VotingPanel
    case 'night-order': return NightOrder
    case 'character-sheet': return CharacterSheet
    case 'character-editor': return CharacterEditorPanel
    case 'player-order': return PlayerOrderPanel
    case 'role-assignment': return RoleAssignmentPanel
    case 'game-log': return GameLogPanel
    case 'fabled-selector': return FabledSelectorPanel
    case 'whiteboard': return Whiteboard
    default: return null
  }
})


</script>

<style scoped>
.grimoire-board {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0b0c10;
}

/* ─────────────────────────────────────────────────────────────────────────
   背景層 (羊皮紙質感) 
   ───────────────────────────────────────────────────────────────────────── */
.scene-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  /* 白天模式：自定義背景圖片 */
  background: url('/bg_day.png') no-repeat center center;
  background-size: cover;
  transition: all 0.8s ease;
}

.grimoire-board.is-night .scene-bg {
  /* 夜晚模式：自定義背景圖片 */
  background: url('/bg_night.png') no-repeat center center;
  background-size: cover;
}

.scene-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('/p6.png');
  opacity: 0.3;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.moon {
  position: absolute;
  top: 10%;
  right: 15%;
  width: 70px; /* 固定像素，確保任何螢幕都是正圓 */
  height: 70px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fffde7, #ffd54f 50%, #f57f17);
  box-shadow: 0 0 30px rgba(255, 213, 79, 0.3);
  z-index: 1;
}

.grimoire-board.is-night .moon {
  background: radial-gradient(circle at 35% 35%, #fff8e1, #ffb300 50%, #bf360c);
  opacity: 0.8;
}

/* 移除星星樣式 */

.showcase-inner-content {
  width: 76%;
  height: 76%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 6px;
}

.showcase-canvas-inner {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  margin-bottom: -6px;
}

.showcase-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: contrast(1.2) brightness(0.95) drop-shadow(0 4px 10px rgba(0,0,0,0.4));
}

.showcase-name-inner {
  font-size: 20px;
  font-weight: 900;
  color: #1a1b23;
  letter-spacing: 2px;
  text-align: center;
  white-space: nowrap;
  font-family: var(--font-title), sans-serif;
  text-shadow: 0 1px 4px rgba(255,255,255,0.8);
}

.fog {
  position: absolute;
  bottom: -20px;
  width: 200%;
  height: 120px;
  background: linear-gradient(to top, rgba(93, 64, 55, 0.4), transparent);
  border-radius: 50%;
  animation: fogDrift 10s ease-in-out infinite alternate;
  filter: blur(20px);
  z-index: 2;
}

/* 移除星星動畫 */

/* ─────────────────────────────────────────────────────────────────────────
   主要令片佈局區域 
   ───────────────────────────────────────────────────────────────────────── */
.grimoire-board.is-dragging {
  cursor: grabbing;
}

.tokens-fixed-area {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  /* 拖拽時取消 transition 以獲得即時反饋，非拖拽時（如縮放）保持平滑 */
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.is-dragging .tokens-fixed-area {
  transition: none;
}

.token-wrapper {
  pointer-events: auto;
  z-index: 10;
}

/* 中央劇本標誌 */
.center-logo-box {
  position: absolute;
  top: 55%; /* 精確匹配令片環中心 y=51% */
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  z-index: 1; /* 降低層級，確保標誌作為背景，不遮擋令片與提示標記 */
  pointer-events: auto; /* 重中之重：確保穿透父層的 none */
  transition: all 0.3s ease;
}

.center-logo-box:active {
  transform: translate(-50%, -50%) scale(0.92);
}

/* ─────────────────────────────────────────────────────────────────────────
   排列座位模式 (Arrange Mode)
   ───────────────────────────────────────────────────────────────────────── */
.arrange-mode-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding-top: env(safe-area-inset-top, 20px);
  z-index: 1000;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.arrange-header {
  pointer-events: auto;
  background: rgba(20, 20, 20, 0.85);
  backdrop-filter: blur(8px);
  padding: 8px 24px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  margin-top: 16px;
}

.arrange-title {
  color: var(--color-gold);
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 1px;
}

.arrange-done-btn {
  background: var(--color-gold);
  color: #000;
  border: none;
  border-radius: 16px;
  padding: 4px 12px;
  font-weight: 800;
  font-size: 14px;
  cursor: pointer;
}

.arrange-hint {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
}

/* Jiggle Animation */
@keyframes jiggle {
  0% { transform: translate(-50%, -50%) rotate(-2deg); }
  50% { transform: translate(-50%, -50%) rotate(2deg); }
  100% { transform: translate(-50%, -50%) rotate(-2deg); }
}

.is-jiggling {
  animation: jiggle 0.3s ease-in-out infinite;
}

.is-dragging-token {
  opacity: 0.9;
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.8));
}

.center-logo-inner {
  width: 110px;
  height: 110px;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.center-logo-img { 
  width: 78px; 
  height: 78px; 
  object-fit: contain;
  filter: sepia(0.3) contrast(1.1);
}

.center-logo-icon {
  font-size: 56px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
  opacity: 0.4; /* 調整為半透明浮水印效果 */
}

.center-script-name {
  font-family: 'ChineseFont', 'NewsFont', 'Cinzel', serif !important;
  font-size: 20px;
  font-weight: 800;
  color: #cbcbcb; /* 深色墨水感 */
  letter-spacing: 4px; /* 增加字間距讓霹靂體更清楚 */
  text-shadow: 0 1px 1px rgba(255,255,255,0.3);
}

/* 傳說角色展示區 */
.fabled-zone {
  position: absolute;
  top: 15%; /* 放在上半部 */
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 2;
  pointer-events: auto;
}

.fabled-active-token {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  /* 改為深色漸層背景，與黃色外框形成強烈對比 */
  background: radial-gradient(circle at 30% 30%, #3a2318 0%, #1a0f08 100%);
  border: 2px solid #e6c547;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  /* 增加黑色深陰影與金色微光，讓它像個立體的徽章 */
  box-shadow: 
    0 4px 12px rgba(0,0,0,0.7),
    0 0 15px rgba(230, 197, 71, 0.4) inset,
    0 0 8px rgba(230, 197, 71, 0.3);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.fabled-active-token:hover {
  transform: scale(1.15) translateY(-2px);
  box-shadow: 
    0 6px 16px rgba(0,0,0,0.8),
    0 0 20px rgba(230, 197, 71, 0.6) inset,
    0 0 15px rgba(230, 197, 71, 0.5);
}

.fabled-active-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ─────────────────────────────────────────────────────────────────────────
   右下角：惡魔偽裝可收納托盤 (Collapsible Bluffs Drawer) 
   ───────────────────────────────────────────────────────────────────────── */
.bluffs-drawer {
  position: fixed;
  bottom: 40px;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  transform: translateX(calc(100% - 32px)); 
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.bluffs-drawer.is-expanded {
  transform: translateX(0);
}

/* 當面板開啟時，隱藏偽裝托盤，避免視覺干擾 */
.panel-open .bluffs-drawer {
  opacity: 0;
  pointer-events: none;
  transform: translateX(100%);
}

.bluffs-tabs {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-right: -1px; /* 負邊距讓標籤與面板無縫銜接 */
  z-index: 2;
}

.bluffs-toggle-tab {
  width: 32px;
  height: 60px; /* 縮小一點，給其它分頁留空間 */
  background: linear-gradient(to right, rgba(42, 27, 21, 0.95), rgba(62, 39, 35, 0.95));
  border: 1px solid rgba(210, 180, 140, 0.3);
  border-right: none;
  border-radius: 12px 0 0 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: #d2b48c;
  transition: all 0.3s ease;
  order: 4; /* 最下方 */
}

.bluffs-tab-btn {
  width: 32px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid rgba(210, 180, 140, 0.2);
  border-right: none;
  border-radius: 10px 0 0 10px;
  transition: all 0.3s ease;
  background: linear-gradient(to right, rgba(30, 20, 15, 0.95), rgba(42, 27, 21, 0.95));
  color: rgba(210, 180, 140, 0.5);
}

.lunatic-tab {
  order: 1; /* 最上方 */
}
.lunatic-tab.active {
  background: linear-gradient(to right, #4c1d95, #2e1065);
  color: #c084fc;
  width: 36px;
  margin-left: -4px;
  border-color: #a855f7;
  box-shadow: -4px 0 15px rgba(168, 85, 247, 0.3);
}

.bluffs-showcase-btn {
  width: 32px;
  height: 48px;
  background: linear-gradient(135deg, #b38b3d 0%, #8c6d2f 100%);
  color: #2a1b15;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-right: none;
  border-radius: 10px 0 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  order: 2; /* 中間 */
}

.demon-tab {
  order: 3; /* 下方 */
}
.demon-tab.active {
  background: linear-gradient(to right, #7f1d1d, #450a0a);
  color: #f87171;
  width: 36px;
  margin-left: -4px;
  border-color: #ef4444;
  box-shadow: -4px 0 15px rgba(239, 68, 68, 0.3);
}

.bluffs-showcase-btn:hover {
  background: #d4c8b0;
}

.bluffs-drawer.tab-lunatic .bluffs-box-fixed {
  border-color: rgba(168, 85, 247, 0.4);
}
.bluffs-drawer.tab-lunatic .bluffs-title {
  color: #c084fc;
  border-bottom-color: rgba(168, 85, 247, 0.2);
}

.tab-icon { font-size: 18px; font-weight: 800; }
.tab-text { font-size: 10px; writing-mode: vertical-lr; letter-spacing: 2px; }

.bluffs-box-fixed {
  background: linear-gradient(145deg, rgba(20, 20, 28, 0.9), rgba(30, 30, 40, 0.85));
  border: 1px solid rgba(210, 180, 140, 0.35);
  border-left: none;
  border-radius: 16px 0 0 0; /* 左下角改為直角 */
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  backdrop-filter: blur(15px);
  position: relative;
}

.bluffs-box-fixed::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px 0 0 0; /* 同步改為直角 */
  padding: 1px;
  background: linear-gradient(to bottom, rgba(210, 180, 140, 0.3), transparent);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.bluffs-title {
  font-size: 11px;
  font-weight: 800;
  color: #b38b3d;
  border-bottom: 1px solid rgba(179, 139, 61, 0.2);
  padding-bottom: 6px;
  text-align: center;
  white-space: nowrap;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.bluffs-list {
  display: flex;
  flex-direction: column;
  gap: 16px; /* 增加間距給標籤 */
}

.bluff-slot-vertical {
  width: 62px;
  height: 62px;
  cursor: pointer;
  position: relative;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bluff-slot-vertical:hover {
  transform: scale(1.08);
}

/* 經典令片樣式 (應用 token1.png) */
.bluff-token-classic {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: url('/token1.png') no-repeat center center;
  background-size: cover;
  box-shadow: 0 4px 12px rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.bluff-inner-content {
  width: 76%;
  height: 76%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 2px;
}

.bluff-canvas-inner {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  margin-bottom: -4px;
}

.bluff-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: contrast(1.1) brightness(0.9) drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

.bluff-name-inner {
  font-size: 8px; /* 側邊欄令片較小，所以字體也縮小 */
  font-weight: 900;
  color: #1a1b23;
  letter-spacing: 1px;
  text-align: center;
  white-space: nowrap;
  font-family: var(--font-title), sans-serif;
  text-shadow: 0 1px 2px rgba(255,255,255,0.7);
  transform: scale(0.95);
}

.bluff-empty-parchment {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 40%, rgba(244, 228, 188, 0.1), rgba(210, 180, 140, 0.05));
  border: 1.5px dashed rgba(210, 180, 140, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ─────────────────────────────────────────────────────────────────────────
   空場提示 (Empty State) 
   ───────────────────────────────────────────────────────────────────────── */
.empty-hint {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 4;
  width: 80%;
}

.empty-icon {
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
}

.empty-logo {
  width: 120px;
  height: 120px;
  opacity: 1; /* 提高可見度 */
  filter: sepia(0.2) contrast(1.3) brightness(0.9); /* 移除灰階，保留微弱懷舊感並加強對比 */
  object-fit: contain;
}

.empty-title {
  font-family: 'ChineseFont', 'NewsFont', 'Cinzel', serif !important;
  font-size: 26px;
  color: #ffffff;
  margin-bottom: 8px;
  letter-spacing: 4px;
}

.empty-sub {
  font-family: 'ChineseFont', 'NewsFont', 'Cinzel', serif !important;
  font-size: 15px;
  color: #ffffff;
  opacity: 0.8;
  max-width: 280px;
  margin: 0 auto;
}

/* ─────────────────────────────────────────────────────────────────────────
   按鈕與動畫 
   ───────────────────────────────────────────────────────────────────────── */
.add-player-btn {
  position: fixed;
  bottom: 65px;
  left: 24px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #2a1b15;
  border: 2px solid #8d6e63;
  color: #d4c8b0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  box-shadow: 0 6px 16px rgba(0,0,0,0.4);
}

.side-action-group {
  position: fixed;
  top: calc(65px + env(safe-area-inset-top, 0px));
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 900;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.side-action-group.is-expanded {
  background: rgba(42, 27, 21, 0.4);
  backdrop-filter: blur(10px);
  padding: 8px;
  border-radius: 20px;
  border: 1px solid rgba(141, 110, 99, 0.2);
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}

/* 當有面板開啟時，隱藏右上角的功能按鈕，避免干擾 */
.panel-open .side-action-group {
  opacity: 0;
  pointer-events: none;
  transform: translateX(20px);
}

.zoom-controls-bottom {
  position: fixed;
  bottom: 25px; /* 貼近底部，最大限度留出魔典空間 */
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px; /* 縮減間距 */
  background: rgba(42, 27, 21, 0.5);
  padding: 4px 10px; /* 縮減內邊距 */
  border-radius: 20px;
  border: 1px solid rgba(141, 110, 99, 0.3);
  backdrop-filter: blur(10px);
  z-index: 100;
  box-shadow: 0 4px 15px rgba(0,0,0,0.4);
  transition: all 0.3s ease;
}

/* 當有面板打開時隱藏，避免視覺擁擠 */
.panel-open .zoom-controls-bottom {
  opacity: 0;
  pointer-events: none;
}

.zoom-controls-bottom .side-action-btn {
  width: 32px; /* 縮小按鈕 */
  height: 32px;
  border-radius: 50%;
  background: rgba(42, 27, 21, 0.85);
  border: 1px solid #8d6e63;
  color: #f4e4bc;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 8px rgba(0,0,0,0.3);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
}
/*Menu Button 的 圖標設定區域*/
.menu-btn, .privacy-btn, .side-action-group .side-action-btn, .menu-toggle-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(42, 27, 21, 0.85);
  border: 1.5px solid #8d6e63;
  color: #f4e4bc;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
}

.menu-toggle-btn {
  background: rgba(201, 168, 76, 0.1);
  border-color: rgba(201, 168, 76, 0.4);
  color: var(--color-gold);
  z-index: 10;
}

.menu-toggle-btn:hover {
  background: rgba(201, 168, 76, 0.2);
  transform: scale(1.1);
}

/* 側邊工具列進入動畫 */
.side-stagger-enter-active, .side-stagger-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.side-stagger-enter-from, .side-stagger-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.5);
}

.menu-btn .icon, .privacy-btn .icon, .side-action-group .side-action-btn .icon, .menu-toggle-btn .icon {
  font-size: 10px;
}

.zoom-controls-bottom .reset-btn {
  width: 46px; /* 同步縮小寬度 */
  border-radius: 12px;
}

.zoom-controls-bottom .percentage {
  font-size: 10px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
}

.menu-btn:hover, .privacy-btn:hover, .side-action-group .side-action-btn:hover, .zoom-controls-bottom .side-action-btn:hover {
  background: #b38b3d;
  color: #1a1b23;
  transform: scale(1.1);
}

.bluff-slot-vertical:hover:not(.is-locked) {
  transform: translateX(5px) scale(1.05);
  border-color: rgba(232, 112, 112, 0.4);
  box-shadow: 0 4px 15px rgba(139, 26, 26, 0.3);
}

.bluff-slot-vertical.is-locked {
  cursor: default;
  opacity: 0.6;
  filter: grayscale(0.5);
}

.privacy-btn.is-active {
  background: rgba(244, 67, 54, 0.15);
  border-color: rgba(244, 67, 54, 0.5);
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.2);
}

.side-action-btn.layout-toggle-side .icon {
  font-size: 12px;
}

.privacy-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.ban-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -55%);
  font-size: 16px;
  opacity: 0.85;
  pointer-events: none;
}

.panel-overlay-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
}

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease-out; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ─────────────────────────────────────────────────────────────────────────
   惡魔展示模式 (Demon Showcase Overlay) 
   ───────────────────────────────────────────────────────────────────────── */
.bluffs-showcase-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.96);
  backdrop-filter: blur(20px);
  z-index: 2000; /* 提高層級，確保蓋住所有面板 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  cursor: pointer;
}

.showcase-header {
  text-align: center;
  margin-bottom: 30px;
}

.showcase-title {
  font-family: var(--font-title);
  font-size: 28px;
  color: #d2b48c;
  letter-spacing: 6px;
  margin-bottom: 6px;
  text-shadow: 0 0 15px rgba(210, 180, 140, 0.4);
}

.showcase-hint {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  letter-spacing: 1.5px;
}

.showcase-grid {
  display: flex;
  flex-direction: column;
  gap: 16px; /* 緊湊的垂直間距 */
  align-items: center;
  justify-content: center;
  width: 100%;
}

.showcase-item {
  display: flex;
  flex-direction: column; /* 令片與名字垂直排列 */
  align-items: center;
  gap: 12px; /* 縮小令片與名字間距 */
  width: auto;
}

.showcase-token-large {
  width: 130px; /* 縮小尺寸以適應並排與垂直空間 */
  height: 130px;
  border-radius: 50%;
  background: url('/token1.png') no-repeat center center;
  background-size: cover;
  box-shadow: 0 12px 24px rgba(0,0,0,0.8), 0 0 40px rgba(210, 180, 140, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: tokenFloat 4s ease-in-out infinite alternate;
}

.showcase-inner-content {
  width: 76%;
  height: 76%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 6px;
}

.showcase-canvas-inner {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  margin-bottom: -6px;
}

.showcase-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: contrast(1.2) brightness(0.95) drop-shadow(0 4px 10px rgba(0,0,0,0.4));
}

.showcase-name-inner {
  font-size: 20px;
  font-weight: 900;
  color: #1a1b23;
  letter-spacing: 2px;
  text-align: center;
  white-space: nowrap;
  font-family: var(--font-title), sans-serif;
  text-shadow: 0 1px 4px rgba(255,255,255,0.8);
}

.showcase-empty {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px dashed rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.05);
  font-size: 50px;
}

.showcase-close-btn {
  margin-top: 40px;
  background: transparent;
  color: #d2b48c;
  border: 1px solid #d2b48c;
  padding: 10px 40px;
  border-radius: 20px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.showcase-close-btn:hover {
  background: #d2b48c;
  color: #000;
}

@keyframes tokenFloat {
  from { transform: translateY(0) rotate(-2deg); }
  to { transform: translateY(-20px) rotate(2deg); }
}

.showcase-fade-enter-active, .showcase-fade-leave-active {
  transition: opacity 0.5s ease;
}
.showcase-fade-enter-from, .showcase-fade-leave-to {
  opacity: 0;
}

@keyframes fogDrift {
  from { transform: translateX(0); }
  to { transform: translateX(5%); }
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}
</style>
