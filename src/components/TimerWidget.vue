<template>
  <div class="timer-widget" :class="{ 
    'is-expanded': uiStore.isTimerExpanded, 
    'is-running': uiStore.isTimerRunning, 
    'is-urgent': isUrgent,
    'is-bell-playing': uiStore.isBellPlaying
  }">
    <!-- 頂部工具列容器 (碼錶 + 形狀切換) -->
    <div class="timer-controls-row">
      <!-- 縮小狀態 (Mini Mode) -->
      <div class="timer-mini" :class="{ 'bell-playing-mini': uiStore.isBellPlaying }" @click="handleMiniClick">
        <span class="icon">{{ uiStore.isBellPlaying ? '🔕' : '⏱️' }}</span>
        <span class="time-text">{{ uiStore.isBellPlaying ? '停止鐘聲' : formattedTime }}</span>
      </div>

    </div>

    <!-- 展開狀態 (Panel Mode) -->
    <transition name="timer-panel-fade">
      <div v-if="uiStore.isTimerExpanded" class="timer-panel">
        <div class="timer-header">
          <span>設定倒數時間</span>
          <button class="close-btn" @click="uiStore.isTimerExpanded = false">✕</button>
        </div>
        
        <div class="timer-display" :class="{ 'text-urgent': isUrgent }">
          {{ formattedTime }}
        </div>

        <!-- 鐘聲播放中的大號停止按鈕 -->
        <div v-if="uiStore.isBellPlaying" class="bell-alert-zone">
          <button class="stop-bell-large-btn" @click="uiStore.stopBell()">
            🔕 停止鐘聲
          </button>
        </div>

        <div class="timer-adjust">
          <button class="adjust-btn" @click="uiStore.addTimerSeconds(-10)">-10秒</button>
          <button class="adjust-btn" @click="uiStore.addTimerSeconds(+10)">+10秒</button>
          <!-- <button class="adjust-btn" @click="uiStore.addTimerSeconds(-60)">-1分</button> -->
          <!-- <button class="adjust-btn" @click="uiStore.addTimerSeconds(60)">+1分</button> -->
          <button class="adjust-btn" @click="uiStore.addTimerSeconds(300)">+5分</button>
        </div>

        <div class="timer-controls">
          <button v-if="!uiStore.isTimerRunning" class="control-btn play" @click="uiStore.startTimer()">
            ▶️ 開始
          </button>
          <button v-else class="control-btn pause" @click="uiStore.pauseTimer()">
            ⏸️ 暫停
          </button>
          <button class="control-btn reset" @click="uiStore.resetTimer()">
            🔄 重置
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '../stores/uiStore'

const uiStore = useUIStore()

const formattedTime = computed(() => {
  const m = Math.floor(uiStore.timerRemaining / 60).toString().padStart(2, '0')
  const s = (uiStore.timerRemaining % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})

const isUrgent = computed(() => uiStore.timerRemaining > 0 && uiStore.timerRemaining <= 30)

function handleMiniClick() {
  if (uiStore.isBellPlaying) {
    uiStore.stopBell()
  } else {
    uiStore.isTimerExpanded = !uiStore.isTimerExpanded
  }
}
</script>

<style scoped>
.timer-widget {
  position: fixed;
  top: calc(50px + env(safe-area-inset-top, 0px) + 10px);
  left: 16px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.timer-controls-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.timer-mini {
  background: rgba(18, 18, 24, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 6px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  transition: all 0.3s ease;
  user-select: none;
}

.timer-mini:hover {
  background: rgba(201, 168, 76, 0.2);
  border-color: rgba(201, 168, 76, 0.4);
}

.is-running .timer-mini {
  border-color: rgba(201, 168, 76, 0.6);
  box-shadow: 0 0 10px rgba(201, 168, 76, 0.3);
}

.is-urgent .timer-mini {
  background: rgba(139, 26, 26, 0.4);
  border-color: rgba(255, 50, 50, 0.6);
  animation: pulse-urgent 1s infinite;
}

.time-text {
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 700;
  font-size: 15px;
  color: #eee;
  font-variant-numeric: tabular-nums;
}

.is-urgent .time-text {
  color: #ff8888;
}

/* 形狀切換按鈕 (單按鈕模式) */
.shape-toggle-mini {
  background: rgba(18, 18, 24, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  width: 42px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  transition: all 0.3s ease;
}

.shape-toggle-mini:hover {
  background: rgba(201, 168, 76, 0.2);
  border-color: rgba(201, 168, 76, 0.4);
}

.shape-toggle-mini .icon {
  font-size: 16px;
}

.timer-panel {
  margin-top: 8px;
  background: #1a1c24;
  border: 1px solid rgba(201, 168, 76, 0.3);
  border-radius: 16px;
  padding: 16px;
  width: 200px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.8);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #aaa;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 16px;
}

.close-btn:hover {
  color: #fff;
}

.timer-display {
  text-align: center;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 36px;
  font-weight: 800;
  color: var(--color-gold-bright, #f1c40f);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 10px rgba(0,0,0,0.5);
  margin: 4px 0;
}

.timer-display.text-urgent {
  color: #ff6b6b;
  animation: pulse-text 1s infinite;
}

.timer-adjust {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.adjust-btn {
  flex: 1;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #ccc;
  border-radius: 8px;
  padding: 6px 0;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.adjust-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.timer-controls {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.control-btn {
  flex: 1;
  border-radius: 10px;
  padding: 10px 0;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.control-btn.play {
  background: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.5);
  color: #81c784;
}

.control-btn.pause {
  background: rgba(255, 152, 0, 0.2);
  border: 1px solid rgba(255, 152, 0, 0.5);
  color: #ffb74d;
}

.control-btn.reset {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: #e57373;
}

.timer-panel-fade-enter-active, .timer-panel-fade-leave-active {
  transition: all 0.2s ease;
  transform-origin: top left;
}
.timer-panel-fade-enter-from, .timer-panel-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

@keyframes pulse-urgent {
  0%, 100% { box-shadow: 0 0 10px rgba(255,50,50,0.2); }
  50% { box-shadow: 0 0 20px rgba(255,50,50,0.6); }
}

@keyframes pulse-text {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* 鐘聲播放狀態的樣式 */
.timer-mini.bell-playing-mini {
  background: linear-gradient(135deg, #d32f2f, #b71c1c);
  border-color: #ff5252;
  box-shadow: 0 0 15px rgba(255, 82, 82, 0.6);
  animation: pulse-bell-mini 1s infinite alternate, shake-bell 0.6s infinite;
}

.timer-mini.bell-playing-mini .time-text {
  color: #ffffff;
  font-weight: 800;
}

.bell-alert-zone {
  margin: 4px 0;
  width: 100%;
}

.stop-bell-large-btn {
  width: 100%;
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 10px;
  padding: 12px 0;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
  transition: all 0.2s ease;
  animation: shake-bell 0.6s infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.stop-bell-large-btn:hover {
  transform: scale(1.03);
  box-shadow: 0 6px 20px rgba(231, 76, 60, 0.6);
  background: linear-gradient(135deg, #ff4d4d, #d32f2f);
}

.stop-bell-large-btn:active {
  transform: scale(0.98);
}

/* 整個 Widget 在播放鐘聲時的外邊框發光 */
.timer-widget.is-bell-playing .timer-panel {
  border-color: #ff5252;
  box-shadow: 0 0 25px rgba(255, 82, 82, 0.4), 0 10px 30px rgba(0,0,0,0.8);
}

@keyframes pulse-bell-mini {
  0% { box-shadow: 0 0 8px rgba(255, 82, 82, 0.4); border-color: rgba(255, 82, 82, 0.5); }
  100% { box-shadow: 0 0 20px rgba(255, 82, 82, 0.9); border-color: rgba(255, 82, 82, 1); }
}

@keyframes shake-bell {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(4deg) scale(1.02); }
  75% { transform: rotate(-4deg) scale(0.98); }
}
</style>
