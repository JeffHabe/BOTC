<template>
  <div 
    class="grimoire-board" 
    :class="{ 'is-night': gameStore.isNight, 'is-dragging': isDragging }"
    @mousedown="handleMouseDown"
    @touchstart="handleMouseDown"
  >
    <StatusBar />
    <TimerWidget />

    <!-- 背景層 -->
    <div class="scene-bg">
      <div class="bg-gradient" />
      <div v-if="gameStore.isNight" class="moon" :class="{ 'moon-night': gameStore.isNight }" />
      <div class="stars-container" v-if="gameStore.isNight">
        <div v-for="i in 40" :key="i" class="star" :style="starStyle(i)" />
      </div>
      <div class="fog" />
      <div class="fog fog-2" />
    </div>

    <!-- 空場提示 -->
    <div v-if="players.length === 0" class="empty-hint">
      <div class="empty-icon">🏰</div>
      <h3 class="empty-title">魔典尚未開啟</h3>
      <p class="empty-sub">點擊左下角的新增按鈕，開始邀請玩家進入小鎮...</p>
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
          <span v-else class="center-logo-icon">📖</span>
        </div>
        <div class="center-script-name">{{ uiStore.activePoolPresetName || gameStore.script?.name || '選擇劇本' }}</div>
      </div>

      <!-- 玩家令片 (絕對定位) -->
      <div
        v-for="(player, index) in players" 
        :key="player.id"
        class="token-wrapper"
        :style="getPlayerPosStyle(index)"
      >
        <PlayerToken 
          :player="player" 
          :index="index" 
          :is-on-right-side="getIsRightSide(index)"
          :angle="getEquidistantAngle(index, players.length)"
        />
      </div>
    </div>

    <!-- 虛張聲勢 (Demon Bluffs) - 右下角垂直托盤設計 (可收納) -->
    <div class="bluffs-drawer" :class="{ 'is-expanded': uiStore.isBluffsExpanded }">
      <!-- 功能標籤組 -->
      <div class="bluffs-tabs">
        <button class="bluffs-toggle-tab" @click="uiStore.isBluffsExpanded = !uiStore.isBluffsExpanded">
          <span class="tab-icon">{{ uiStore.isBluffsExpanded ? '›' : '‹' }}</span>
          <span class="tab-text">偽裝</span>
        </button>
        <button v-if="uiStore.isBluffsExpanded" class="bluffs-showcase-btn" @click="uiStore.isBluffsShowcase = true" title="展示給惡魔">
          <span class="icon">👁️</span>
        </button>
      </div>

      <div class="bluffs-box-fixed">
        <div class="bluffs-title">惡魔的偽裝</div>
        <div class="bluffs-list">
          <div 
            v-for="(role, idx) in gameStore.demonBluffs" 
            :key="idx"
            class="bluff-slot-vertical"
            @click="uiStore.openRolePickerForBluff(idx)"
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

    <div class="side-action-group">
      <button class="menu-btn" @click="uiStore.openPanel('settings')">
        <span class="icon">⚙️</span>
      </button>

      <button class="privacy-btn" :class="{ 'is-active': uiStore.isRolesHidden }" @click="uiStore.toggleRolesHidden()" :title="uiStore.isRolesHidden ? '顯示角色' : '隱藏角色'">
        <div class="privacy-icon-wrapper">
          <span class="icon">👁️</span>
          <span v-if="uiStore.isRolesHidden" class="ban-icon">🚫</span>
        </div>
      </button>

      <!-- 佈局與縮放控制項 -->
      <button class="side-action-btn layout-toggle-side" @click="uiStore.cycleReminderLayout()" :title="`佈局: ${layoutLabel}`">
        <span class="icon">{{ layoutIcon }}</span>
      </button>

      <!-- 縮放按鈕 -->
      <div class="zoom-controls-side">
        <button class="side-action-btn" @click="uiStore.zoomIn()" title="放大">
          <span class="icon">➕</span>
        </button>
        <button class="side-action-btn" @click="uiStore.resetZoom()" title="重置縮放">
          <span class="icon" style="font-size: 10px;">{{ Math.round(uiStore.grimoireScale * 100) }}%</span>
        </button>
        <button class="side-action-btn" @click="uiStore.zoomOut()" title="縮小">
          <span class="icon">➖</span>
        </button>
      </div>
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
    <RolePicker v-if="uiStore.rolePickerPlayer || uiStore.rolePickerDemonBluffIndex !== null" />
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
            v-for="(role, idx) in gameStore.demonBluffs" 
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'
import { useScriptStore } from '../stores/scriptStore'

import PlayerToken from './PlayerToken.vue'
import SettingsPanel from './SettingsPanel.vue'
import VotingPanel from './VotingPanel.vue'
import NightOrder from './NightOrder.vue'
import CharacterSheet from './CharacterSheet.vue'
import CharacterEditorPanel from './CharacterEditorPanel.vue'
import PlayerOrderPanel from './PlayerOrderPanel.vue'
import RoleAssignmentPanel from './RoleAssignmentPanel.vue'
import StatusBar from './StatusBar.vue'
import TimerWidget from './TimerWidget.vue'

import AddPlayerDialog from './AddPlayerDialog.vue'
import RenameDialog from './RenameDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import RolePicker from './RolePicker.vue'
import ReminderPicker from './ReminderPicker.vue'
import PlayerControlSheet from './PlayerControlSheet.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()
const scriptStore = useScriptStore()

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

const players = computed(() => gameStore.players)
const selectedPlayer = computed(() => 
  gameStore.players.find(p => p.id === uiStore.selectedPlayerId)
)

// --- 拖拽平移邏輯 (Panning Logic) ---
const isDragging = ref(false)
const startPos = { x: 0, y: 0 }
const startTranslate = { x: 0, y: 0 }

function handleMouseDown(e: MouseEvent | TouchEvent) {
  // 如果點擊的是令片或按鈕，則不觸發拖拽
  if ((e.target as HTMLElement).closest('.token-wrapper') || 
      (e.target as HTMLElement).closest('button') || 
      (e.target as HTMLElement).closest('.bluffs-drawer') ||
      (e.target as HTMLElement).closest('.panel-overlay-mask')) return

  isDragging.value = true
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  
  startPos.x = clientX
  startPos.y = clientY
  startTranslate.x = uiStore.grimoireTranslateX
  startTranslate.y = uiStore.grimoireTranslateY

  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('touchmove', handleMouseMove, { passive: false })
  window.addEventListener('touchend', handleMouseUp)
}

function handleMouseMove(e: MouseEvent | TouchEvent) {
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
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('touchmove', handleMouseMove)
  window.removeEventListener('touchend', handleMouseUp)
}

const layoutLabel = computed(() => {
  const map = { arc: '環繞', grid: '網格', stack: '側面', inner: '內圈' }
  return map[uiStore.reminderLayout as keyof typeof map]
})

const layoutIcon = computed(() => {
  const map = { arc: '⭕', grid: '⏹️', stack: '📋', inner: '⏬' }
  return map[uiStore.reminderLayout as keyof typeof map]
})

// 佈局全局參數：統一管理，確保計算與渲染 100% 同步
const LAYOUT_CONFIG = {
  a: 38,       // 水平半徑 (%)
  b: 30,       // 垂直半徑 (%) - 配合圓形公式縮小垂直比，分散頂底擁擠
  nFactor: 2.0, // 回歸圓形/正橢圓，這在長屏下能提供最均勻的視覺佈局
  yCenter: 55, // 整體垂直重心 (%)
  samples: 600  // 弧長取樣精度
}

/**
 * 弧長均分數據快取 (Arc-Length Parametrization)
 * 預先計算超橢圓的弧長分佈，避免每個令片重複運算了 600 次循環。
 */
const arcData = computed(() => {
  const { a, b, nFactor, samples } = LAYOUT_CONFIG
  const arcLengths = new Float32Array(samples + 1)
  let totalLength = 0
  
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
      totalLength += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
    }
    arcLengths[i] = totalLength
  }

  return { arcLengths, totalLength }
})

function getEquidistantAngle(index: number, n: number) {
  const { samples } = LAYOUT_CONFIG
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

function getPlayerPosStyle(index: number) {
  const n = players.value.length
  if (n === 0) return {}

  // 根據人數動態縮放令片
  const baseSize = n > 14 ? 75 : n > 11 ? 82 : n > 8 ? 92 : 105
  
  // 獲取等距角度
  const angle = getEquidistantAngle(index, n)
  const { a, b, nFactor, yCenter } = LAYOUT_CONFIG
  
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
  } as const
}

function getBluffIcon(role: any) {
  return role.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${role.id}`
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
    default: return null
  }
})

function starStyle(i: number) {
  const x = ((i * 7919) % 100)
  const y = ((i * 3571) % 70)
  const size = ((i * 1237) % 3) + 1
  const delay = ((i * 0.1) % 2)
  return {
    left: `${x}%`,
    top: `${y}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay}s`,
  }
}
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
  /* 白天模式：亮色羊皮紙 */
  background: radial-gradient(circle at 50% 40%, #f4e4bc 0%, #d2b48c 60%, #8d6e63 120%);
  transition: all 0.8s ease;
}

.grimoire-board.is-night .scene-bg {
  /* 夜晚模式：深色/陳舊羊皮紙 */
  background: radial-gradient(circle at 50% 40%, #8d6e63 0%, #4e342e 60%, #2a1b15 120%);
}

.scene-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("https://www.transparenttextures.com/patterns/p6.png");
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

.star {
  position: absolute;
  border-radius: 50%;
  background: white;
  animation: pulse 2s ease-in-out infinite;
  z-index: 1;
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

@keyframes pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.2); }
}

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
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 800;
  color: #2a1b15; /* 深色墨水感 */
  letter-spacing: 2px;
  text-shadow: 0 1px 1px rgba(255,255,255,0.3);
}

/* ─────────────────────────────────────────────────────────────────────────
   右下角：虛張聲勢可收納托盤 (Collapsible Bluffs Drawer) 
   ───────────────────────────────────────────────────────────────────────── */
.bluffs-drawer {
  position: fixed; /* 改為 fixed 確保在手機端滾動時位置不變 */
  bottom: 40px;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  /* 關鍵優化：向右位移 100% (藏起來)，但扣掉 32px (留標籤在外) */
  transform: translateX(calc(100% - 32px)); 
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.bluffs-drawer.is-expanded {
  transform: translateX(0); /* 展開時回到原點 */
}

.bluffs-tabs {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bluffs-toggle-tab {
  width: 28px;
  height: 90px;
  background: rgba(42, 27, 21, 0.9);
  border: 1px solid rgba(210, 180, 140, 0.4);
  border-right: none;
  border-radius: 8px 0 0 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: #d2b48c;
  box-shadow: -4px 0 15px rgba(0,0,0,0.3);
  z-index: 2;
}

.bluffs-showcase-btn {
  width: 28px;
  height: 44px;
  background: #b38b3d;
  color: #2a1b15;
  border: 1px solid rgba(255,255,255,0.2);
  border-right: none;
  border-radius: 6px 0 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: -4px 4px 10px rgba(0,0,0,0.2);
  transition: all 0.2s;
  z-index: 1;
}

.bluffs-showcase-btn:hover {
  background: #d4c8b0;
  width: 32px;
}

.tab-icon { font-size: 18px; font-weight: 800; }
.tab-text { font-size: 10px; writing-mode: vertical-lr; letter-spacing: 2px; }

.bluffs-box-fixed {
  background: rgba(20, 20, 28, 0.65);
  border: 1px solid rgba(210, 180, 140, 0.25);
  border-radius: 14px; /* 修改為四角皆圓角 */
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 5px 5px 20px rgba(0,0,0,0.5);
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
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 4;
  width: 80%;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.2;
  filter: grayscale(1) sepia(1) contrast(1.5);
}

.empty-title {
  font-family: var(--font-title);
  font-size: 26px;
  color: #3e2723;
  margin-bottom: 8px;
  letter-spacing: 4px;
}

.empty-sub {
  font-size: 15px;
  color: #5d4037;
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
  top: calc(70px + env(safe-area-inset-top, 0px));
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1000;
}

.zoom-controls-side {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(42, 27, 21, 0.4);
  padding: 6px;
  border-radius: 25px;
  border: 1px solid rgba(141, 110, 99, 0.3);
  backdrop-filter: blur(8px);
  margin-top: 4px;
}

.menu-btn, .privacy-btn, .side-action-btn.layout-toggle-side, .zoom-controls-side .side-action-btn {
  width: 44px;
  height: 44px;
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

.menu-btn:hover, .privacy-btn:hover, .side-action-btn.layout-toggle-side:hover, .zoom-controls-side .side-action-btn:hover {
  background: #b38b3d;
  color: #1a1b23;
  transform: scale(1.1);
}

.privacy-btn.is-active {
  background: rgba(244, 67, 54, 0.15);
  border-color: rgba(244, 67, 54, 0.5);
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.2);
}

.side-action-btn.layout-toggle-side .icon {
  font-size: 18px;
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
  font-size: 24px;
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
