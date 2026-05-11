<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="whiteboard-panel panel animate-slide-up">
      <div class="panel-header">
        <span class="panel-icon">📝</span>
        <h2 class="panel-title">夜晚溝通白板</h2>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <div class="whiteboard-content">
        <div class="whiteboard-desc">
          在下方輸入資訊後，可將手機展示給玩家查看。
        </div>
        
        <textarea 
          class="whiteboard-input" 
          placeholder="在此輸入要展示給玩家看的資訊...&#10;(例如：你的占卜結果為【是】)"
          v-model="gameStore.nightNotes"
          @input="gameStore.setNightNotes(gameStore.nightNotes)"
        ></textarea>

        <div class="whiteboard-footer">
          <button class="clear-btn" @click="gameStore.setNightNotes('')">
            <span class="icon">🧹</span> 清除全部內容
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'

const gameStore = useGameStore()
const uiStore = useUIStore()
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 1500;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 0 8px;
}

.whiteboard-panel {
  width: 100%;
  max-width: 440px;
  background: #1a1b23;
  border-radius: 20px 20px 12px 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(201,168,76,0.15);
}

.panel-icon { font-size: 20px; }

.panel-title {
  font-family: var(--font-title);
  font-size: 16px;
  color: var(--color-gold);
  flex: 1;
}

.close-btn {
  color: var(--color-text-muted);
  font-size: 18px;
  background: none;
  padding: 4px;
}

.whiteboard-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.whiteboard-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.whiteboard-input {
  width: 100%;
  height: 260px;
  background: #000000;
  border: 1.5px solid rgba(201, 168, 76, 0.25);
  border-radius: 12px;
  color: var(--color-gold-bright);
  padding: 16px;
  font-size: 18px; /* 加大字體方便展示 */
  font-family: inherit;
  resize: none;
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 4px 12px rgba(0,0,0,0.6);
  line-height: 1.6;
}

.whiteboard-input:focus {
  border-color: var(--color-gold);
  background: #050505;
  box-shadow: inset 0 4px 12px rgba(0,0,0,0.6), 0 0 15px rgba(201, 168, 76, 0.1);
}

.whiteboard-input::placeholder {
  color: rgba(201, 168, 76, 0.2);
  font-size: 14px;
}

.whiteboard-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(139, 26, 26, 0.15);
  border: 1px solid rgba(139, 26, 26, 0.3);
  color: #ff9999;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
}

.clear-btn:active {
  background: rgba(139, 26, 26, 0.3);
  transform: scale(0.95);
}

.clear-btn .icon { font-size: 14px; }
</style>
