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
      <div v-if="!player.is_alive" class="death-ribbon" :class="deathTypeClass">
        <span class="ribbon-text">{{ deathLabel[0] }}</span>
        <span class="ribbon-text">{{ deathLabel[1] }}</span>
      </div>

      <!-- 夜晚順序標誌 (祖母綠切割寶石) -->
      <!-- 只有在準備或首夜階段才顯示首夜順序 -->
      <div v-if="player.role && gameStore.relativeNightOrder.first[player.role.id] && !uiStore.isRolesHidden && (gameStore.phase === 'FirstNight' || gameStore.phase === 'Setup')" class="night-order-badge first-night" title="首夜順序">
        <span class="badge-number">{{ gameStore.relativeNightOrder.first[player.role.id] }}</span>
      </div>
      <!-- 在白天或其他夜晚階段則顯示其他夜晚順序 -->
      <div v-if="player.role && gameStore.relativeNightOrder.other[player.role.id] && !uiStore.isRolesHidden && (gameStore.phase !== 'FirstNight' && gameStore.phase !== 'Setup')" class="night-order-badge other-night" title="其他夜晚順序">
        <span class="badge-number">{{ gameStore.relativeNightOrder.other[player.role.id] }}</span>
      </div>

      <!-- 提示標記容器 (分層渲染以確保文字置頂) -->
      <div class="reminders-classic-container" v-if="!uiStore.isRolesHidden">
        <!-- 第一層：所有的圓圈圖示 -->
        <div 
          v-for="(rem, rIdx) in displayReminders" 
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

        <!-- 展開/收起按鈕 (圖示層) -->
        <div 
          v-if="player.reminders.length > 4"
          key="expand-icon-btn"
          class="rem-dot-classic expand-toggle-btn"
          :style="getReminderStyle(isExpanded ? player.reminders.length : 0)"
          @click.stop="toggleExpand"
        >
          <div class="rem-inner">
            <span class="expand-icon">{{ isExpanded ? '▲' : '🕯️' }}</span>
          </div>
        </div>

        <!-- 第二層：所有的文字標籤 (置頂) -->
        <div 
          v-for="(rem, rIdx) in displayReminders" 
          :key="'label-' + rem.id" 
          class="rem-label-container"
          :style="getReminderStyle(rIdx)"
        >
          <span class="rem-text-label">
            {{ rem.text }}
          </span>
        </div>

        <!-- 展開/收起按鈕 (文字層) -->
        <div 
          v-if="player.reminders.length > 4"
          key="expand-label-btn"
          class="rem-label-container"
          :style="getReminderStyle(isExpanded ? player.reminders.length : 0)"
        >
          <span class="rem-text-label expand-label">
            {{ isExpanded ? '收起' : `+${player.reminders.length}` }}
          </span>
        </div>

        <!-- 新增/編輯提示標記的加號按鈕 -->
        <div 
          key="add-reminder-btn-global"
          class="add-reminder-btn"
          :style="getReminderStyle(isExpanded ? player.reminders.length + 1 : (player.reminders.length > 4 ? 1 : player.reminders.length), true)"
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
import { computed, ref } from 'vue'
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

// 標記展開/收納狀態
const isExpanded = ref(false)

// 方案三：根據人數自動縮放令片大小 (防止擁擠)
const autoScaleFactor = computed(() => {
  const count = gameStore.players.length
  if (count <= 14) return 1.0
  // 每多一人縮小約 4%，最低不小於 0.7
  return Math.max(0.7, 1 - (count - 14) * 0.045)
})

// 當前顯示的標記
const displayReminders = computed(() => {
  // 如果處於展開狀態，顯示全部
  if (isExpanded.value) return props.player.reminders
  // 如果標記多於 4 個，收起狀態下一個都不顯示 (全部隱藏)
  if (props.player.reminders.length > 4) return []
  // 否則 (4 個及以下) 正常顯示
  return props.player.reminders
})

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

const namePositionClass = computed(() => {
  // 統一固定在上方
  return 'pos-top'
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
function getReminderStyle(rIdx: number, isPlus = false) {
  const layout = uiStore.reminderLayout
  const angle = props.angle || 0 // 弧度
  const isRight = props.isOnRightSide

  // --- 全局標記間距配置 ---
  const unitHeight = 1 * uiStore.grimoireScale // 一個標記 (圖示+文字) 的總高度
  const spacing = 30                      // 標記與標記之間的物理間隔 (px)
  const tokenPxSize = 100 * uiStore.grimoireScale * (autoScaleFactor.value || 1)
  const gap = ((unitHeight + spacing) / tokenPxSize) * 100
  // -----------------------

  // 1. 內圈向心模式 (Inner - Single Radial Column)
  if (layout === 'inner') {
    const deg = (props.angle * 180) / Math.PI
    const isBottomHalf = deg > 40 && deg < 135 // 針對底部範圍
    // 基礎起點：底部玩家推遠以避開名字，其餘 60%
    const effectiveBaseDist = isBottomHalf ? 85 : 60
    const spacing = 35

    let distV = effectiveBaseDist + rIdx * gap

    // --- 針對加號按鈕的特別優化 ---
  if (isPlus) {
      // 如果只有加號且沒標記
    if (props.player.reminders.length === 0) {
        distV = isBottomHalf ? 70 : 60
      } 
      // 如果加號緊跟在「🕯️ 展開按鈕」後面 (收起狀態)
      else if (!isExpanded.value && props.player.reminders.length > 4) {
        // 縮小間距，讓加號靠近展開按鈕 (使用較小的 32px 基準)

      const tightGap = ((0 + spacing) / tokenPxSize) * 100
        distV = effectiveBaseDist + tightGap
    }
  }

    const top = 50 - (distV * Math.sin(angle))
    const left = 50 - (distV * Math.cos(angle))

    return {
      top: `${top}%`,
      left: `${left}%`,
      width: `${30 * uiStore.grimoireScale}px`,
      height: `${30 * uiStore.grimoireScale}px`,
      fontSize: `${9 * uiStore.grimoireScale}px`,
      position: 'absolute',
      transform: 'translate(-50%, -50%)'
    }
  }

  // 2. 經典弧形 (Arc) - 對稱環繞模式
  if (layout === 'arc') {
    const degBase = (props.angle * 180) / Math.PI
    const isBottomHalf = degBase > 25 && degBase < 135
    
    // --- 弧形佈局配置區 ---
    const arcRadius = isBottomHalf ? 60 : 60  // 標記環繞的半徑 (離令片中心的距離)
    const arcSpread = 45                        // 標記之間的展開角度 (度)
    // -----------------------
    const spacing = 50

    let radius = arcRadius
    
    // 如果只有一個加號，同步其高度
    if (isPlus && props.player.reminders.length === 0) {
      radius = isBottomHalf ? 60 : 60
  }

    // --- 對稱扇形邏輯 ---
    // 計算總共有多少個元素需要排列 (標記 + 功能按鈕)
    // const totalItems = isExpanded.value 
    //   ? props.player.reminders.length + (props.player.reminders.length > 2 ? 2 : 1) 
    //   : (props.player.reminders.length > 2 ? 2 : props.player.reminders.length + 1)

    const spreadAngle = arcSpread * (Math.PI / 180) 
    // const centerIdx = (totalItems - 1) / 2
    
    // 先計算基礎角度 (扇形分佈)
    let finalAngle =angle + (rIdx ) * spreadAngle
    // --- 關鍵修改：加號固定在「外側肩膀」位置 (半徑加大到 110) ---
    if (isPlus) {
      // 1. 根據令片位置偏移角度 (朝向魔典中央垂直線)
      // 左側玩家 (isRight=false) 向右偏 30 度，右側玩家 (isRight=true) 向左偏 30 度
      // const shoulderOffset = (isRight ? 30 : -30) * (Math.PI / 180)
      finalAngle =angle
      // finalAngle = angle + shoulderOffset
      const tightGap = ((0 + spacing) / tokenPxSize) * 100
      radius = arcRadius + tightGap-25
    }
    const top = 50 - (radius * Math.sin(finalAngle)) 
    const left = 50 - (radius * Math.cos(finalAngle))
    return {
      top: `${top}%`,
      left: `${left}%`,
      width: `${30 * uiStore.grimoireScale}px`,
      height: `${30 * uiStore.grimoireScale}px`,
      fontSize: `${9 * uiStore.grimoireScale}px`,
      position: 'absolute',
      transform: 'translate(-50%, -50%)',
      zIndex: 2000,
      // --- 增加逐個展開動畫 ---
      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      // 只要是展開狀態，所有元素 (包括蠟燭和加號) 都參與階梯式延遲
      transitionDelay: isExpanded.value ? `${rIdx * 0.05}s` : '0s'
    }
  }

  // 3. 側面堆疊 (Stack)
  if (layout === 'stack') {
    const degBase = (props.angle * 180) / Math.PI
    const isBottomHalf = degBase > 40 && degBase < 135
    const baseDist = isBottomHalf ? 80 : 60
    
    const side = isRight ? 'right' : 'left'
    const sideDist = (isPlus && props.player.reminders.length === 0) ? '105%' : '125%'
    
    // 讓起點也參考向心模式的基礎高度感
    const topOffset = (baseDist / 100) * 40
    return {
      top: `${rIdx * 50 + topOffset}px`, 
      [side]: sideDist,
      width: `${28 * uiStore.grimoireScale}px`,
      height: `${28 * uiStore.grimoireScale}px`,
      fontSize: `${8.5 * uiStore.grimoireScale}px`,
      position: 'absolute',
      zIndex: 2000,
      // --- 增加逐個展開動畫 ---
      // transition: 'all 0.3s ease-out',
      // transitionDelay: (isExpanded.value && !isPlus && rIdx > 0) ? `${rIdx * 0.05}s` : '0s'
    }
  }

  // 4. 網格模式 (Grid)
  const degBase = (props.angle * 180) / Math.PI
  const isBottomHalf = degBase > 40 && degBase < 135
  const baseDist = isBottomHalf ? 80 : 60
  
  return { 
    '--r-idx': rIdx, 
    zIndex: 2000,
    '--base-dist': baseDist,
    transition: 'all 0.3s ease-out',
    transitionDelay: (isExpanded.value && !isPlus && rIdx > 0) ? `${rIdx * 0.05}s` : '0s'
  } as any
}

function getReminderIcon(text: string) {
  if (text.includes('中毒')) return '⚗️'
  if (text.includes('醉酒')) return '🍺'
  if (text.includes('處決')) return '⚖️'
  if (text.includes('被殺')) return '🔪'
  if (text.includes('選中')) return '🎯'
  if (text.includes('刀') || text.includes('殺')) return '🔪'
  if (text.includes('守衛') || text.includes('保護')) return '🛡️'
  if (text.includes('死亡') || text.includes('亡')) return '💀'
  if (text.includes('真')) return '✅'
  if (text.includes('假')) return '❌'
  if (text.includes('偵測') || text.includes('查')) return '🔍'
  return text.charAt(0)
}

const deathLabel = computed(() => {
  if (props.player.reminders.some(r => r.text === '處決')) return '處決'
  if (props.player.reminders.some(r => r.text === '被殺')) return '被殺'
  return '死亡'
})

const deathTypeClass = computed(() => {
  if (props.player.reminders.some(r => r.text === '處決')) return 'type-execution'
  if (props.player.reminders.some(r => r.text === '被殺')) return 'type-killed'
  return ''
})
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
  background: rgba(10, 10, 15, 0.85); /* 加深背景 */
  color: #fff;
  padding: 1px 4px; /* 增加內距 */
  border-radius: 12px; /* 更圓潤 */
  font-size: 8px; /* 稍微變大 */
  line-height: 1.2;
  font-weight: 800;
  white-space: nowrap;
  border: 1px solid rgba(255,255,255,0.15);
  box-shadow: 0 4px 10px rgba(0,0,0,0.6);
  z-index: 50; /* 提高層級，確保在標記之上 */
  max-width: 140%;
  display: flex;
  align-items: center;
  gap: 2px;
  backdrop-filter: blur(4px);
  pointer-events: none;
}

.pos-top {
  bottom: 100%; /* 從 115% 增加到 125%，進一步拉開空間 */
}

/* 移除 pos-bottom，統一由 .pos-top 覆蓋 */
.pos-bottom {
  bottom: 110%;
}

.seat-num {
  color: var(--color-gold-bright);
  font-size: 5px;
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
  /* 簡化濾鏡，移除耗能的 drop-shadow */
  filter: contrast(1.05) brightness(0.95);
}

.role-emoji, .role-placeholder {
  font-size: 52px;
  /* 使用 text-shadow 代替 filter: drop-shadow，效能更好 */
  text-shadow: 0 2px 10px rgba(0,0,0,0.5);
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

.death-ribbon.type-execution {
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(139, 26, 26, 0.95) 10%, 
    rgba(224, 32, 32, 0.6) 25%, 
    rgba(224, 32, 32, 0.6) 75%, 
    rgba(139, 26, 26, 0.95) 90%, 
    transparent 100%
  );
}

.death-ribbon.type-killed {
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(74, 10, 10, 0.95) 10%, 
    rgba(100, 20, 20, 0.6) 25%, 
    rgba(100, 20, 20, 0.6) 75%, 
    rgba(74, 10, 10, 0.95) 90%, 
    transparent 100%
  );
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
  z-index: 2000; /* 設定極高層級，嘗試跨越堆疊上下文 */
}

.rem-dot-classic {
  pointer-events: auto;
  position: absolute;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  /* width and height are handled by dynamic styles in getReminderStyle */
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
  bottom: 23px; 
  transform: translateY(33px); /* 稍微上移 2px (35->33)，增加緊湊感 */
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
  width: 70px; /* 限制寬度：20px*3 + 間距，強制每 3 個換行 */
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

.expand-toggle-btn {
  background: rgba(184, 134, 11, 0.4); /* 金金色系 */
  border: 1px solid rgba(255, 215, 0, 0.4);
  box-shadow: 0 0 8px rgba(218, 165, 32, 0.3);
}

.expand-icon {
  font-size: 10px;
  font-weight: 900;
  color: #ffd700;
  text-shadow: 0 0 3px rgba(0,0,0,0.8);
}

.expand-label {
  background: rgba(184, 134, 11, 0.95) !important;
  color: #fff !important;
  font-weight: 900 !important;
  border: 0.5px solid rgba(255, 215, 0, 0.5) !important;
}

.add-reminder-btn:hover {
  background: rgba(60, 60, 75, 0.95);
  transform: translate(-50%, -50%) scale(1.15) !important;
  border-color: rgba(255, 255, 255, 0.6);
}

.add-reminder-btn:active {
  transform: translate(-50%, -50%) scale(0.95) !important;
}

/* --- 夜晚順序標誌 (圓形刻面寶石風格) --- */
.night-order-badge {
  position: absolute;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  z-index: 10;
  transform: translateY(-50%);
  border-radius: 50%;
  font-family: 'Cinzel', serif;
  pointer-events: none;
  box-shadow: 
    0 0px 5px rgba(0,0,0,0.5),
    inset 0 0 4px rgba(255,255,255,0.2);
  border: 0.5px solid rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

.badge-number {
  position: relative;
  z-index: 1; /* 低於高光層 */
  text-shadow: 0 1px 5px rgba(0,0,0,0.8);
  opacity: 0.85;
  filter: drop-shadow(0 0 3px rgba(255,255,255,0.0));
}

/* 建立 8 個刻面 (Facets) */
.first-night {
  top: 28%;
  left: -2px;
  background: conic-gradient(
    from 22.5deg,
    #2a5a8a 0deg 45deg,
    #3d7ab7 45deg 90deg,
    #2a5a8a 90deg 135deg,
    #1a3a5a 135deg 180deg,
    #2a5a8a 180deg 225deg,
    #3d7ab7 225deg 270deg,
    #2a5a8a 270deg 315deg,
    #1a3a5a 315deg 360deg
  );
}

.other-night {
  top: 72%;
  right: -2px;
  background: conic-gradient(
    from 22.5deg,
    #8a1a1a 0deg 45deg,
    #b32a2a 45deg 90deg,
    #8a1a1a 90deg 135deg,
    #5a0a0a 135deg 180deg,
    #8a1a1a 180deg 225deg,
    #b32a2a 225deg 270deg,
    #8a1a1a 270deg 315deg,
    #5a0a0a 315deg 360deg
  );
}

/* 中心台面 (Table) - 模仿樣板中的內部八角形 */
.night-order-badge::before {
  content: '';
  position: absolute;
  inset: 4px;
  background: inherit;
  filter: brightness(1.25) contrast(1.1);
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  z-index: -1; /* 設為負值確保在文字下方 */
  border: 0.5px solid rgba(255,255,255,0.15);
}

/* 頂部高光與反光感 (Reflective Gloss) */
.night-order-badge::after {
  content: '';
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(135deg, 
    rgba(255,255,255,0.6) 0%, 
    rgba(255,255,255,0) 50%, 
    rgba(255,255,255,0) 60%, 
    rgba(255,255,255,0.2) 100%);
  pointer-events: none;
  z-index: 3; /* 高於 .badge-number (1) */
  opacity: 0.9;
}
</style>
