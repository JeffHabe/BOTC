<template>
  <div class="grimoire-board" :class="{ 'is-night': gameStore.isNight }">
    <StatusBar />

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
    <div class="tokens-fixed-area">
      <!-- 中央劇本標誌 -->
      <div class="center-logo-box" @click="uiStore.openPanel('script-selector')">
        <div class="center-logo-inner">
          <img v-if="gameStore.script?.logo" :src="gameStore.script.logo" class="center-logo-img" />
          <span v-else class="center-logo-icon">📖</span>
        </div>
        <div class="center-script-name">{{ gameStore.script?.name || '選擇劇本' }}</div>
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
        />
      </div>
    </div>

    <!-- 側邊或浮動按鈕 -->
    <button class="add-player-btn" @click="uiStore.addPlayerDialogOpen = true">
      <span class="icon">➕</span>
    </button>

    <button class="menu-btn" @click="uiStore.openPanel('settings')">
      <span class="icon">⚙️</span>
    </button>

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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'
import { useScriptStore } from '../stores/scriptStore'

import PlayerToken from './PlayerToken.vue'
import SettingsPanel from './SettingsPanel.vue'
import VotingPanel from './VotingPanel.vue'
import NightOrder from './NightOrder.vue'
import CharacterSheet from './CharacterSheet.vue'
import ScriptSelector from './ScriptSelector.vue'
import PlayerOrderPanel from './PlayerOrderPanel.vue'
import RoleAssignmentPanel from './RoleAssignmentPanel.vue'
import StatusBar from './StatusBar.vue'

import AddPlayerDialog from './AddPlayerDialog.vue'
import RenameDialog from './RenameDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import RolePicker from './RolePicker.vue'
import ReminderPicker from './ReminderPicker.vue'
import PlayerControlSheet from './PlayerControlSheet.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()
const scriptStore = useScriptStore()

onMounted(async () => {
  await gameStore.loadState()
  // 如果目前沒有劇本，預設選擇第一項（全角色大全）
  if (!gameStore.script && scriptStore.allScripts.length > 0) {
    await scriptStore.selectScript(scriptStore.allScripts[0])
  }
})

const players = computed(() => gameStore.players)

// 佈局全局參數：統一管理，確保計算與渲染 100% 同步
const LAYOUT_CONFIG = {
  a: 38,       // 水平半徑 (%)
  b: 30,       // 垂直半徑 (%) - 配合圓形公式縮小垂直比，分散頂底擁擠
  nFactor: 2.0, // 回歸圓形/正橢圓，這在長屏下能提供最均勻的視覺佈局
  yCenter: 55, // 整體垂直重心 (%)
  samples: 600  // 弧長取樣精度
}

/**
 * 弧長均分算法 (Arc-Length Parametrization)
 * 確保在長方形螢幕下，鄰近令片的物理間距一致。
 */
function getEquidistantAngle(index: number, n: number) {
  const { a, b, nFactor, samples } = LAYOUT_CONFIG
  const arcLengths = new Float32Array(samples + 1)
  let totalLength = 0
  
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * 2 * Math.PI
    if (i > 0) {
      const prevT = ((i - 1) / samples) * 2 * Math.PI
      const getPt = (ang: number) => {
        const cosT = Math.cos(ang); const sinT = Math.sin(ang)
        return {
          x: a * Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / nFactor),
          y: b * Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / nFactor)
        }
      }
      const p1 = getPt(prevT); const p2 = getPt(t)
      totalLength += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
    }
    arcLengths[i] = totalLength
  }

  const targetLen = (index / n) * totalLength
  let low = 0, high = samples
  while (low < high) {
    const mid = (low + high) >>> 1
    if (arcLengths[mid] < targetLen) low = mid + 1
    else high = mid
  }

  // 線性插值以獲得更高精度
  const i = low
  const l1 = arcLengths[i - 1] || 0
  const l2 = arcLengths[i]
  const t1 = ((i - 1) / samples) * 2 * Math.PI
  const t2 = (i / samples) * 2 * Math.PI
  
  const fraction = (l2 === l1) ? 0 : (targetLen - l1) / (l2 - l1)
  const rawT = t1 + fraction * (t2 - t1)
  
  // 返回調整後的角度 (起始點調整為頂部 -90deg)
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

const activePanelComponent = computed(() => {
  switch (uiStore.activePanel) {
    case 'settings': return SettingsPanel
    case 'voting': return VotingPanel
    case 'night-order': return NightOrder
    case 'character-sheet': return CharacterSheet
    case 'script-selector': return ScriptSelector
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
.tokens-fixed-area {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
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
  z-index: 100; /* 提升層級確保最優先點擊 */
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
  bottom: 24px;
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

.menu-btn {
  position: fixed;
  top: 100px;
  right: 16px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(42, 27, 21, 0.85);
  border: 1.5px solid #8d6e63;
  color: #f4e4bc;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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

@keyframes fogDrift {
  from { transform: translateX(0); }
  to { transform: translateX(5%); }
}
@keyframes glowPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}
</style>
