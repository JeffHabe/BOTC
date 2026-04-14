<template>
  <div class="toggle-container" :class="{ 'is-night': gameStore.isNight }" @click="toggle">
    <div class="toggle-track">
      <div class="toggle-thumb">
        <span v-if="!gameStore.isNight">☀️</span>
        <span v-else>🌙</span>
      </div>
      <div class="toggle-labels">
        <span class="label">白天</span>
        <span class="label">夜晚</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'

const gameStore = useGameStore()
const uiStore = useUIStore()

async function toggle() {
  const nextPhase = gameStore.isNight ? 'Day' : 'Night'
  const message = nextPhase === 'Day' 
    ? '確認要進入白天階段嗎？這將會增加輪次並清除今日投票記錄。'
    : '確認要進入夜晚階段嗎？'
  
  uiStore.showConfirm(
    nextPhase === 'Day' ? '進入白天' : '進入夜晚',
    message,
    async () => {
      await gameStore.setPhase(nextPhase)
    },
    false
  )
}
</script>

<style scoped>
.toggle-container {
  cursor: pointer;
  user-select: none;
}

.toggle-track {
  width: 90px;
  height: 38px;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 4px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-labels {
  width: 100%;
  display: flex;
  justify-content: space-around;
  font-size: 11px;
  font-weight: 700;
  color: #666;
  padding: 0 4px;
}

.toggle-thumb {
  width: 32px;
  height: 32px;
  background: #f0c060;
  border-radius: 50%;
  position: absolute;
  left: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2;
}

.is-night .toggle-track {
  background: rgba(30, 47, 68, 0.4);
  border-color: rgba(143, 168, 204, 0.3);
}

.is-night .toggle-thumb {
  left: calc(100% - 35px);
  background: #2c3e50;
  color: #8fa8cc;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
}

.is-night .label:nth-child(2) { color: #8fa8cc; }
.label:nth-child(1) { color: #f0c060; }
</style>
