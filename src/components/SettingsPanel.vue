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

        <!-- 夜晚順序 -->
        <button class="settings-item" @click="openNightOrder">
          <span class="settings-icon">🌙</span>
          <div class="settings-info">
            <div class="settings-label">夜晚順序</div>
            <div class="settings-sub">查看首夜與其他夜晚行動順序</div>
          </div>
          <span class="settings-arrow">›</span>
        </button>

        <!-- 角色清單 -->
        <button class="settings-item" @click="openCharSheet">
          <span class="settings-icon">📜</span>
          <div class="settings-info">
            <div class="settings-label">角色清單</div>
            <div class="settings-sub">查看當前劇本的角色說明</div>
          </div>
          <span class="settings-arrow">›</span>
        </button>

        <!-- 座位編排 -->
        <button class="settings-item" @click="openPlayerOrder">
          <span class="settings-icon">🪑</span>
          <div class="settings-info">
            <div class="settings-label">座位編排</div>
            <div class="settings-sub">手動調整玩家順位與座位</div>
          </div>
          <span class="settings-arrow">›</span>
        </button>

        <!-- 投票面板 -->
        <button class="settings-item" @click="openVoting">
          <span class="settings-icon">🗳️</span>
          <div class="settings-info">
            <div class="settings-label">投票面板</div>
            <div class="settings-sub">管理今日投票與處決流程</div>
          </div>
          <span class="settings-arrow">›</span>
        </button>

        <!-- 分配角色 -->
        <button v-if="gameStore.phase === 'Setup'" class="settings-item" @click="openAssignment">
          <span class="settings-icon">🎭</span>
          <div class="settings-info">
            <div class="settings-label">分配角色 (設置)</div>
            <div class="settings-sub">根據人數配置自動發派角色</div>
          </div>
          <span class="settings-arrow">›</span>
        </button>

        <!-- 階段推進 -->
        <button class="settings-item" @click="advance">
          <span class="settings-icon">⌛</span>
          <div class="settings-info">
            <div class="settings-label">階段推進</div>
            <div class="settings-sub">當前：{{ phaseLabel }} → 下一階段：{{ nextPhaseLabel }}</div>
          </div>
          <span class="settings-arrow">›</span>
        </button>

        <div class="divider" />

        <!-- 資料管理 -->
        <div class="section-title">資料管理</div>

        <button class="settings-item" @click="exportGame">
          <span class="settings-icon">📤</span>
          <div class="settings-info">
            <div class="settings-label">匯出遊戲狀態</div>
            <div class="settings-sub">將當前遊戲進度儲存為 JSON</div>
          </div>
        </button>

        <div class="divider" />

        <!-- 介面設置 -->
        <div class="section-title">提示標記佈局 (Reminder Layout)</div>
        <div class="layout-selector-grid">
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

        <!-- 危險區域 -->
        <div class="section-title danger-section">危險區域</div>

        <button class="settings-item settings-item-warning" @click="resetStates">
          <span class="settings-icon">🔄</span>
          <div class="settings-info">
            <div class="settings-label">重置狀態 (保留玩家)</div>
            <div class="settings-sub">清空所有角色、死亡狀態與階段環境</div>
          </div>
        </button>

        <button class="settings-item settings-item-danger" @click="resetGame">
          <span class="settings-icon">🗑️</span>
          <div class="settings-info">
            <div class="settings-label">重置遊戲</div>
            <div class="settings-sub">清除所有玩家數據並重新開始</div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { PHASE_LABEL, type GamePhase } from '../types'

const uiStore = useUIStore()
const gameStore = useGameStore()

const layouts = [
  { id: 'arc', label: '經典環繞', icon: '⭕' },
  { id: 'grid', label: '角落網格', icon: '⏹️' },
  { id: 'stack', label: '側面清單', icon: '📋' },
  { id: 'inner', label: '內圈向心', icon: '⏬' },
]

const phaseLabel = computed(() => PHASE_LABEL[gameStore.phase])

const nextPhase: Record<GamePhase, GamePhase> = {
  Setup: 'FirstNight',
  FirstNight: 'Day',
  Day: 'Night',
  Night: 'Day',
}

const nextPhaseLabel = computed(() =>
  PHASE_LABEL[nextPhase[gameStore.phase]]
)

function openNightOrder() {
  uiStore.openPanel('night-order')
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

async function advance() {
  await gameStore.advancePhase()
  uiStore.closePanel()
}

async function exportGame() {
  const json = await gameStore.exportState()
  if (!json) return
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `botc-game-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
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
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px 20px 12px 12px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 16px 10px;
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
  padding: 13px 16px;
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

/* 佈局選擇器樣式 */
.layout-selector-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 8px 16px 16px;
}

.layout-option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
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
  font-size: 24px;
}

.opt-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.active-check {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 12px;
  color: var(--color-gold);
  font-weight: bold;
}
</style>
