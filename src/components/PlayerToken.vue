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
      <div class="name-label-box" :class="[namePositionClass, { 'has-reminders': player.reminders.length > 0 }]" :style="nameStyle">
        <span class="seat-num">{{ index + 1 }}.</span>
        <span class="player-name-text">{{ player.name || '' }}</span>
        <!-- 狀態圖示 (是否有投票權等) 移入姓名標籤中 -->
        <div class="status-indicators-inline">
          <span v-if="!player.is_alive && player.has_ghost_vote" class="ghost-vote" title="擁有靈魂投票權">
            <img src="/pic/grave.png" class="ghost-vote-img" />
          </span>
          <span v-if="!player.can_nominate && !(player.extra_nominations && player.extra_nominations > 0)" class="nominate-lock" title="今日已不能提名">
            <img src="/pic/nomination.png" class="nominate-lock-img" />
          </span>
        </div>
      </div>
    
      <!-- 核心圓形令片內部 (圖示與角色名) -->
      <div class="token-inner-content">
        <!-- 角色圖示 -->
        <div class="role-icon-inner" :class="uiStore.isRolesHidden ? 'hidden-role' : player.role?.role_type.toLowerCase()">
          <!-- 隱藏模式時完全留白，不渲染任何圖示 -->
          <img v-if="player.role?.image && !uiStore.isRolesHidden" :src="player.role.image" :alt="player.role.name" class="role-img" />
          <span v-else-if="player.role && !uiStore.isRolesHidden" class="role-text-fallback">{{ player.role.name.charAt(0) }}</span>
        </div>
        <!-- 角色名稱 (弧形顯示) -->
        <svg v-if="player.role && !uiStore.isRolesHidden" viewBox="0 0 100 100" class="role-name-svg">
        <path 
          :id="'nameCurve-' + player.id" 
          d="M 10 70 A 45 35 0 0 0 90 70"  
          fill="transparent" 
        />
        <text>
          <textPath 
            :href="'#nameCurve-' + player.id" 
            startOffset="52%"
            text-anchor="middle"
            dominant-baseline="middle"
            class="curved-name-text"
            :style="{ fontSize: player.role.name.length > 4 ? (player.role.name.length > 5 ? '13px' : '15px') : '18px' }"
          >
            {{ player.role.name }}
          </textPath>
        </text>
      </svg>
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
          :style="getReminderStyle(rIdx + 1)"
          @click.stop="uiStore.openReminderPicker(player.id)"
        >
          <div class="rem-inner">
            <img v-if="rem.text.includes('善良')" src="/pic/good.png" class="rem-role-img" />
            <img v-else-if="rem.text.includes('邪惡')" src="/pic/evil.png" class="rem-role-img" />
            <img v-else-if="getSourceChar(rem.source_role)?.image" 
                 :src="getSourceChar(rem.source_role)!.image!" 
                 class="rem-role-img" />
            <span v-else class="rem-emoji-icon">{{ getReminderIcon(rem.text) }}</span>

            <!-- 小 token 內部弧形文字 -->
            <svg viewBox="0 0 100 100" class="rem-name-svg">
              <path 
                :id="'remCurve-' + rem.id" 
                d="M 12 72 A 42 32 0 0 0 88 72"  
                fill="transparent" 
              />
              <text>
                <textPath 
                  :href="'#remCurve-' + rem.id" 
                  startOffset="52%"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  class="rem-curved-name-text"
                  :style="{ fontSize: rem.text.length > 3 ? '20px' : '24px' }"
                >
                  {{ rem.text }}
                </textPath>
              </text>
            </svg>
          </div>
        </div>

        <!-- 🔓 展開解鎖按鈕 (只在收起狀態顯示，點擊後立刻消失) -->
        <div 
          v-if="player.reminders.length > uiStore.reminderCollapseThreshold && !isExpanded"
          key="expand-unlock-icon-btn"
          class="rem-dot-classic expand-toggle-btn unlock-btn"
          :style="getReminderStyle(1)"
          @click.stop="toggleExpand"
        >
          <div class="rem-inner">
            <span class="expand-icon">🔓</span>
            <!-- 🔓 內置解鎖數字弧形文字 -->
            <svg viewBox="0 0 100 100" class="rem-name-svg">
              <path 
                :id="'remCurve-unlock-' + player.id" 
                d="M 12 72 A 42 32 0 0 0 88 72"  
                fill="transparent" 
              />
              <text>
                <textPath 
                  :href="'#remCurve-unlock-' + player.id" 
                  startOffset="52%"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  class="rem-curved-name-text"
                >
                  {{ `+${player.reminders.length}` }}
                </textPath>
              </text>
            </svg>
          </div>
        </div>

        <!-- 🔒 收起鎖頭按鈕 (只在展開狀態顯示，完全展開後延遲出現在提示標誌尾端) -->
        <div 
          v-if="player.reminders.length > uiStore.reminderCollapseThreshold && isExpanded"
          key="expand-lock-icon-btn"
          class="rem-dot-classic expand-toggle-btn lock-btn"
          :style="{
            ...getReminderStyle(player.reminders.length + 1),
            '--lock-delay': `${(player.reminders.length + 1) * 0.04 + 0.1}s`
          }"
          @click.stop="toggleExpand"
        >
          <div class="rem-inner">
            <span class="expand-icon">🔒</span>
            <!-- 🔒 內置收起弧形文字 -->
            <svg viewBox="0 0 100 100" class="rem-name-svg">
              <path 
                :id="'remCurve-lock-' + player.id" 
                d="M 12 72 A 42 32 0 0 0 88 72"  
                fill="transparent" 
              />
              <text>
                <textPath 
                  :href="'#remCurve-lock-' + player.id" 
                  startOffset="52%"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  class="rem-curved-name-text"
                >
                  收起
                </textPath>
              </text>
            </svg>
          </div>
        </div>

        <!-- 新增/編輯提示標記的加號按鈕 -->
        <div 
          key="add-reminder-btn-global"
          class="add-reminder-btn"
          :style="getReminderStyle(0, true)"
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
  // 如果標記多於設定的收納上限，收起狀態下一個都不顯示 (全部隱藏)
  if (props.player.reminders.length > uiStore.reminderCollapseThreshold) return []
  // 否則正常顯示
  return props.player.reminders
})

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

const namePositionClass = computed(() => {
  // 統一固定在上方
  return 'pos-top'
})

const nameStyle = computed(() => {
  // 🚀 優化點 1：如果是弧線模式，且展開了，且玩家有提示標記，名字標籤向上優雅地推升至 138% 軌道以躲閃展開的提示標記
  if (uiStore.reminderLayout === 'arc' && isExpanded.value && props.player.reminders.length > 0) {
    return {
      bottom: '138%',
      transition: 'bottom 0.35s cubic-bezier(0.25, 0.8, 0.25, 1)'
    }
  }
  return {
    bottom: '105%',
    transition: 'bottom 0.35s cubic-bezier(0.25, 0.8, 0.25, 1)'
  }
})

/**
 * 根據來源角色名稱獲取角色定義 (用於獲取頭像)
 */
function getSourceChar(sourceName: string) {
  if (!sourceName || sourceName === '劇本' || sourceName === '自定義') return null
  // 修正：scriptStore 中正確的屬性是 masterScript.characters
  return scriptStore.masterScript?.characters?.find(c => c.name === sourceName) || null
}


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
  const ratio = window.innerWidth / window.innerHeight

  // 幾何徑向角度優化：計算從魔典中心指向玩家令片中心的實際物理角度，以保證標記在橢圓、矩形等模式下都能與中心點完美成一直線
  const shape = uiStore.grimoireShape
  const count = gameStore.players.length
  const layoutBoost = count > 14 ? 6 : (count > 11 ? 3 : 0)

  let dx = Math.cos(angle)
  let dy = Math.sin(angle)

  if (shape === 'oval') {
    const ovalA = 36 + layoutBoost
    const ovalB = 24 + layoutBoost
    dx = ovalA * Math.cos(angle)
    dy = ovalB * Math.sin(angle)
  } else if (shape === 'circle') {
    const baseA = 36 + layoutBoost
    const baseB = baseA * ratio
    dx = baseA * Math.cos(angle)
    dy = baseB * Math.sin(angle)
  } else if (shape === 'rect') {
    const baseARect = 34 + layoutBoost
    const baseBRect = Math.max(baseARect * ratio * 1, 25 + layoutBoost)
    const nFactor = 3.2
    const cosT = Math.cos(angle)
    const sinT = Math.sin(angle)
    dx = baseARect * Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / nFactor)
    dy = baseBRect * Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / nFactor)
  }

  // 核心幾何物理修正：將水平分量 dx 乘以寬高比 ratio，以消除長方形螢幕拉伸對角度計算產生的物理扭曲，保證在任何解析度下連線均呈完美直線
  const radialAngle = Math.atan2(dy, dx * ratio)

  // --- 全局標記間距配置 ---
  // 優化間距以容納小 token 圓圈本身 (直徑 30px) 與下方的文字標籤 (偏移 12px + 文字高度約 10px)，確保在任何角度下圖示與文字均不會重疊擠壓
  const unitHeight = 15 * uiStore.grimoireScale // 1️⃣ 一個小令片本身所占用的實體高度 (px)
  const spacing = 25 * uiStore.grimoireScale   // 2️⃣ 小令片與小令片之間的額外空白安全間隔 (px)
  const tokenPxSize = 100 * uiStore.grimoireScale * (autoScaleFactor.value || 1)
  const gap = ((unitHeight + spacing) / tokenPxSize) * 90 // 3️⃣ 換算後的百分比軌道間距
  // -----------------------

  let styleObj: any = {}

  // 1. 內圈向心模式 (Inner - Single Radial Column)
  if (layout === 'inner') {
    const deg = (props.angle * 180) / Math.PI
    const isBottomHalf = deg > 40 && deg < 135 // 針對底部範圍
    // 🚀 優化：將起始軌道拉回貼近令片的 10px 黃金間距軌道 (底部 75%，其餘 70%)
    const effectiveBaseDist = isBottomHalf ? 75 : 70

    // const distV = effectiveBaseDist + rIdx * gap
    // 基礎起點 (rIdx = 0，也就是加號的位置)
    let distV = effectiveBaseDist
    if (rIdx > 0) {
      const firstGap = gap * 1       // 1️⃣ 第一個小 token 離加號的距離 (可調小，讓它貼近加號)
      const subsequentGap = gap * 1.6  // 2️⃣ 後續小令片彼此之間的距離 (可調大，拉開小令片間距)
      
      distV += firstGap + (rIdx - 1) * subsequentGap
    }

    const top = 50 - (distV * Math.sin(radialAngle))
    const left = 50 - (distV * Math.cos(radialAngle))

    styleObj = {
      top: `${top}%`,
      left: `${left}%`,
      width: `${45 * uiStore.grimoireScale}px`,
      height: `${45 * uiStore.grimoireScale}px`,
      fontSize: `${9 * uiStore.grimoireScale}px`,
      position: 'absolute',
      transform: 'translate(-50%, -50%)'
    }
  }

  // 2. 經典弧形 (Arc) - 對稱環繞模式
  else if (layout === 'arc') {
    // --- 弧形佈局配置區 ---
    const innerRadius = 56                     // 內圈標記半徑 (包含加號、提示標記、鎖頭等)
    const arcSpread = 42                       // 標記之間的展開角度 (度)
    // -----------------------
    
    const spreadAngle = arcSpread * (Math.PI / 180) 
    const radius = innerRadius
    const finalAngle = radialAngle + (rIdx) * spreadAngle

    const top = 50 - (radius * Math.sin(finalAngle)) 
    const left = 50 - (radius * Math.cos(finalAngle))
    
    styleObj = {
      top: `${top}%`,
      left: `${left}%`,
      width: `${36 * uiStore.grimoireScale}px`,
      height: `${36 * uiStore.grimoireScale}px`,
      fontSize: `${8.5 * uiStore.grimoireScale}px`,
      position: 'absolute',
      transform: 'translate(-50%, -50%)',
      zIndex: 2000,
      // --- 增加逐個展開動畫 ---
      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      // 展開狀態時，所有元素都參與階梯式延遲
      transitionDelay: isExpanded.value ? `${rIdx * 0.04}s` : '0s'
    }
  }

  // 3. 側面堆疊 (Stack)
  else if (layout === 'stack') {
    const degBase = (props.angle * 180) / Math.PI
    const isBottomHalf = degBase > 40 && degBase < 135
    const baseDist = isBottomHalf ? 80 : 60
    
    const side = isRight ? 'right' : 'left'
    const sideDist = '120%'
    
    // 讓起點也參考向心模式的基礎高度感
    const topOffset = (baseDist / 100) * (40 * uiStore.grimoireScale)
    styleObj = {
      top: `${rIdx * (50 * uiStore.grimoireScale) + topOffset}px`, 
      [side]: sideDist,
      width: `${36 * uiStore.grimoireScale}px`,
      height: `${36 * uiStore.grimoireScale}px`,
      fontSize: `${8.5 * uiStore.grimoireScale}px`,
      position: 'absolute',
      zIndex: 2000,
    }
  }

  // 4. 網格模式 (Grid)
  else {
    const degBase = (props.angle * 180) / Math.PI
    const isBottomHalf = degBase > 40 && degBase < 135
    const baseDist = isBottomHalf ? 80 : 60
    
    styleObj = { 
      '--r-idx': rIdx, 
      zIndex: 2000,
      '--base-dist': baseDist,
      transition: 'all 0.3s ease-out',
      transitionDelay: (isExpanded.value && !isPlus && rIdx > 0) ? `${rIdx * 0.05}s` : '0s'
    }
  }

  // 注入全域逐個延遲自定義變數
  styleObj['--rem-delay'] = `${rIdx * 0.05}s`
  return styleObj as any
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
  background: url('/pic/token1.png') no-repeat center center;
  background-size: cover;
  border-radius: 50%;
  box-shadow: 
    0 4px 10px rgba(0,0,0,0.5), 
    inset 0 0 8px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.is-selected .token-body.classic {
  border-color: #f1c40f;
  box-shadow: 0 0 12px rgba(241, 196, 15, 0.4), 0 6px 15px rgba(0,0,0,0.6);
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
  box-shadow: 0 2px 5px rgba(0,0,0,0.6);
  z-index: 50; /* 提高層級，確保在標記之上 */
  max-width: 140%;
  display: flex;
  align-items: center;
  gap: 2px;
  backdrop-filter: blur(4px);
  pointer-events: none;
}

.pos-top {
  bottom: 105%; /* 名字與大令片物理距離精準固定在 5px 左右 (即 105% 軌道)，保持高度緊湊的頂級桌遊視覺美感 */
}

/* 移除 pos-bottom，統一由 .pos-top 覆蓋 */
.pos-bottom {
  bottom: 105%;
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
}

.role-img {
  width: 90%;
  height: 90%;
  object-fit: contain;
  /* 簡化濾鏡，移除耗能的 drop-shadow */
  filter: contrast(1.05) brightness(0.95);
}

.role-emoji, .role-placeholder {
  font-size: 52px;
  /* 使用 text-shadow 代替 filter: drop-shadow，效能更好 */
  text-shadow: 0 2px 10px rgba(0,0,0,0.5);
}

.role-text-fallback {
  font-size: 42px;
  font-weight: 900;
  font-family: 'ChineseFont', var(--font-title), sans-serif;
  color: currentColor;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  user-select: none;
}

.role-icon-inner.townsfolk { color: var(--color-townsfolk, #4a9bd4); }
.role-icon-inner.outsider  { color: var(--color-outsider, #49c5b6); }
.role-icon-inner.minion    { color: var(--color-minion, #e87070); }
.role-icon-inner.demon     { color: var(--color-demon, #8b1a1a); }
.role-icon-inner.traveler  { color: #8bb34d; }
.role-icon-inner.fabled    { color: #e6c547; }

.role-name-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 3;
}

.curved-name-text {
  font-size: 18px;        /* 稍微縮小一點點，21px 有時會導致路徑溢出 */
  font-weight: 900;
  fill: #1a1b23;
  font-family: var(--font-title), 'ChineseFont', sans-serif;
  
  /* 關鍵修正：確保文字渲染優化，減少偏移 */
  text-rendering: optimizeLegibility;
  
  /* 視覺效果 */
  paint-order: stroke;
  stroke: rgba(255, 255, 255, 0.85);
  stroke-width: 1px;
  stroke-linecap: round;
  stroke-linejoin: round;
  
  /* 字距調整：如果還是偏左，可以稍微減少這個數值 */
  letter-spacing: 4px; 
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
  width: 36px;
  height: 36px;
  /* width and height are handled by dynamic styles in getReminderStyle */
  background: url('/pic/reminder1.png') no-repeat center center;
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
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
}

.rem-emoji-icon {
  font-size: 10px; /* 進一步加大以填充圓圈 */
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
  padding: 0px 4px;
  border-radius: 3px;
  font-size: 7.5px;
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
  top: 50%; /* 永遠以圖示的正中心為起點 */
  transform: translateY(12px); /* 固定往下推 18px，調整此數字即可控制固定距離 */
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
  width: 94px; /* 放大寬度以容納放大後的 token */
}
.layout-grid .rem-dot-classic {
  position: static;
  transform: none;
  width: 32px;
  height: 32px;
  margin: 1px;
  font-size: 11px;
}

/* 側面堆疊 (Stack) - JS 已處理方位 */
.layout-stack .rem-dot-classic {
  transform: none;
  width: 34px;
  height: 34px;
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

.status-indicators-inline .ghost-vote-img {
  width: 11px;
  height: 11px;
  object-fit: contain;
  vertical-align: middle;
}

.status-indicators-inline .nominate-lock-img {
  width: 11px;
  height: 11px;
  object-fit: contain;
  vertical-align: middle;
}

.pointer-events-none {
  pointer-events: none;
}

.add-reminder-btn {
  position: absolute;
  width: 24px !important;
  height: 24px !important;
  background: rgba(42, 42, 53, 0.9);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
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

/* 🚀 🔒 收起鎖頭在完全展開後再優雅浮現的自適應卡點動畫 */
.lock-btn, .lock-label {
  animation: lock-bloom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both !important;
  animation-delay: var(--lock-delay, 0.1s) !important;
}

@keyframes lock-bloom {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* 🚀 提示標記與標籤的逐個展開 (Bloom) 自適應動畫 */
.rem-dot-classic, .rem-label-container, .add-reminder-btn {
  animation: reminder-bloom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: var(--rem-delay, 0s);
}

@keyframes reminder-bloom {
  from {
    opacity: 0;
    transform: var(--rem-transform, translate(-50%, -50%)) scale(0.3);
  }
  to {
    opacity: 1;
    transform: var(--rem-transform, translate(-50%, -50%)) scale(1);
  }
}

/* 在動畫中對不同佈局的變形基準 (transform) 進行適配 */
.rem-dot-classic {
  --rem-transform: translate(-50%, -50%);
}

.rem-label-container {
  --rem-transform: translate(-50%, -50%);
}

.add-reminder-btn {
  --rem-transform: translate(-50%, -50%);
}

/* 側面堆疊 (Stack) 與 網格 (Grid) 佈局不需要 translate(-50%, -50%) 偏移量，故適配為 none */
.layout-stack .rem-dot-classic,
.layout-stack .rem-label-container,
.layout-stack .add-reminder-btn {
  transform: none;
  --rem-transform: none;
}

.layout-grid .rem-dot-classic,
.layout-grid .rem-label-container,
.layout-grid .add-reminder-btn {
  transform: none;
  --rem-transform: none;
}

/* 提示標記內置弧形文字樣式 */
.rem-name-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}

.rem-curved-name-text {
  font-family: 'ChineseFont', 'NewsFont', var(--font-title), sans-serif;
  font-weight: 900;
  fill: #fff;
  font-size: 24px;
  text-shadow: 0 1.5px 3px rgba(0, 0, 0, 0.95), 0 0 2.5px rgba(0, 0, 0, 0.95);
  letter-spacing: 0.5px;
}
</style>
