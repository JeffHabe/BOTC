<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="log-panel panel animate-slide-up">
      <div class="panel-header">
        <span class="panel-icon">📋</span>
        <h2 class="panel-title">對局記錄回顧</h2>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <!-- 新增筆記區塊 -->
      <div class="note-input-area">
        <input 
          v-model="noteContent" 
          type="text" 
          placeholder="在此輸入手動筆記..." 
          @keyup.enter="handleAddNote"
        />
        <button class="add-note-btn" @click="handleAddNote">新增</button>
      </div>

      <div class="log-content" ref="logContainer">
        <div v-if="gameStore.logs.length === 0" class="empty-log">
          目前尚無對局記錄
        </div>
        
        <div v-for="log in sortedLogs" :key="log.id" class="log-item" :class="log.type">
          <div class="log-meta">
            <span class="log-day">D{{ log.day }}</span>
            <span class="log-phase-icon">{{ log.phase === 'Night' || log.phase === 'FirstNight' ? '🌙' : '☀️' }}</span>
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          </div>
          <div class="log-body">
            <div class="log-type-tag">{{ typeLabel(log.type) }}</div>
            <div class="log-text">{{ log.content }}</div>
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <button class="footer-btn secondary" @click="clearLogs">清除所有日誌</button>
        <button class="footer-btn primary" @click="exportGame">匯出 JSON</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'

const uiStore = useUIStore()
const gameStore = useGameStore()

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'Esc') {
    e.stopImmediatePropagation()
    uiStore.closePanel()
  }
}

const noteContent = ref('')

const sortedLogs = computed(() => {
  return [...gameStore.logs].reverse()
})

function formatTime(ts: number) {
  const date = new Date(ts)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    phase: '階段',
    action: '系統',
    death: '狀態',
    assignment: '角色',
    note: '筆記',
    reminder: '提醒'
  }
  return labels[type] || '其他'
}

function handleAddNote() {
  if (!noteContent.value.trim()) return
  gameStore.addLog('note', noteContent.value.trim())
  noteContent.value = ''
}

function clearLogs() {
  uiStore.showConfirm(
    '清除日誌',
    '確定要刪除當前對局的所有記錄嗎？這不會影響遊戲狀態。',
    () => {
      gameStore.logs = []
    },
    true
  )
}

async function exportGame() {
  const json = await gameStore.exportState()
  if (!json) {
    uiStore.showConfirm('匯出失敗', '無法獲取遊戲數據，請檢查控制台。', () => {}, false)
    return
  }

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const timeStr = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0')
  const fileName = `botc-log-${dateStr}-${timeStr}.json`

  try {
    // 嘗試使用 Tauri 原生對話框
    const filePath = await save({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      defaultPath: fileName
    })

    if (filePath) {
      await writeTextFile(filePath, json)
      uiStore.showAlert('匯出成功', '對局記錄已成功匯出至：' + filePath)
    }
  } catch (e) {
    // 退回到網頁下載方式
    console.warn('Tauri export failed, falling back to browser download', e)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
    uiStore.showConfirm('匯出成功', '對局 JSON 檔已嘗試透過瀏覽器下載。', () => {}, false)
  }
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

.log-panel {
  width: 100%;
  max-width: 460px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px 20px 12px 12px;
  overflow: hidden;
  background: #1a1b23;
  border: 1px solid rgba(201, 168, 76, 0.2);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 16px 10px;
  border-bottom: 1px solid rgba(201,168,76,0.1);
  flex-shrink: 0;
}

.panel-title {
  font-family: var(--font-title);
  font-size: 16px;
  color: var(--color-gold);
  flex: 1;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  color: #fff;
  transform: scale(1.1);
}

.note-input-area {
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  background: rgba(0,0,0,0.2);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.note-input-area input {
  flex: 1;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  font-size: 14px;
}

.add-note-btn {
  background: var(--color-gold);
  color: #000;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-log {
  text-align: center;
  padding: 40px 0;
  color: var(--color-text-muted);
  font-style: italic;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 10px;
  background: rgba(255,255,255,0.03);
  border-radius: 10px;
  border-left: 3px solid transparent;
}

.log-item.phase { border-left-color: #4caf50; }
.log-item.assignment { border-left-color: #2196f3; }
.log-item.death { border-left-color: #f44336; }
.log-item.note { border-left-color: #ff9800; }
.log-item.action { border-left-color: #9e9e9e; }
.log-item.reminder { border-left-color: #e91e63; }

.log-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 45px;
  gap: 2px;
}

.log-day {
  font-size: 10px;
  font-weight: 900;
  color: var(--color-gold);
}

.log-phase-icon { font-size: 14px; }

.log-time {
  font-size: 10px;
  color: var(--color-text-muted);
}

.log-body {
  flex: 1;
}

.log-type-tag {
  font-size: 9px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 2px;
}

.log-text {
  font-size: 13px;
  color: #eee;
  line-height: 1.4;
}

.panel-footer {
  padding: 12px 16px;
  display: flex;
  gap: 10px;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.footer-btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.footer-btn.primary {
  background: var(--color-gold);
  color: #000;
}

.footer-btn.secondary {
  background: rgba(255,255,255,0.05);
  color: #ccc;
  border: 1px solid rgba(255,255,255,0.1);
}
</style>
