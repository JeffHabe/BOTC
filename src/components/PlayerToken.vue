<template>
  <div 
    class="player-token" 
    :class="{ 
      'is-dead': !player.is_alive,
      'has-role': !!player.role,
      'is-selected': uiStore.selectedPlayerId === player.id,
      'pointer-events-none': renderedPart === 'info',
      'on-right-side': isOnRightSide
    }"
    @contextmenu.prevent="openContextMenu"
    @click="handleClick"
  >
    <!-- 背景光暈 -->
    <div v-if="renderedPart === 'all' || renderedPart === 'body'" class="token-glow" :class="player.role?.role_type.toLowerCase()" />

    <!-- 玩家令片主體 -->
    <div v-if="renderedPart === 'all' || renderedPart === 'body'" class="token-body classic">
      <!-- 玩家姓名標籤 (包含編號) -->
      <div class="name-label-box">
        <span class="seat-num">{{ index + 1 }}</span> {{ player.name }}
      </div>

      <!-- 核心圓形令片 (羊皮紙質感) -->
      <div class="token-canvas">
        <!-- 角色圖示 -->
        <div class="role-icon-classic" :class="player.role?.role_type.toLowerCase()">
          <img v-if="player.role?.image" :src="player.role.image" :alt="player.role.name" class="role-img" />
          <span v-else-if="player.role" class="role-emoji">{{ roleEmoji }}</span>
          <!-- 移除預設人頭，以展示自定義背景 -->
        </div>
      </div>

      <!-- 角色名稱標籤 -->
      <div v-if="player.role" class="role-label-box" :class="player.role.role_type.toLowerCase()">
        {{ player.role.name }}
      </div>

      <!-- 死亡緞帶 (絲綢風格 繁體/簡體) -->
      <div v-if="!player.is_alive" class="death-ribbon">
        <span class="ribbon-text">死亡</span>
      </div>

      <!-- 提示標記容器 (弧形分佈) -->
      <div class="reminders-classic-container">
        <div 
          v-for="(rem, rIdx) in player.reminders" 
          :key="rem.id" 
          class="rem-dot-classic"
          :style="{ '--r-idx': rIdx }"
          @click.stop="uiStore.openReminderPicker(player.id)"
        >
          {{ getReminderIcon(rem.text) }}
        </div>
      </div>
    </div>


    <!-- 狀態圖示 (是否有投票權等) -->
    <div class="status-indicators">
      <span v-if="!player.is_alive && player.has_ghost_vote" class="ghost-vote" title="擁有靈魂投票權">👻</span>
      <span v-if="!player.can_nominate" class="nominate-lock" title="今日已不能提名">🚫</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import type { Player } from '../types'

const props = withDefaults(defineProps<{
  player: Player
  index: number
  renderedPart?: 'all' | 'body' | 'info'
  isOnRightSide?: boolean
}>(), {
  renderedPart: 'all',
  isOnRightSide: false
})

const uiStore = useUIStore()
const gameStore = useGameStore()

const roleEmoji = computed(() => {
  if (!props.player.role) return ''
  const map: Record<string, string> = {
    Townsfolk: '', Outsider: '', Minion: '🔱', Demon: '😈', Traveler: '🧳'
  }
  return map[props.player.role.role_type] || '❓'
})

function handleClick(e: MouseEvent) {
  // 手機端單擊改為直接選中
  uiStore.selectPlayer(props.player.id)
}

function openContextMenu(e: MouseEvent) {
  // 為了桌面端兼容性，雖然現在主推 Bottom Sheet
  uiStore.selectPlayer(props.player.id)
}
function getReminderIcon(text: string) {
  if (text.includes('中毒')) return '🧪'
  if (text.includes('醉酒')) return '🍺'
  if (text.includes('處決')) return '⚖️'
  if (text.includes('選中')) return '🎯'
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

.name-label-box {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-label-bg);
  color: #fff;
  padding: 2px 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 4px 10px rgba(0,0,0,0.6);
  z-index: 10;
  max-width: 120%;
  display: flex;
  align-items: center;
  gap: 6px;
}

.seat-num {
  color: var(--color-gold-bright);
  font-size: 13px;
  opacity: 0.9;
}

.token-canvas {
  width: 65%;
  height: 65%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.role-icon-classic {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.role-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: contrast(1.1) brightness(0.9) drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

.role-emoji, .role-placeholder {
  font-size: 48px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

.role-label-box {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-label-bg);
  color: #fff;
  padding: 1px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 4px 8px rgba(0,0,0,0.6);
  z-index: 10;
}

.death-ribbon {
  position: absolute;
  top: 50%;
  left: -15%;
  right: -15%;
  height: 22px;
  background: linear-gradient(90deg, transparent 5%, rgba(139, 26, 26, 0.9) 20%, rgba(139, 26, 26, 0.9) 80%, transparent 95%);
  border-top: 1px solid rgba(255,255,255,0.1);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  transform: translateY(-50%) rotate(-18deg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.ribbon-text {
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 4px;
  text-shadow: 0 1px 4px rgba(0,0,0,0.8);
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
  /* 弧形定位邏輯：從右側 30度開始向下排列 */
  --angle-deg: calc(var(--r-idx) * 32 - 10);
  --angle: calc(var(--angle-deg) * 1deg);
  top: calc(50% + 52% * sin(var(--angle)));
  left: calc(50% + 52% * cos(var(--angle)));
  
  /* 如果在右側，則將提示內容翻轉到左邊顯示，避免截斷 */
  .on-right-side & {
    left: calc(50% - 52% * cos(var(--angle)));
  }
  
  transform: translate(-50%, -50%);

  width: 24px;
  height: 24px;
  background: #fff;
  color: #2a1b15;
  border: 1.5px solid #5d4037;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 2px 3px 6px rgba(0,0,0,0.4);
  transition: all 0.3s ease;
}

.rem-dot-classic:hover {
  transform: translate(-50%, -50%) scale(1.2);
  z-index: 25;
}

.role-name-inner.townsfolk { color: var(--color-townsfolk); }
.role-name-inner.outsider  { color: var(--color-outsider); }
.role-name-inner.minion    { color: var(--color-minion); }
.role-name-inner.demon     { color: var(--color-demon); }

.role-name.townsfolk { color: var(--color-townsfolk); }
.role-name.outsider  { color: var(--color-outsider); }
.role-name.minion    { color: var(--color-minion); }
.role-name.demon     { color: var(--color-demon); }

.status-indicators {
  position: absolute;
  bottom: 0;
  display: flex;
  gap: 4px;
}

.status-indicators span {
  font-size: 14px;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));
}
.pointer-events-none {
  pointer-events: none;
}
</style>
