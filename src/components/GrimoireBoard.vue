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
        
        <!-- 垃圾桶區域 -->
        <div class="arrange-trash-zone" :class="{ 'is-hovering': isHoveringTrash }" ref="trashZoneRef">
          <span class="trash-icon">🗑️</span>
          <span class="trash-text">拖曳至此刪除玩家</span>
        </div>
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
        transform: `translate(${uiStore.grimoireTranslateX}px, ${uiStore.grimoireTranslateY}px) scale(${uiStore.viewScale})`,
        transformOrigin: uiStore.zoomOrigin
      }"
    >
      <!-- 中央劇本標誌 -->
      <div class="center-logo-box" @click="handleScriptNameClick">
        <div class="center-logo-inner">
          <img v-if="gameStore.script?.logo" :src="gameStore.script.logo" class="center-logo-img" />
          <div v-else class="empty-icon">
            <img src="/pic/app-icon.png" class="empty-logo" />
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
          title="瘋子認知"
        >
          <span class="icon">🌀</span>
        </button>

        <!-- 檢視按鈕 (僅展開時顯示) -->
        <button v-if="uiStore.isBluffsExpanded" class="bluffs-showcase-btn" @click="uiStore.isBluffsShowcase = true" title="展示給惡魔/瘋子">
          <!-- <span class="icon">👁️</span> -->
          <img class="icon" src="/pic/search.png" />
        </button>

        <!-- 惡魔分頁 (僅展開時顯示) -->
        <button 
          v-if="uiStore.isBluffsExpanded" 
          class="bluffs-tab-btn demon-tab" 
          :class="{ active: uiStore.activeBluffTab === 'demon' }"
          @click="uiStore.activeBluffTab = 'demon'"
          title="惡魔偽裝"
        >
          <img class="icon" src="/pic/Demons.png" />
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
                <div class="bluff-canvas-inner" :class="role.role_type.toLowerCase()">
                  <img v-if="role.image" :src="role.image" class="bluff-img" />
                  <span v-else class="bluff-text-fallback">{{ role.name.charAt(0) }}</span>
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
        <img class="icon" v-if="uiStore.isSideToolbarExpanded" src="/pic/close.png"/>
        <img class="icon" v-else src="/pic/gear.png" />
      </button>

      <!-- 被收藏的功能項 -->
      <transition-group name="side-stagger">
        <template v-if="uiStore.isSideToolbarExpanded">
          <button key="settings" class="menu-btn" @click="uiStore.openPanel('settings'); uiStore.isSideToolbarExpanded = false" title="設置">
            <!-- <span class="icon">🛠️</span> -->
            <img class="icon" src="/pic/repair.png" />

          </button>

          <button key="night-order" class="menu-btn" @click="uiStore.openPanel('night-order'); uiStore.isSideToolbarExpanded = false" title="夜晚順序">
            <!-- <span class="icon">🌙</span> -->
             <img class="icon" src="/pic/moon.png" />
          </button>

          <button 
            key="privacy"
            class="privacy-btn" 
            :class="{ 'is-active': uiStore.isRolesHidden }"
            @click="uiStore.toggleRolesHidden(); uiStore.isSideToolbarExpanded = false"
            :title="uiStore.isRolesHidden ? '顯示角色' : '隱藏角色'"
          >
            <div class="privacy-icon-wrapper">
              <!-- <span class="icon">👁️</span> -->
              <img class="icon" src="/pic/show.png" />
              <!-- <span v-if="uiStore.isRolesHidden" class="ban-icon">🚫</span> -->
              <img class="ban-icon" v-if="uiStore.isRolesHidden" src="/pic/hide.png" />
            </div>
          </button>
          
          <button 
            key="shape"
            class="side-action-btn" 
            @click="uiStore.cycleGrimoireShape(); uiStore.isSideToolbarExpanded = false" 
            :title="`魔典圖形: ${currentShapeLabel}`"
          >
            <img class="icon" :src="currentShapeIcon" />
          </button>
          
          <button key="voting" class="menu-btn" @click="uiStore.openPanel('voting'); uiStore.isSideToolbarExpanded = false" title="投票管理">
            <img class="icon" src="/pic/vote-yes.png" />
          </button>
          
          <button key="whiteboard" class="menu-btn" @click="uiStore.openPanel('whiteboard'); uiStore.isSideToolbarExpanded = false" title="說書人資訊">
            <!-- <span class="icon">📝</span> -->
            <img class="icon" src="/pic/notes.png" />
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
    <PromptDialog v-if="uiStore.promptDialog" />
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
                  <div class="showcase-canvas-inner" :class="role.role_type.toLowerCase()">
                    <img v-if="role.image" :src="role.image" class="showcase-img" />
                    <span v-else class="bluff-text-fallback">{{ role.name.charAt(0) }}</span>
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
                  <div class="showcase-canvas-inner" :class="selectedPlayer.role.role_type.toLowerCase()">
                    <img v-if="selectedPlayer.role.image" :src="selectedPlayer.role.image" class="showcase-img" />
                    <span v-else class="bluff-text-fallback">{{ selectedPlayer.role.name.charAt(0) }}</span>
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

    <!-- 實體劇本大圖檢視 Overlay -->
    <transition name="fade">
      <div 
        v-if="showPhysicalImageOverlay && gameStore.script?.physical_image" 
        class="physical-image-overlay"
        @click.self="showPhysicalImageOverlay = false"
        @touchmove.prevent
      >
        <!-- 毛玻璃背景與圖片顯示區 -->
        <div 
          class="physical-image-container"
          @mousedown="handleImgMouseDown"
          @mousemove="handleImgMouseMove"
          @mouseup="handleImgMouseUp"
          @mouseleave="handleImgMouseUp"
          @touchstart="handleImgMouseDown"
          @touchmove="handleImgMouseMove"
          @touchend="handleImgMouseUp"
          @wheel.stop.prevent="handleImgWheel"
        >
          <img 
            :src="gameStore.script.physical_image" 
            class="physical-image-content"
            :class="{ 'is-dragging': isDraggingImg }"
            :style="{
              transform: `translate(${imgTranslateX}px, ${imgTranslateY}px) scale(${imgScale})`,
              cursor: isDraggingImg ? 'grabbing' : 'grab'
            }"
            draggable="false"
          />
        </div>

        <!-- 浮動控制工具列 -->
        <div class="image-control-toolbar">
          <button class="tool-btn" @click="zoomImg(0.2)" title="放大">🔍➕</button>
          <button class="tool-btn" @click="zoomImg(-0.2)" title="縮小">🔍➖</button>
          <button class="tool-btn" @click="resetImgZoom" title="重設">🔄</button>
          <button class="tool-btn settings-link" @click="openScriptSettingsFromOverlay" title="劇本設定">⚙️ 劇本設定</button>
          <button class="tool-btn close-link" @click="showPhysicalImageOverlay = false" title="關閉">✕</button>
        </div>
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
const ScriptEditorPanel = defineAsyncComponent(() => import('./ScriptEditorPanel.vue'))

import AddPlayerDialog from './AddPlayerDialog.vue'
import RenameDialog from './RenameDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import PromptDialog from './PromptDialog.vue'
import RolePicker from './RolePicker.vue'
import ReminderPicker from './ReminderPicker.vue'
import PlayerControlSheet from './PlayerControlSheet.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()
const scriptStore = useScriptStore()

// --- 實體劇本大圖檢視狀態 ---
const showPhysicalImageOverlay = ref(false)
const imgScale = ref(1)
const imgTranslateX = ref(0)
const imgTranslateY = ref(0)
const isDraggingImg = ref(false)
let imgDragStart = { x: 0, y: 0 }
let imgTranslateStart = { x: 0, y: 0 }

function handleScriptNameClick() {
  if (gameStore.script?.physical_image) {
    // 重設縮放拖曳狀態
    imgScale.value = 1
    imgTranslateX.value = 0
    imgTranslateY.value = 0
    showPhysicalImageOverlay.value = true
  } else {
    uiStore.openPanel('role-assignment')
  }
}

function handleImgWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.15 : 0.15
  imgScale.value = Math.min(Math.max(0.3, imgScale.value + delta), 5)
}

function handleImgMouseDown(e: MouseEvent | TouchEvent) {
  const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
  
  isDraggingImg.value = true
  imgDragStart = { x: clientX, y: clientY }
  imgTranslateStart = { x: imgTranslateX.value, y: imgTranslateY.value }
}

function handleImgMouseMove(e: MouseEvent | TouchEvent) {
  if (!isDraggingImg.value) return
  
  const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
  
  const dx = clientX - imgDragStart.x
  const dy = clientY - imgDragStart.y
  
  imgTranslateX.value = imgTranslateStart.x + dx
  imgTranslateY.value = imgTranslateStart.y + dy
  
  if (e.cancelable) {
    e.preventDefault()
  }
}

function handleImgMouseUp() {
  isDraggingImg.value = false
}

function resetImgZoom() {
  imgScale.value = 1
  imgTranslateX.value = 0
  imgTranslateY.value = 0
}

function zoomImg(factor: number) {
  imgScale.value = Math.min(Math.max(0.3, imgScale.value + factor), 5)
}

function openScriptSettingsFromOverlay() {
  showPhysicalImageOverlay.value = false
  uiStore.openPanel('role-assignment')
}

// --- 視窗大小追蹤 (用於修正正圓形比例) ---
const windowSize = ref({ width: window.innerWidth, height: window.innerHeight })
function updateWindowSize() {
  windowSize.value = { width: window.innerWidth, height: window.innerHeight }
}

onMounted(() => {
  window.addEventListener('resize', updateWindowSize)
  window.addEventListener('wheel', handleGlobalWheel, { passive: false })
  updateWindowSize()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWindowSize)
  window.removeEventListener('wheel', handleGlobalWheel)
})

function updateZoomOrigin(e: MouseEvent | TouchEvent) {
  const container = document.querySelector('.grimoire-board')
  if (!container) return
  const rect = container.getBoundingClientRect()
  const clientX = 'touches' in e ? (e.touches[0].clientX + (e.touches[1]?.clientX || e.touches[0].clientX)) / 2 : (e as MouseEvent).clientX
  const clientY = 'touches' in e ? (e.touches[0].clientY + (e.touches[1]?.clientY || e.touches[0].clientY)) / 2 : (e as MouseEvent).clientY
  
  const x = ((clientX - rect.left) / rect.width) * 100
  const y = ((clientY - rect.top) / rect.height) * 100
  uiStore.setZoomOrigin(`${x}% ${y}%`)
}

function handleGlobalWheel(e: WheelEvent) {
  if (e.ctrlKey) {
    e.preventDefault()
    // 只有在原始比例時，或者開始新的滾動序列時更新中心點，防止跳動
    if (uiStore.viewScale === 1.0) {
      updateZoomOrigin(e)
    }
    const delta = e.deltaY > 0 ? -0.12 : 0.12
    uiStore.setViewScale(uiStore.viewScale + delta)
  }
}

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

  // 🚀 延遲淡出並移除初始加載畫面 (Logo 頁)，提供極致流暢的開屏體驗
  setTimeout(() => {
    const loader = document.getElementById('initial-loader')
    if (loader) {
      loader.style.opacity = '0'
      loader.style.visibility = 'hidden'
      // 等待 0.5 秒淡出動畫結束後，將其從 DOM 中徹底清除
      setTimeout(() => {
        loader.remove()
      }, 500)
    }
  }, 1200)
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
    // 雙指縮放開始：在此時鎖定中心點
    isPinching.value = true
    isDragging.value = false
    updateZoomOrigin(e) 
    startPinchDist.value = getDistance(e.touches)
    startScale.value = uiStore.viewScale
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
    const newScale = Math.min(Math.max(startScale.value * ratio, 0.5), 3.0)
    uiStore.setViewScale(newScale)
    if (e.cancelable) e.preventDefault()
    return
  }

  if (!isDragging.value) return
  
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  
  const dx = clientX - startPos.x
  const dy = clientY - startPos.y
  
  uiStore.setGrimoireTranslate(
    startTranslate.x + dx,
    startTranslate.y + dy
  )
  
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
  yPercent: 0,
  clientX: 0,
  clientY: 0
})

const trashZoneRef = ref<HTMLElement | null>(null)
const isHoveringTrash = ref(false)

// --- 效能優化：預先計算所有令片位置，避免平移/縮放時重複執行幾何運算 ---
const allTokenStyles = computed(() => {
  return players.value.map((_, index): CSSProperties => {
    // 如果正在拖曳排列，該令片的樣式由 dragState 決定（這部分仍需動態）
    if (dragState.isDragging && dragState.index === index) {
      const n = players.value.length
      // 修正：Scale 越大，令片越大
      const baseSize = (n > 14 ? 68 : n > 11 ? 80 : n > 8 ? 92 : 105) * uiStore.grimoireScale
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
  
  dragState.clientX = clientX
  dragState.clientY = clientY
  
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
  // 檢查是否拖曳到垃圾桶上方
  if (trashZoneRef.value) {
    const rect = trashZoneRef.value.getBoundingClientRect()
    // 加入一點緩衝區域，讓判定更寬容
    if (
      dragState.clientX >= rect.left - 20 && dragState.clientX <= rect.right + 20 &&
      dragState.clientY >= rect.top - 20 && dragState.clientY <= rect.bottom + 20
    ) {
      isHoveringTrash.value = true
      return // 在垃圾桶上方時，不觸發座位交換
    } else {
      isHoveringTrash.value = false
    }
  }

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
    if (isHoveringTrash.value) {
      // 刪除玩家
      const idToRemove = dragState.playerId
      gameStore.removePlayer(idToRemove)
      if ('vibrate' in navigator) (navigator as any).vibrate([50, 50, 50])
    } else {
      // 重排座位
      gameStore.reorderPlayers(players.value.map(p => p.id))
    }

    dragState.isDragging = false
    dragState.index = -1
    dragState.playerId = ''
    isHoveringTrash.value = false
  }
  window.removeEventListener('mousemove', onTokenMouseMove)
  window.removeEventListener('touchmove', onTokenMouseMove)
  window.removeEventListener('mouseup', onTokenMouseUp)
  window.removeEventListener('touchend', onTokenMouseUp)
}



const currentShapeIcon = computed(() => {
  const map = { 
    circle: '/pic/circle.png', 
    oval: '/pic/oval.png', 
    rect: '/pic/rectangle.png' 
  }
  return map[uiStore.grimoireShape as keyof typeof map] || '/pic/circle.png'
})

const currentShapeLabel = computed(() => {
  const map = { circle: '經典正圓', oval: '優雅橢圓', rect: '工整矩形' }
  return map[uiStore.grimoireShape as keyof typeof map] || ''
})

// 佈局全局參數：改為計算屬性，支援動態切換形狀
const LAYOUT_CONFIG = computed(() => {
  const shape = uiStore.grimoireShape
  const ratio = windowSize.value.width / windowSize.value.height
  const count = players.value.length

  // 當人數較多時，稍微擴大圓圈直徑 (layoutBoost)
  const layoutBoost = count > 14 ? 6 : (count > 11 ? 3 : 0)

  switch (shape) {
    case 'circle':
      // 縮小橫向半徑 (從 40 降至 36) 以避免左右截斷
      const baseA = 36 + layoutBoost
      return {
        a: baseA,
        b: baseA * ratio,
        nFactor: 2,
        yCenter: 55,
        samples: 600
      }
    case 'rect':
      // 縮小寬度 (從 34 降至 32)
      const baseARect = 34 + layoutBoost
      return {
        a: baseARect,
        b: Math.max(baseARect * ratio * 1, 25 + layoutBoost), 
        nFactor: 3.2, 
        yCenter: 50,
        samples: 800
      }
    case 'oval':
    default:
      // 縮小寬度 (從 34 降至 32)
      return {
        a: 36 + layoutBoost,
        b: 24 + layoutBoost,
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
  // 根據人數與縮放比例動態計算令片大小
  const n = players.value.length
  if (n === 0) return {}

  // 方案三：更激進的縮放邏輯 (人數越多，令片縮得越小以騰出空間)
  let rawSize = 105
  if (n > 14) rawSize = 65  // 15人以上大幅縮小
  else if (n > 11) rawSize = 78
  else if (n > 8) rawSize = 90
  
  const baseSize = rawSize * uiStore.grimoireScale
  
  // 獲取等距角度
  const angle = getEquidistantAngle(index, n)
  const { a, b, nFactor, yCenter } = LAYOUT_CONFIG.value
  
  const cosT = Math.cos(angle)
  const sinT = Math.sin(angle)
  
  // 座標映射 (嚴格同步超級橢圓公式)
  const x = 50 + a * Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / nFactor)
  const y = yCenter + b * Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / nFactor)

  // 動態層級：下方玩家 (Y較大) 浮在上方玩家之上
  // 額外補強：有標記的玩家層級提升 (+1000)，確保標記不被鄰居令片擋住
  const reminderBoost = (players.value[index]?.reminders?.length || 0) > 0 ? 1000 : 0

  return {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)',
    width: `${baseSize}px`,
    height: `${baseSize}px`,
    zIndex: Math.floor(y * 10) + reminderBoost,
    transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
  }
}


function getCharacterIcon(id: string) {
  const char = scriptStore.rawCharacterList.find(c => c.id === id)
  return char?.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${id}`
}

function showFabledTooltip(id: string) {
  const char = scriptStore.rawCharacterList.find(c => c.id === id)
  if (char) {
    uiStore.showConfirm('傳說與奇遇角色: ' + char.name, char.ability, () => {}, false)
  }
}

const activePanelComponent = computed(() => {
  switch (uiStore.activePanel) {
    case 'settings': return SettingsPanel
    case 'voting': return VotingPanel
    case 'night-order': return NightOrder
    case 'character-sheet': return CharacterSheet
    case 'character-editor': return CharacterEditorPanel
    case 'script-editor': return ScriptEditorPanel
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
  background: url('/pic/bg_day.png') no-repeat center center;
  background-size: cover;
  transition: all 0.8s ease;
}

.grimoire-board.is-night .scene-bg {
  /* 夜晚模式：自定義背景圖片 */
  background: url('/pic/bg_night.png') no-repeat center center;
  background-size: cover;
}

.scene-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('/pic/p6.png');
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
  gap: 0px; /* 將間距降至 0px，強制元素拉近 */
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

/* 垃圾桶區域 */
.arrange-trash-zone {
  pointer-events: auto;
  position: fixed;
  bottom: calc(60px + env(safe-area-inset-bottom, 20px));
  left: 50%;
  transform: translateX(-50%);
  background: rgba(220, 53, 69, 0.15);
  border: 2px dashed rgba(220, 53, 69, 0.4);
  color: #ffcdd2;
  padding: 14px 28px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  backdrop-filter: blur(12px);
  z-index: 1000;
  user-select: none;
}

.trash-icon {
  font-size: 20px;
  transition: transform 0.2s ease;
}

.trash-text {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* 拖入時的強烈視覺回饋與動畫 */
.arrange-trash-zone.is-hovering {
  background: rgba(220, 53, 69, 0.45);
  border: 2px solid rgba(255, 23, 68, 0.8);
  color: #ffffff;
  transform: translateX(-50%) scale(1.12);
  box-shadow: 
    0 10px 30px rgba(220, 53, 69, 0.6), 
    0 0 15px rgba(255, 23, 68, 0.4) inset;
  animation: trashPulse 0.8s infinite alternate;
}

.arrange-trash-zone.is-hovering .trash-icon {
  animation: trashWiggle 0.4s infinite;
}

@keyframes trashPulse {
  0% {
    box-shadow: 0 10px 20px rgba(220, 53, 69, 0.4), 0 0 10px rgba(255, 23, 68, 0.2) inset;
  }
  100% {
    box-shadow: 0 10px 35px rgba(220, 53, 69, 0.8), 0 0 25px rgba(255, 23, 68, 0.6) inset;
  }
}

@keyframes trashWiggle {
  0%, 100% { transform: scale(1.3) rotate(0deg); }
  25% { transform: scale(1.3) rotate(-12deg); }
  75% { transform: scale(1.3) rotate(12deg); }
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
  height: 80px; /* 從 110px 縮小至 80px，大幅壓縮垂直佔位，把文字向上拉近 */
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  left: -4px; /* 往左偏移 5px，統一平衡自訂與預設 Logo 的視覺重心 */
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
  margin-top: -12px; /* 🚀 強勢將劇本文字向上提，徹底抵消圖片本身的任何留白，實現完美緊湊排版 */
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
  bottom: calc(45px + env(safe-area-inset-bottom, 16px));
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

.bluffs-tab-btn img.icon {
  width: 50px;
  height: 50px;
  object-fit: contain;
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
  background: url('/pic/token1.png') no-repeat center center;
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
  margin-bottom: -25px; /* 🚀 使用強效負邊距，強制文字向上靠攏，徹底抵消 Logo 圖片自帶的透明底邊留白！ */
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
  bottom: calc(75px + env(safe-area-inset-bottom, 16px));
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
  right: 8px; /* 從 16px 縮小至 8px，配合常駐的 8px padding，使得按鈕離螢幕右邊緣依然保持精準 16px 經典排版 */
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 900;
  padding: 8px; /* 🚀 常駐 padding！確保展開與收起狀態下，盒模型寬高完全一致，100% 阻絕往左下偏移的跳動 */
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.side-action-group.is-expanded {
  /* 🚀 隱形排版容器優化：此處不再動態變更 padding，確保原地垂直滑出，視覺極其穩健 */
}

/* 當有面板開啟時，隱藏右上角的功能按鈕，避免干擾 */
.panel-open .side-action-group {
  opacity: 0;
  pointer-events: none;
  transform: translateX(20px);
}

.zoom-controls-bottom {
  position: fixed;
  bottom: calc(30px + env(safe-area-inset-bottom, 16px));
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
  width: 16px;
  height: 16px;
  object-fit: contain;
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
  width: 16px;
  height: 16px;
  object-fit: contain;
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
  background: url('/pic/token1.png') no-repeat center center;
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

.bluff-canvas-inner.townsfolk,
.showcase-canvas-inner.townsfolk { color: #5dade2; }

.bluff-canvas-inner.outsider,
.showcase-canvas-inner.outsider  { color: #48c9b0; }

.bluff-canvas-inner.minion,
.showcase-canvas-inner.minion    { color: #ec7063; }

.bluff-canvas-inner.demon,
.showcase-canvas-inner.demon     { color: #f1948a; }

.bluff-canvas-inner.traveler,
.showcase-canvas-inner.traveler  { color: #8bb34d; }

.bluff-canvas-inner.fabled,
.showcase-canvas-inner.fabled    { color: #e6c547; }

.bluff-text-fallback {
  font-size: 26px;
  font-weight: 900;
  font-family: 'ChineseFont', var(--font-title), sans-serif;
  color: currentColor;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
  user-select: none;
}

.showcase-inner-content .bluff-text-fallback {
  font-size: 52px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}
</style>
