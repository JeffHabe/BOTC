<template>
  <div class="overlay" @click.self="uiStore.addPlayerDialogOpen = false">
    <div class="add-player-dialog animate-slide-up">
      <h3 class="dialog-title">新增玩家</h3>
      <p class="dialog-sub">已有 {{ gameStore.players.length }} / 20 位玩家</p>
      <input
        v-model="name"
        class="name-input"
        type="text"
        placeholder="輸入玩家姓名..."
        maxlength="14"
        @keyup.enter="confirm"
        autofocus
      />
      <div class="dialog-actions mb-4">
        <button class="btn-ghost" @click="uiStore.addPlayerDialogOpen = false">取消</button>
        <button class="btn-primary" @click="confirm" :disabled="!name.trim()">確認</button>
      </div>

      <div class="divider"><span>或直接設定人數</span></div>

      <div class="batch-section">
        <div class="input-group">
          <input
            v-model.number="totalCount"
            class="count-input"
            type="number"
            placeholder="目標人數"
            min="1"
            max="20"
            @keyup.enter="confirmBatch"
          />
          <button 
            class="btn-primary" 
            @click="confirmBatch" 
            :disabled="!totalCount || totalCount <= gameStore.players.length || totalCount > 20"
          >
            補足
          </button>
        </div>
        <p class="hint-text">將補足「空白」名額直到人數達到 {{ totalCount || '?' }} 位</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'

const uiStore = useUIStore()
const gameStore = useGameStore()
const name = ref('')
const totalCount = ref<number | null>(null)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'Esc') {
    e.stopImmediatePropagation()
    uiStore.addPlayerDialogOpen = false
  }
}

async function confirm() {
  if (!name.value.trim()) return
  await gameStore.addPlayer(name.value.trim())
  name.value = ''
  uiStore.addPlayerDialogOpen = false
}

async function confirmBatch() {
  if (!totalCount.value || totalCount.value <= gameStore.players.length) return
  await gameStore.setPlayerCount(totalCount.value)
  uiStore.addPlayerDialogOpen = false
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.add-player-dialog {
  background: #1a1b23; /* 確保不透明 */
  border: 1px solid var(--color-gold-muted);
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 340px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9);
  text-align: center;
  position: relative;
  max-height: 85vh;
  overflow-y: auto;
}

.add-player-dialog::before {
  content: '';
  position: absolute;
  inset: 6px;
  border: 1px solid rgba(201, 168, 76, 0.1);
  border-radius: 14px;
  pointer-events: none;
}

.dialog-title {
  font-family: var(--font-title);
  font-size: 16px;
  color: var(--color-gold);
  margin-bottom: 4px;
}

.dialog-sub {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 16px;
}

.name-input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(201, 168, 76, 0.25);
  border-radius: 10px;
  color: var(--color-text-bright);
  font-size: 16px;
  font-family: var(--font-body);
  outline: none;
  margin-bottom: 16px;
  text-align: center;
  transition: all 0.2s ease;
}

.name-input:focus { border-color: var(--color-gold); }

.dialog-actions {
  display: flex;
  gap: 10px;
}

.dialog-actions button { flex: 1; }
button:disabled { opacity: 0.4; pointer-events: none; }

.mb-4 { margin-bottom: 24px; }

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 16px 0;
  color: var(--color-text-muted);
  font-size: 11px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.divider span {
  padding: 0 10px;
}

.batch-section {
  background: rgba(255,255,255,0.03);
  border-radius: 12px;
  padding: 16px;
  border: 1px dashed rgba(201,168,76,0.2);
}

.input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.count-input {
  flex: 1;
  padding: 10px;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: var(--color-text-bright);
  font-size: 15px;
  outline: none;
  text-align: center;
}

.count-input:focus { border-color: var(--color-gold); }

.hint-text {
  font-size: 11px;
  color: var(--color-text-muted);
  margin: 0;
}
</style>
