<template>
  <div class="status-bar" :class="{ 'is-night': gameStore.isNight }">
    <div class="status-inner">
      <!-- 左側：角色類型計數 (統計配置) -->
      <div class="stat-group stats-config">
        <span class="stat-item townsfolk">
          <span class="label">民</span>
          <span class="stat-num">{{ townCount }}</span>
        </span>
        <span class="stat-item outsider">
          <span class="label">外</span>
          <span class="stat-num">{{ outsiderCount }}</span>
        </span>
        <span class="stat-item minion">
          <span class="label">爪</span>
          <span class="stat-num">{{ minionCount }}</span>
        </span>
        <span class="stat-item demon">
          <span class="label">惡</span>
          <span class="stat-num">{{ demonCount }}</span>
        </span>
      </div>

      <!-- 中央：輪次與階段 -->
      <div class="phase-display" @click="uiStore.togglePanel('settings')">
        <div class="phase-badge" :class="`phase-${gameStore.phase.toLowerCase()}`">
          <span class="phase-text">{{ phaseLabel }}</span>
          <span v-if="gameStore.round > 0" class="round-text">Day {{ gameStore.round }}</span>
        </div>
      </div>

      <!-- 右側：存活狀態 -->
      <div class="stat-group stats-alive">
        <span class="stat-item total" title="總人數">
          <span class="stat-icon">👤</span>
          <span class="stat-num">{{ gameStore.players.length }}</span>
        </span>
        <span class="stat-item alive" title="存活">
          <span class="stat-icon">💚</span>
          <span class="stat-num">{{ gameStore.alive }}</span>
        </span>
        <span v-if="gameStore.phase === 'Day'" class="stat-item threshold" title="門檻">
          <span class="stat-icon">⚖️</span>
          <span class="stat-num">{{ gameStore.threshold }}</span>
        </span>

        <!-- 提示佈局切換 -->
        <button class="layout-btn" @click="uiStore.cycleReminderLayout()" :title="`目前佈局: ${layoutLabel}`">
          <span class="layout-icon">{{ layoutIcon }}</span>
        </button>
        
        <!-- 通知圖示預留 -->
        <button class="notif-btn" title="通知中心">
          <span class="notif-icon">🔔</span>
          <span class="notif-badge" v-if="hasUnread"></span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'
import { PHASE_LABEL } from '../types'

const gameStore = useGameStore()
const uiStore = useUIStore()
const hasUnread = ref(false)

const phaseLabel = computed(() => PHASE_LABEL[gameStore.phase])

const townCount = computed(() =>
  gameStore.players.filter(p => p.role?.role_type === 'Townsfolk').length
)
const outsiderCount = computed(() =>
  gameStore.players.filter(p => p.role?.role_type === 'Outsider').length
)
const minionCount = computed(() =>
  gameStore.players.filter(p => p.role?.role_type === 'Minion').length
)
const demonCount = computed(() =>
  gameStore.players.filter(p => p.role?.role_type === 'Demon').length
)

const layoutLabel = computed(() => {
  const map = { arc: '環繞', grid: '網格', stack: '側面', inner: '內圈' }
  return map[uiStore.reminderLayout]
})

const layoutIcon = computed(() => {
  const map = { arc: '⭕', grid: '⏹️', stack: '📋', inner: '⏬' }
  return map[uiStore.reminderLayout]
})
</script>

<style scoped>
.status-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(18, 18, 24, 0.7);
  backdrop-filter: blur(10px);
  border-top: 2px solid #3498db;
  box-shadow: 0 0 15px rgba(52, 152, 219, 0.3), 0 2px 10px rgba(0,0,0,0.5);
  height: calc(42px + env(safe-area-inset-top, 0px));
  transition: all 0.5s ease;
}

.status-bar.is-night {
  border-top-color: #8fa8cc;
  box-shadow: 0 0 15px rgba(143, 168, 204, 0.3);
}

.status-inner {
  height: 42px;
  margin-top: env(safe-area-inset-top, 0px);
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.stat-item .label {
  font-size: 12px;
  opacity: 0.7;
}

.stat-item.townsfolk { color: #4a9bd4; }
.stat-item.outsider  { color: #49c5b6; }
.stat-item.minion    { color: #e87070; }
.stat-item.demon     { color: #ff3e3e; }

.stat-num {
  font-weight: 700;
  font-family: 'Roboto Mono', monospace;
}

.phase-display {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  cursor: pointer;
}

.phase-badge {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
}

.phase-day .phase-text { color: #f1c40f; }
.phase-night .phase-text { color: #8fa8cc; }

.round-text {
  font-size: 12px;
  opacity: 0.6;
  border-left: 1px solid rgba(255,255,255,0.2);
  padding-left: 6px;
}

.stats-alive {
  gap: 12px;
}

.stat-icon {
  font-size: 14px;
}

.notif-btn {
  background: none;
  border: none;
  padding: 4px;
  position: relative;
  margin-left: 6px;
  color: #888;
}

.notif-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  background: #ff3e3e;
  border-radius: 50%;
  box-shadow: 0 0 5px #ff3e3e;
}

.layout-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.layout-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.layout-icon {
  font-size: 14px;
}
</style>
