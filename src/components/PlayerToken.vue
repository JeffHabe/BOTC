<template>
  <div 
    class="player-token"
    :class="[
      { 
        'is-dead': !player.is_alive,
        'has-role': !!player.role,
        'is-selected': uiStore.selectedPlayerId === player.id,
        'pointer-events-none': renderedPart === 'info',
        'on-right-side': isOnRightSide
      },
      `layout-${uiStore.reminderLayout}`
    ]"
    @contextmenu.prevent="openContextMenu"
    @click="handleClick"
    @mousedown="onPointerDown"
    @touchstart="onPointerDown"
    @mouseup="onPointerUp"
    @touchend="onPointerUp"
    @touchcancel="onPointerUp"
    @touchmove="onPointerMove"
    @mouseleave="onPointerUp"
  >
    <!-- 背景光暈 -->
    <div v-if="renderedPart === 'all' || renderedPart === 'body'" class="token-glow" :class="uiStore.isRolesHidden ? 'hidden-role' : player.role?.role_type.toLowerCase()" />

    <!-- 玩家令片主體 -->
    <div v-if="renderedPart === 'all' || renderedPart === 'body'" class="token-body classic">
      <!-- 玩家姓名與編號標籤 -->
      <div class="name-label-box" :class="namePositionClass">
        <span class="seat-num">{{ index + 1 }}.</span>
        <span class="player-name-text">{{ player.name || '空白' }}</span>
        <!-- 狀態圖示 (是否有投票權等) 移入姓名標籤中 -->
        <div class="status-indicators-inline">
          <span v-if="!player.is_alive && player.has_ghost_vote" class="ghost-vote" title="擁有靈魂投票權">👻</span>
          <span v-if="!player.can_nominate" class="nominate-lock" title="今日已不能提名">🚫</span>
        </div>
      </div>

      <!-- 核心圓形令片內部 (圖示與角色名) -->
      <div class="token-inner-content">
        <!-- 角色圖示 -->
        <div class="role-icon-inner" :class="uiStore.isRolesHidden ? 'hidden-role' : player.role?.role_type.toLowerCase()">
          <!-- 隱藏模式時完全留白，不渲染任何圖示 -->
          <img v-if="player.role?.image && !uiStore.isRolesHidden" :src="player.role.image" :alt="player.role.name" class="role-img" />
          <span v-else-if="player.role && !uiStore.isRolesHidden" class="role-emoji">{{ roleEmoji }}</span>
        </div>
        
        <!-- 角色名稱 -->
        <div v-if="player.role && !uiStore.isRolesHidden" class="role-name-inner">
          {{ player.role.name }}
        </div>
      </div>

      <!-- 死亡緞帶 (絲綢風格 繁體/簡體) -->
      <div v-if="!player.is_alive" class="death-ribbon">
        <span class="ribbon-text">死</span>
        <span class="ribbon-text">亡</span>
      </div>

      <!-- 夜晚順序標誌 (雅典寶石風格 - 移至緞帶後方確保不被遮擋) -->
      <div v-if="player.role && gameStore.relativeNightOrder.first[player.role.id] && !uiStore.isRolesHidden" class="night-order-badge first-night" title="首夜順序">
        {{ gameStore.relativeNightOrder.first[player.role.id] }}
      </div>
      <div v-if="player.role && gameStore.relativeNightOrder.other[player.role.id] && !uiStore.isRolesHidden" class="night-order-badge other-night" title="其他夜晚順序">
        {{ gameStore.relativeNightOrder.other[player.role.id] }}
      </div>

      <!-- 提示標記容器 (分層渲染以確保文字置頂) -->
      <div class="reminders-classic-container" v-if="!uiStore.isRolesHidden">
        <!-- 第一層：所有的圓圈圖示 -->
        <div 
          v-for="(rem, rIdx) in player.reminders" 
          :key="'circle-' + rem.id" 
          class="rem-dot-classic"
          :style="getReminderStyle(rIdx)"
          @click.stop="uiStore.openReminderPicker(player.id)"
        >
          <div class="rem-inner">
            <img v-if="rem.text.includes('善良')" src="/good.png" class="rem-role-img" />
            <img v-else-if="rem.text.includes('邪惡')" src="/evil.png" class="rem-role-img" />
            <img v-else-if="getSourceChar(rem.source_role)?.image" 
                 :src="getSourceChar(rem.source_role)!.image!" 
                 class="rem-role-img" />
            <span v-else class="rem-emoji-icon">{{ getReminderIcon(rem.text) }}</span>
          </div>
        </div>

        <!-- 第二層：所有的文字標籤 (置頂) -->
        <div 
          v-for="(rem, rIdx) in player.reminders" 
          :key="'label-' + rem.id" 
          class="rem-label-container"
          :style="getReminderStyle(rIdx)"
        >
          <span class="rem-text-label">
            {{ (rem.source_role && rem.source_role !== '劇本' && rem.source_role !== '自定義') ? `${rem.source_role}: ${rem.text}` : rem.text }}
          </span>
        </div>

        <!-- 新增/編輯提示標記的加號按鈕 -->
        <div 
          class="add-reminder-btn"
          :style="getReminderStyle(player.reminders.length > 0 ? player.reminders.length + 0.6 : 0)"
          @click.stop="uiStore.openReminderPicker(player.id)"
          title="新增/編輯提示標記"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/>
          </svg>
        </div>
      </div>
    </div>


    <!-- 狀態圖示已移至姓名標籤中 -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useScriptStore } from '../stores/scriptStore'
import { useGameStore } from '../stores/gameStore'
import type { Player } from '../types'

const props = withDefaults(defineProps<{
  player: Player
  index: number
  renderedPart?: 'all' | 'body' | 'info'
  isOnRightSide?: boolean
  angle?: number
}>(), {
  renderedPart: 'all',
  isOnRightSide: false,
  angle: 0
})

const uiStore = useUIStore()
const scriptStore = useScriptStore()
const gameStore = useGameStore()

const namePositionClass = computed(() => {
  if (props.angle === undefined) return 'pos-bottom'
  const deg = (props.angle * 180) / Math.PI
  // 正規化角度到 -180 ~ 180
  let norm = deg
  while (norm > 180) norm -= 360
  while (norm < -180) norm += 360
  // 上半部玩家：-165 ~ -15 度
  return (norm < -15 && norm > -165) ? 'pos-top' : 'pos-bottom'
})

/**
 * 根據來源角色名稱獲取角色定義 (用於獲取頭像)
 */
function getSourceChar(sourceName: string) {
  if (!sourceName || sourceName === '劇本' || sourceName === '自定義') return null
  // 修正：scriptStore 中正確的屬性是 masterScript.characters
  return scriptStore.masterScript?.characters?.find(c => c.name === sourceName) || null
}

const roleEmoji = computed(() => {
  if (!props.player.role) return ''
  const map: Record<string, string> = {
    Townsfolk: '', Outsider: '', Minion: '🔱', Demon: '😈', Traveler: '🧳'
  }
  return map[props.player.role.role_type] || '❓'
})

function handleClick(e: Event) {
  if (hasTriggeredLongPress || uiStore.isArrangingPlayers) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
  // 手機端單擊改為直接選中
  uiStore.selectPlayer(props.player.id)
}

function openContextMenu(e: Event) {
  if (hasTriggeredLongPress || uiStore.isArrangingPlayers) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
  // 為了桌面端兼容性，雖然現在主推 Bottom Sheet
  uiStore.selectPlayer(props.player.id)
}

let longPressTimer: any = null
let hasTriggeredLongPress = false

function onPointerDown() {
  if (uiStore.isArrangingPlayers) return
  hasTriggeredLongPress = false
  longPressTimer = setTimeout(() => {
    hasTriggeredLongPress = true
    uiStore.isArrangingPlayers = true
    if ('vibrate' in navigator) navigator.vibrate(50)
  }, 400) // 縮短時間至400ms，確保在系統的contextmenu(通常500ms)之前觸發
}

function onPointerMove() {
  // 如果手指滑動了，取消長按判定
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function onPointerUp() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  // hasTriggeredLongPress 留到 click 或 contextmenu 判斷完再重置
  setTimeout(() => {
    hasTriggeredLongPress = false
  }, 100)
}

/**
 * 動態計算提示標記的位置樣式
 * 解決了 CSS 不支援 取模(%) 與 floor() 的限制，且相容性更高。
 */
function getReminderStyle(rIdx: number) {
  const layout = uiStore.reminderLayout
  const angle = props.angle || 0 // 弧度
  const isRight = props.isOnRightSide

  // 1. 內圈向心模式 (Inner - Single Radial Column)
  if (layout === 'inner') {
    // 單排垂直向心：沿著真實向心向量排列
    const baseDist = 75 
    const gap = 30
    const distV = baseDist + rIdx * gap

    // 這裡的 angle 已經是從中心指向玩家的真實幾何角度
    // 往中心移動就是減去向量
    const top = 50 - (distV * Math.sin(angle) * 0.75)
    const left = 50 - (distV * Math.cos(angle) * 0.75)
    
    return {
      top: `${top}%`,
      left: `${left}%`,
      width: '30px',
      height: '30px',
      fontSize: '9px',
      position: 'absolute',
      transform: 'translate(-50%, -50%)',
      /* 移除行內 zIndex，改由 CSS 控制 */
    }
  }

  // 2. 經典弧形 (Arc)
  if (layout === 'arc') {
    const deg = (rIdx * 55 - 10) * (Math.PI / 180) /* 增加角度 45 -> 55 */
    let l = 50 + 68 * Math.cos(deg)
    const t = 50 + 68 * Math.sin(deg)
    if (isRight) l = 50 - 68 * Math.cos(deg)
    
    return {
      top: `${t}%`,
      left: `${l}%`,
      position: 'absolute',
      transform: 'translate(-50%, -50%)'
    }
  }

  // 3. 側面堆疊 (Stack)
  if (layout === 'stack') {
    const side = isRight ? 'right' : 'left'
    return {
      top: `${rIdx * 38 + 10}px`,
      [side]: '125%', /* 增加側邊距離 110% -> 125% */
      position: 'absolute'
    }
  }

  // 4. 網格模式 (Grid)
  // Grid 模式比較特殊，我們可以用 CSS Flex 處理，這裡只需傳回索引
  return { '--r-idx': rIdx } as any
}

function getReminderIcon(text: string) {
  if (text.includes('中毒')) return '⚗️'
  if (text.includes('醉酒')) return '🍺'
  if (text.includes('處決')) return '🪦'
  if (text.includes('選中')) return '🎯'
  if (text.includes('刀') || text.includes('殺')) return '🔪'
  if (text.includes('守衛') || text.includes('保護')) return '🛡️'
  if (text.includes('死亡') || text.includes('亡')) return '💀'
  if (text.includes('真')) return '✅'
  if (text.includes('假')) return '❌'
  if (text.includes('偵測') || text.includes('查')) return '🔍'
  return text.charAt(0)
}
</script>

<style scoped>
.player-token {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  cursor: pointer;
  width: 100%;
  height: 100%;
  user-select: none;
}

.token-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  filter: blur(20px);
  opacity: 0.15;
  transition: all 0.5s ease;
  z-index: 0;
}

.token-glow.townsfolk { background: #4a9bd4; }
.token-glow.outsider  { background: #49c5b6; }
.token-glow.minion    { background: #e87070; }
.token-glow.demon     { background: #8b1a1a; }
.token-glow.hidden-role { background: #888; }

.player-token:hover .token-glow { opacity: 0.3; }

.token-body.classic {
  position: relative;
  width: 100%;
  height: 100%;
  background: url('/token1.png') no-repeat center center;
  background-size: cover;
  border-radius: 50%;
  box-shadow: 
    0 8px 20px rgba(0,0,0,0.5), 
    inset 0 0 15px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.is-selected .token-body.classic {
  border-color: #f1c40f;
  box-shadow: 0 0 25px rgba(241, 196, 15, 0.4), 0 10px 30px rgba(0,0,0,0.6);
  transform: scale(1.04);
}

.is-dead .token-body.classic {
  filter: grayscale(0.0) brightness(1.0);
  opacity: 1.0;
}

.name-label-box {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-label-bg);
  color: #fff;
  padding: 0px 4px;
  border-radius: 4px;
  font-size: 10px;
  line-height: 1;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 3px 8px rgba(0,0,0,0.5);
  z-index: 10;
  max-width: 120%;
  display: flex;
  align-items: center;
  gap: 1px;
  height: 14px;
}

.pos-bottom {
  bottom: -18px;
}

.pos-top {
  top: -18px;
}

.seat-num {
  color: var(--color-gold-bright);
  font-size: 10px;
  opacity: 0.9;
}

.token-inner-content {
  width: 85%; /* 從 76% 提升到 85% */
  height: 85%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 0px;
}

.role-icon-inner {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  margin-bottom: -4px;
}

.role-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: contrast(1.1) brightness(0.9) drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

.role-emoji, .role-placeholder {
  font-size: 52px; /* 從 44px 提升到 52px */
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

.role-name-inner {
  font-size: 10px; /* 稍微縮小字體以適應長名稱 */
  font-weight: 900;
  color: #1a1b23;
  letter-spacing: 0.5px; /* 縮減間距 */
  text-align: center;
  white-space: nowrap;
  font-family: var(--font-title), sans-serif;
  text-shadow: 0 1px 2px rgba(255,255,255,0.8);
  max-width: 90%; /* 限制寬度 */
  overflow: hidden;
  text-overflow: clip;
  transform: scale(0.9);
}

.death-ribbon {
  position: absolute;
  top: 55%; /* 稍微偏下方，完美環繞角色圖示 */
  left: -15%;
  right: -15%;
  height: 15px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(122, 26, 26, 0.9) 10%, 
    rgba(159, 26, 26, 0.6) 25%, 
    rgba(159, 26, 26, 0.6) 75%, 
    rgba(122, 26, 26, 0.9) 90%, 
    transparent 100%
  );
  border-top: 1px solid rgba(255,255,255,0.1);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  transform: translateY(-50%) rotate(-15deg);
  display: flex;
  align-items: center;
  justify-content: space-between; /* 讓 "死" 與 "亡" 分居兩側 */
  padding: 0 18%; /* 調整間距，確保文字剛好在令片邊緣內側 */
  z-index: 5;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.ribbon-text {
  font-size: 11px;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,0.8);
  /* 移除原有的 letter-spacing，因為現在是分開的 */
}

.reminders-classic-container {
  position: absolute;
  inset: -8px; /* 擴張容器以覆蓋邊緣 */
  pointer-events: none;
  z-index: 20;
}

.rem-dot-classic {
  pointer-events: auto;
  position: absolute;
  transform: translate(-50%, -50%);
  width: 30px; /* 縮小基礎尺寸 36 -> 30 */
  height: 30px;
  background: url('/reminder1.png') no-repeat center center;
  background-size: cover;
  color: var(--color-gold-muted);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 2px 4px 8px rgba(0,0,0,0.4);
  transition: all 0.3s ease;
  overflow: visible;
  z-index: 20; /* 基礎層級 */
}

.rem-inner {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.rem-role-img {
  width: 75%;
  height: 75%;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
}

.rem-emoji-icon {
  font-size: 14px; /* 縮小尺寸以免超出圓圈 */
  font-weight: 700;
  max-width: 90%;
  max-height: 90%;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4));
  text-shadow: 0 1px 2px rgba(0,0,0,0.6);
}

.rem-text-label {
  font-family: 'ChineseFont', 'NewsFont', sans-serif !important;
  background: rgba(20, 20, 25, 0.95);
  color: #fff;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 8.5px;
  white-space: nowrap;
  pointer-events: none;
  border: 0.5px solid rgba(255,255,255,0.15);
  line-height: 1.1;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.rem-label-container {
  pointer-events: none;
  position: absolute;
  width: 1px;
  height: 1px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100; /* 顯著高於所有圓圈 (20+) */
}

.rem-label-container .rem-text-label {
  position: absolute;
  bottom: 23px; /* 調整至圓圈下方（因為定位點在中心） */
  /* 因為 30px 圓圈半徑是 15px，文字在下方 offset 約 8px = 23px */
  transform: translateY(35px); /* 從 38px 調窄至 35px */
}

/* --- 佈局樣式控制 --- */

/* 經典弧形 (Arc) - JS 已計算座標，這裡僅處理共用樣式 */
.layout-arc .rem-dot-classic {
  z-index: 21;
}

/* 網格模式 (Grid) - 依然使用 Flex 以保持整齊 */
.layout-grid .reminders-classic-container {
  display: flex;
  flex-wrap: wrap-reverse;
  justify-content: flex-end;
  align-content: flex-end;
  padding: 4px;
}
.layout-grid .rem-dot-classic {
  position: static;
  transform: none;
  width: 20px;
  height: 20px;
  margin: 1px;
  font-size: 11px;
}

/* 側面堆疊 (Stack) - JS 已處理方位 */
.layout-stack .rem-dot-classic {
  transform: none;
  width: 22px;
  height: 22px;
}

/* 內圈向心 (Inner) - JS 已計算座標 */
.layout-inner .rem-dot-classic {
  z-index: 25;
}

.rem-dot-classic:hover {
  transform: translate(-50%, -50%) scale(1.2);
  z-index: 25;
}

/* 僅針對不需要 transform: translate 的模式恢復 scale 效果 */
.layout-grid .rem-dot-classic:hover,
.layout-stack .rem-dot-classic:hover {
  transform: scale(1.2);
}



.status-indicators-inline {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 4px; /* 與名字保持一點間距 */
}

.status-indicators-inline span {
  font-size: 11px; /* 稍微縮小以配合標籤高度 */
  filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));
  line-height: 1;
}

.pointer-events-none {
  pointer-events: none;
}

.add-reminder-btn {
  position: absolute;
  width: 20px !important;
  height: 20px !important;
  background: rgba(42, 42, 53, 0.9);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 25;
  box-shadow: 0 2px 6px rgba(0,0,0,0.6);
  transition: all 0.2s ease;
  pointer-events: auto;
}

.add-reminder-btn:hover {
  background: rgba(60, 60, 75, 0.95);
  transform: translate(-50%, -50%) scale(1.15) !important;
  border-color: rgba(255, 255, 255, 0.6);
}

.add-reminder-btn:active {
  transform: translate(-50%, -50%) scale(0.95) !important;
}

/* --- 夜晚順序標誌 (雅典風格) --- */
.night-order-badge {
  position: absolute;
  top: 50%;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  color: #fff;
  z-index: 10;
  transform: translateY(-50%);
  font-family: 'Cinzel', serif;
  box-shadow: 0 2px 5px rgba(0,0,0,0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  pointer-events: none;
}

.first-night {
  top: 28%; /* 移至左上方 */
  left: -1px;
  background: radial-gradient(circle at 30% 30%, #4a89c4, #1a3a5a);
  border-color: rgba(192, 160, 74, 0.3); /* 微弱金邊 */
}

.other-night {
  top: 72%; /* 移至右下方 */
  right: -1px;
  background: radial-gradient(circle at 30% 30%, #c43232, #4d1212);
  border-color: rgba(192, 160, 74, 0.3); /* 微弱金邊 */
}
</style>
