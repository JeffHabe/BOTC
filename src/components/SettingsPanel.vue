<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="settings-panel panel animate-slide-up">
      <div class="panel-header">
        <span class="panel-icon">⚙️</span>
        <h2 class="panel-title">設置選項</h2>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <div class="settings-content">
        <!-- 遊戲控制 -->
        <div class="section-title">遊戲控制</div>
        <div class="settings-grid">
          <button v-if="gameStore.phase === 'Setup'" class="grid-item" @click="openAssignment">
            <span class="grid-icon">🎭</span>
            <span class="grid-label">選取劇本</span>
          </button>

          <button class="grid-item" @click="openVoting">
            <span class="grid-icon">🗳️</span>
            <span class="grid-label">投票面板</span>
          </button>
          
          <button class="grid-item" @click="openFabled">
            <span class="grid-icon">🦄</span>
            <span class="grid-label">傳說角色</span>
          </button>

          <button class="grid-item" @click="openNightOrder">
            <span class="grid-icon">🌙</span>
            <span class="grid-label">夜晚順序</span>
          </button>

          <button class="grid-item" @click="openGameLog">
            <span class="grid-icon">📋</span>
            <span class="grid-label">對局記錄</span>
          </button>

          <button class="grid-item" @click="openCharSheet">
            <span class="grid-icon">📜</span>
            <span class="grid-label">角色清單</span>
          </button>

          <button class="grid-item" @click="openPlayerOrder">
            <span class="grid-icon">🪑</span>
            <span class="grid-label">座位編排</span>
          </button>
      
          <button class="grid-item" @click="openCharacterEditor">
            <span class="grid-icon">📝</span>
            <span class="grid-label">自訂庫</span>
          </button>

          <button class="grid-item primary" @click="advance">
            <span class="grid-icon">⌛</span>
            <span class="grid-label">階段推進</span>
          </button>
        </div>

        <div class="divider" />

        <!-- 資料管理 -->
        <div class="section-title">資料管理</div>
        <div class="settings-grid">
          <button class="grid-item" @click="exportGame">
            <span class="grid-icon">📤</span>
            <span class="grid-label">匯出遊戲</span>
          </button>
          
          <button class="grid-item" @click="importGame">
            <span class="grid-icon">📥</span>
            <span class="grid-label">匯入遊戲</span>
          </button>

          <button class="grid-item" @click="uiStore.openPanel('role-assignment')">
            <span class="grid-icon">📜</span>
            <span class="grid-label">匯入劇本</span>
          </button>
        </div>

        <div class="divider" />

        <!-- 介面設置 (暫時隱藏，預設為內圈向心) -->
        <!--
        <div class="section-title">提示標記佈局 (Reminder Layout)</div>
        <div class="layout-selector-grid cols-4">
          <button 
            v-for="mode in layouts" 
            :key="mode.id"
            class="layout-option"
            :class="{ active: uiStore.reminderLayout === mode.id }"
            @click="uiStore.setReminderLayout(mode.id as any)"
          >
            <span class="opt-icon">{{ mode.icon }}</span>
            <span class="opt-label">{{ mode.label }}</span>
            <div v-if="uiStore.reminderLayout === mode.id" class="active-check">✓</div>
          </button>
        </div>

        <div class="divider" />
        -->

        <!-- 自定義背景 -->
        <div class="section-title">自定義佈景</div>
        <div class="background-settings-grid">
          <div class="bg-setting-item">
            <div class="bg-preview" :style="uiStore.customDayBackground ? { backgroundImage: `url(${uiStore.customDayBackground})` } : {}">
              <div v-if="!uiStore.customDayBackground" class="bg-placeholder">預設白天</div>
              <div class="bg-overlay">
                <button class="bg-btn" @click="triggerFile('day')">匯入圖檔</button>
                <button v-if="uiStore.customDayBackground" class="bg-btn reset" @click="uiStore.setDayBackground(null)">重置</button>
              </div>
            </div>
            <div class="bg-name">白天背景</div>
          </div>
          <div class="bg-setting-item">
            <div class="bg-preview" :style="uiStore.customNightBackground ? { backgroundImage: `url(${uiStore.customNightBackground})` } : {}">
              <div v-if="!uiStore.customNightBackground" class="bg-placeholder night">預設夜晚</div>
              <div class="bg-overlay">
                <button class="bg-btn" @click="triggerFile('night')">匯入圖檔</button>
                <button v-if="uiStore.customNightBackground" class="bg-btn reset" @click="uiStore.setNightBackground(null)">重置</button>
              </div>
            </div>
            <div class="bg-name">夜晚背景</div>
          </div>
        </div>
        <input type="file" ref="fileInput" hidden accept="image/*" @change="handleFileChange" />

        <div class="divider" />

        <!-- 魔典排列圖形 (已移至頂部工具列) -->
        
        <div class="section-title">魔典排列圖形 (Grimoire Shape)</div>
        <div class="layout-selector-grid cols-3">
          <button 
            v-for="shape in shapes" 
            :key="shape.id"
            class="layout-option"
            :class="{ active: uiStore.grimoireShape === shape.id }"
            @click="uiStore.setGrimoireShape(shape.id as any)"
          >
            <span class="opt-icon">{{ shape.icon }}</span>
            <span class="opt-label">{{ shape.label }}</span>
            <div v-if="uiStore.grimoireShape === shape.id" class="active-check">✓</div>
          </button>
        </div>
       

        <div class="divider" />

        <!-- 危險區域 -->
        <div class="section-title danger-section">危險區域</div>
        <div class="settings-grid">
          <button class="grid-item warning" @click="resetStates">
            <span class="grid-icon">🔄</span>
            <span class="grid-label">重置狀態</span>
          </button>

          <button class="grid-item danger" @click="resetGame">
            <span class="grid-icon">🗑️</span>
            <span class="grid-label">重置遊戲</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'

const uiStore = useUIStore()
const gameStore = useGameStore()

const fileInput = ref<HTMLInputElement | null>(null)
const uploadTarget = ref<'day' | 'night'>('day')

function triggerFile(target: 'day' | 'night') {
  uploadTarget.value = target
  fileInput.value?.click()
}

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (event) => {
    const rawSrc = event.target?.result as string
    try {
      const optimizedSrc = await processImage(rawSrc)
      if (uploadTarget.value === 'day') uiStore.setDayBackground(optimizedSrc)
      else uiStore.setNightBackground(optimizedSrc)
    } catch (err) {
      console.error('圖片優化失敗:', err)
      // 如果優化失敗，則退回到原始圖片
      if (uploadTarget.value === 'day') uiStore.setDayBackground(rawSrc)
      else uiStore.setNightBackground(rawSrc)
    }
  }
  reader.readAsDataURL(file)

  if (fileInput.value) fileInput.value.value = ''
}

/**
 * 圖片優化處理：縮放並壓縮
 */
async function processImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height
      const MAX_SIZE = 2000 // 最大邊長

      // 計算縮放比例
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width
          width = MAX_SIZE
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height
          height = MAX_SIZE
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject('無法獲取 Canvas Context')

      // 繪製並優化
      ctx.drawImage(img, 0, 0, width, height)
      
      // 輸出為 JPEG, 品質設為 0.8 (檔案大小與清晰度的平衡點)
      const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.8)
      resolve(optimizedDataUrl)
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

const shapes = [
  { id: 'circle', label: '經典正圓', icon: '⏺️' },
  { id: 'oval', label: '優雅橢圓', icon: '0️⃣' },
  { id: 'rect', label: '工整矩形', icon: '⏹️' },
]

function openNightOrder() {
  uiStore.openPanel('night-order')
}

function openGameLog() {
  uiStore.openPanel('game-log')
}

function openCharSheet() {
  uiStore.openPanel('character-sheet')
}

function openVoting() {
  uiStore.openPanel('voting')
}

function openPlayerOrder() {
  uiStore.openPanel('player-order')
}

function openAssignment() {
  uiStore.openPanel('role-assignment')
}

function openCharacterEditor() {
  uiStore.openPanel('character-editor')
}

function openFabled() {
  uiStore.openPanel('fabled-selector')
}

async function advance() {
  await gameStore.advancePhase()
  uiStore.closePanel()
}

async function importGame() {
  try {
    // 嘗試使用 Tauri 原生對話框
    const selected = await open({
      multiple: false,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (selected) {
      const content = await readTextFile(selected as string)
      await gameStore.importState(content)
      alert('遊戲狀態已成功還原')
      uiStore.closePanel()
    }
  } catch (e) {
    //  fallback: 使用瀏覽器文件選擇器
    console.warn('Tauri open failed, falling back to browser input', e)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = async (e) => {
          const content = e.target?.result as string
          await gameStore.importState(content)
          alert('遊戲狀態已成功還原')
          uiStore.closePanel()
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }
}

async function exportGame() {
  const json = await gameStore.exportState()
  if (!json) return

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const timeStr = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0')
  const fileName = `botc-game-${dateStr}-${timeStr}.json`

  try {
    // 嘗試使用 Tauri 原生對話框 (適用於 Android/Desktop)
    const filePath = await save({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      defaultPath: fileName
    })

    if (filePath) {
      await writeTextFile(filePath, json)
      alert('已成功匯出至：' + filePath)
    }
  } catch (e) {
    // 如果不在 Tauri 環境或發生錯誤，退回到網頁下載方式
    console.warn('Tauri export failed, falling back to browser download', e)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }
}

function resetStates() {
  uiStore.showConfirm(
    '重置狀態',
    '確認要清空所有已指派的角色、死亡狀態與階段嗎？此操作將保留玩家名單。',
    async () => {
      await gameStore.resetPlayersState()
      uiStore.closePanel()
    },
    true
  )
}

function resetGame() {
  uiStore.showConfirm(
    '重置遊戲',
    '確認要清除所有玩家數據並重新開始嗎？此操作不可恢復。',
    async () => {
      await gameStore.newGame()
      uiStore.closePanel()
    },
    true
  )
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 150;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 0 8px;
}

.settings-panel {
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px 20px 12px 12px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(201,168,76,0.1);
  flex-shrink: 0;
}

.panel-icon { font-size: 18px; }

.panel-title {
  font-family: var(--font-title);
  font-size: 16px;
  color: var(--color-gold);
  flex: 1;
}

.close-btn {
  color: var(--color-text-muted);
  font-size: 16px;
  background: none;
  padding: 4px 8px;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.section-title {
  padding: 10px 16px 4px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.danger-section { color: rgba(224,32,32,0.6); }

.settings-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 16px;
  background: none;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background var(--transition-fast);
}

.settings-item:active { background: rgba(255,255,255,0.05); }

.settings-item-warning .settings-label { color: var(--color-gold-bright, #e8a040); }
.settings-item-danger .settings-label { color: var(--color-red-bright); }

.settings-icon { font-size: 20px; flex-shrink: 0; }
.settings-info { flex: 1; }

.settings-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.settings-sub {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.settings-arrow {
  font-size: 20px;
  color: var(--color-text-muted);
}

.divider {
  height: 1px;
  background: rgba(201,168,76,0.1);
  margin: 8px 16px;
}

/* 佈局選擇器樣式 (優化為緊湊模式) */
.layout-selector-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 6px 16px 12px;
}

.layout-selector-grid.cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

.layout-selector-grid.cols-4 {
  grid-template-columns: repeat(4, 1fr);
}

.layout-option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  transition: all 0.2s ease;
  cursor: pointer;
  color: var(--color-text-muted);
}

.layout-option:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(201, 168, 76, 0.3);
}

.layout-option.active {
  background: rgba(201, 168, 76, 0.1);
  border-color: var(--color-gold);
  color: var(--color-gold-bright);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.opt-icon {
  font-size: 18px;
}

.opt-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0px;
  white-space: nowrap;
}

.active-check {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 12px;
  color: var(--color-gold);
  font-weight: bold;
}

/* 格子佈局樣式 */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 8px 16px;
}

.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: all 0.2s;
  cursor: pointer;
}

.grid-item:active {
  background: rgba(201, 168, 76, 0.1);
  border-color: var(--color-gold-muted);
  transform: scale(0.95);
}

.grid-item.primary {
  background: rgba(201, 168, 76, 0.1);
  border-color: rgba(201, 168, 76, 0.3);
}

.grid-item.primary .grid-label {
  color: var(--color-gold);
}

.grid-icon {
  font-size: 24px;
}

.grid-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
}

.grid-item.warning {
  background: rgba(224, 160, 32, 0.1);
  border-color: rgba(224, 160, 32, 0.3);
}
.grid-item.warning .grid-label {
  color: #e8a040;
}

.grid-item.danger {
  background: rgba(224, 32, 32, 0.1);
  border-color: rgba(224, 32, 32, 0.3);
}
.grid-item.danger .grid-label {
  color: var(--color-red-bright);
}

/* 自定義背景樣式 */
.background-settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 8px 16px;
}

.bg-setting-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bg-preview {
  aspect-ratio: 16/9;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-placeholder {
  font-size: 11px;
  color: var(--color-text-muted);
  opacity: 0.5;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.bg-preview:hover .bg-overlay, .bg-preview:active .bg-overlay {
  opacity: 1;
}

.bg-btn {
  background: var(--color-gold-dark);
  color: #fff;
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
}

.bg-btn.reset {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
}

.bg-name {
  font-size: 11px;
  text-align: center;
  color: var(--color-text-muted);
}
</style>
