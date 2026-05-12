<template>
  <div class="status-bar" :class="{ 'is-night': gameStore.isNight }">
    <div class="status-inner">
      <!-- 左側：角色類型計數 (統計配置) -->
      <div class="stat-group stats-config" :class="{ 'is-hidden': uiStore.isRolesHidden }">
        <span class="stat-item townsfolk">
          <span class="label">鎮</span>
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
      <div class="phase-control">
        <button class="nav-btn" @click="gameStore.revertPhase()" title="退回上個階段">◀</button>
        <div class="phase-display" @click="uiStore.togglePanel('settings')" title="開啟設定">
          <div class="phase-badge" :class="`phase-${gameStore.phase.toLowerCase()}`">
            <template v-if="gameStore.phase === 'FirstNight' || gameStore.phase === 'Setup'">
              <span class="phase-text">首夜</span>
            </template>
            <template v-else>
              <span class="phase-text">
                第 {{ gameStore.round }}
                <template v-if="gameStore.phase === 'Day' && gameStore.round > 0">天</template>
                <template v-if="gameStore.phase === 'Night' && gameStore.round > 0">夜</template>
              </span>
            </template>
          </div>
        </div>
        <button class="nav-btn" @click="gameStore.advancePhase()" title="推進下個階段">▶</button>
      </div>

      <!-- 右側：存活狀態 (保留核心數據) -->
      <div class="stat-group stats-alive">
        <span class="stat-item threshold" v-if="gameStore.phase === 'Day'" title="門檻">
          <span class="stat-icon">🙋</span>
          <span class="stat-num">{{ gameStore.threshold }}</span>
        </span>
        <span class="stat-item alive" title="存活人數">
          <span class="stat-icon">❤️</span>
          <span class="stat-num">{{ gameStore.alive }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'
const gameStore = useGameStore()
const uiStore = useUIStore()

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


</script>

<style scoped>
.status-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(18, 18, 24, 0.85);
  backdrop-filter: blur(15px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08); /* 改為底邊細線更現代 */
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  height: calc(50px + env(safe-area-inset-top, 0px));
  transition: all 0.3s ease;
}

.status-inner {
  height: 50px;
  margin-top: env(safe-area-inset-top, 0px);
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.stat-group {
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1; /* 位於中間按鈕下方 */
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.stats-config {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-group.is-hidden {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}

.phase-control {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  z-index: 2;
  padding: 0 2px;
}

.phase-display {
  cursor: pointer;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-gold-muted);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: rgba(201, 168, 76, 0.2);
  color: var(--color-gold);
  border-color: var(--color-gold);
}

.nav-btn:active {
  transform: scale(0.9);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.stat-item.is-hidden {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}

.stat-item .label {
  font-size: 10px;
  font-weight: 700;
  margin-right: 1px;
}

.stat-item.townsfolk { color: #5dade2; }
.stat-item.outsider  { color: #48c9b0; }
.stat-item.minion    { color: #ec7063; }
.stat-item.demon     { color: #f1948a; }

.stat-num {
  font-weight: 700;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 11px;
}



.phase-badge {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 4px 16px;
  border-radius: 20px;
  display: flex;
  flex-direction: row; /* 恢復水平排列 */
  gap: 4px;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  font-weight: 700;
  white-space: nowrap;
}

.phase-text {
  font-size: 14px;
}

.phase-day .phase-text { color: #f1c40f; }
.phase-night .phase-text { color: #a9cce3; }

.stat-icon {
  font-size: 14px;
  display: flex;
  align-items: center;
}

.layout-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.layout-icon {
  font-size: 13px;
}
</style>
