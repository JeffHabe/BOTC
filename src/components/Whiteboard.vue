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

        <!-- 字體與顏色控制項 -->
        <div class="whiteboard-controls">
          <div class="control-group">
            <span class="control-label">字體大小</span>
            <div class="size-control">
              <button 
                class="step-btn" 
                @mousedown="startRepeating(decrementSize)"
                @mouseup="stopRepeating"
                @mouseleave="stopRepeating"
                @touchstart.prevent="startRepeating(decrementSize)"
                @touchend="stopRepeating"
                @touchcancel="stopRepeating"
              >−</button>
              <input 
                type="number" 
                class="size-input" 
                :value="gameStore.nightNotesFontSize"
                @input="handleSizeInput"
                min="12"
                max="100"
              >
              <button 
                class="step-btn" 
                @mousedown="startRepeating(incrementSize)"
                @mouseup="stopRepeating"
                @mouseleave="stopRepeating"
                @touchstart.prevent="startRepeating(incrementSize)"
                @touchend="stopRepeating"
                @touchcancel="stopRepeating"
              >+</button>
              <span class="unit">px</span>
            </div>
          </div>

          <div class="control-group">
            <span class="control-label">文字顏色</span>
            <div class="color-control-wrapper">
              <div class="color-picker-trigger" @click="showColorPicker = !showColorPicker">
                <div class="color-preview" :style="{ backgroundColor: gameStore.nightNotesColor }"></div>
                <span class="color-hex">{{ gameStore.nightNotesColor.toUpperCase() }}</span>
              </div>
              
              <div v-if="showColorPicker" class="color-picker-popup animate-fade-in">
                <ColorPicker v-model="gameStore.nightNotesColor" />
                <div class="picker-footer">
                  <button class="picker-done-btn" @click="showColorPicker = false">完成</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <textarea 
          class="whiteboard-input" 
          placeholder="在此輸入要展示給玩家看的資訊...&#10;(例如：你的占卜結果為【是】)"
          v-model="gameStore.nightNotes"
          @input="gameStore.setNightNotes(gameStore.nightNotes)"
          :style="{ 
            fontSize: gameStore.nightNotesFontSize + 'px',
            color: gameStore.nightNotesColor 
          }"
        ></textarea>

        <div class="whiteboard-footer">
          <button 
            class="copy-btn" 
            @click="copyToClipboard"
            :class="{ success: copied }"
          >
            <span class="icon">{{ copied ? '✅' : '📋' }}</span> 
            {{ copied ? '已複製內容' : '複製全部文字' }}
          </button>
          <button class="clear-btn" @click="gameStore.setNightNotes('')">
            <span class="icon">🧹</span> 清除全部內容
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'
import ColorPicker from './ColorPicker.vue'

const gameStore = useGameStore()
const uiStore = useUIStore()

const showColorPicker = ref(false)

const handleSizeInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  let val = parseInt(input.value)
  if (isNaN(val)) return
  
  // 限制範圍在 12-50 之間
  if (val > 100) val = 100
  if (val < 12) val = 12
  
  gameStore.setNightNotesFontSize(val)
}

const incrementSize = () => {
  if (gameStore.nightNotesFontSize < 100) {
    gameStore.setNightNotesFontSize(gameStore.nightNotesFontSize + 1)
  }
}

const decrementSize = () => {
  if (gameStore.nightNotesFontSize > 12) {
    gameStore.setNightNotesFontSize(gameStore.nightNotesFontSize - 1)
  }
}

// 長按連發邏輯
let repeatTimer: number | null = null
const startRepeating = (action: () => void) => {
  if (repeatTimer) return
  action() // 先執行一次
  
  // 延遲後開始連發
  repeatTimer = window.setTimeout(() => {
    repeatTimer = window.setInterval(action, 80)
  }, 400)
}

const stopRepeating = () => {
  if (repeatTimer) {
    clearTimeout(repeatTimer)
    clearInterval(repeatTimer)
    repeatTimer = null
  }
}

const copied = ref(false)
const copyToClipboard = async () => {
  if (!gameStore.nightNotes) return
  
  try {
    await navigator.clipboard.writeText(gameStore.nightNotes)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('無法複製文字: ', err)
  }
}
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
  overflow: visible;
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

/* 控制項樣式 */
.whiteboard-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(201, 168, 76, 0.1);
}

.control-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.control-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.size-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.size-input {
  width: 50px;
  height: 32px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(201, 168, 76, 0.3);
  border-left: none;
  border-right: none;
  color: var(--color-gold-bright);
  padding: 0;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  outline: none;
  transition: all 0.2s;
  -moz-appearance: textfield;
}

.size-input::-webkit-outer-spin-button,
.size-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.step-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 168, 76, 0.1);
  border: 1px solid rgba(201, 168, 76, 0.3);
  color: var(--color-gold);
  font-size: 18px;
  font-weight: bold;
  transition: all 0.2s;
}

.step-btn:first-child {
  border-radius: 6px 0 0 6px;
}

.step-btn:last-of-type {
  border-radius: 0 6px 6px 0;
}

.step-btn:active {
  background: rgba(201, 168, 76, 0.2);
  color: var(--color-gold-bright);
}

.size-input:focus {
  border-color: var(--color-gold);
  background: rgba(201, 168, 76, 0.05);
}

.unit {
  font-size: 12px;
  color: var(--color-text-muted);
}

.color-control-wrapper {
  position: relative;
}

.color-picker-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  border: 1px solid rgba(201, 168, 76, 0.2);
  transition: all 0.2s;
}

.color-picker-trigger:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--color-gold);
}

.color-preview {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 5px rgba(0,0,0,0.5);
}

.color-hex {
  font-family: monospace;
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.color-picker-popup {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 2000;
  background: #1e1e1e;
  border: 1px solid rgba(201, 168, 76, 0.4);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.8);
  padding: 8px;
}

.picker-footer {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

.picker-done-btn {
  padding: 6px 16px;
  background: var(--color-gold-muted);
  color: var(--color-bg-deep);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}

.whiteboard-input {
  width: 100%;
  height: 400px;
  background: #000000;
  border: 1.5px solid rgba(201, 168, 76, 0.25);
  border-radius: 12px;
  color: var(--color-gold-bright);
  padding: 16px;
  font-size: 18px; 
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
  gap: 12px;
  padding-top: 0;
}

.copy-btn, .clear-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.copy-btn {
  background: rgba(201, 168, 76, 0.1);
  border: 1px solid rgba(201, 168, 76, 0.2);
  color: var(--color-gold-bright);
}

.copy-btn:active {
  background: rgba(201, 168, 76, 0.2);
  transform: scale(0.95);
}

.copy-btn.success {
  background: rgba(60, 148, 56, 0.15);
  border-color: rgba(60, 148, 56, 0.4);
  color: #a3e6a1;
}

.clear-btn {
  background: rgba(139, 26, 26, 0.1);
  border: 1px solid rgba(139, 26, 26, 0.2);
  color: #ff9999;
}

.clear-btn:active {
  background: rgba(139, 26, 26, 0.2);
  transform: scale(0.95);
}

.copy-btn .icon, .clear-btn .icon { font-size: 14px; }
</style>
