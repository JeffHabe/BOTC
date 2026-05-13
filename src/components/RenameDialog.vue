<template>
  <div class="overlay" @click.self="uiStore.closeRenameDialog()">
    <div class="rename-dialog animate-slide-up">
      <h3 class="dialog-title">更名玩家</h3>
      <input
        v-model="newName"
        class="rename-input"
        type="text"
        placeholder="輸入新的名稱..."
        maxlength="14"
        @keyup.enter="confirm"
        autofocus
        ref="inputRef"
      />
      <div class="dialog-actions">
        <button class="btn-ghost" @click="uiStore.closeRenameDialog()">取消</button>
        <button class="btn-primary" @click="confirm" :disabled="!newName.trim()">確認</button>
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
const newName = ref(uiStore.renameDialogPlayer?.name || '')
const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  inputRef.value?.focus()
  inputRef.value?.setSelectionRange(0, newName.value.length)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'Esc') {
    e.stopImmediatePropagation()
    uiStore.closeRenameDialog()
  }
}

async function confirm() {
  const player = uiStore.renameDialogPlayer
  if (!player || !newName.value.trim()) return
  await gameStore.renamePlayer(player.id, newName.value.trim())
  uiStore.closeRenameDialog()
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.rename-dialog {
  background: linear-gradient(160deg, var(--color-bg-elevated), var(--color-bg-mid));
  border: var(--border-panel);
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 340px;
  box-shadow: var(--shadow-panel);
  max-height: 85vh;
  overflow-y: auto;
}

.dialog-title {
  font-family: var(--font-title);
  font-size: 16px;
  color: var(--color-gold);
  margin-bottom: 16px;
  text-align: center;
}

.rename-input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(201,168,76,0.3);
  border-radius: 10px;
  color: var(--color-text-bright);
  font-size: 16px;
  outline: none;
  margin-bottom: 16px;
  text-align: center;
}

.rename-input:focus { border-color: var(--color-gold); }

.dialog-actions {
  display: flex;
  gap: 10px;
}

.dialog-actions button { flex: 1; }
button:disabled { opacity: 0.4; pointer-events: none; }
</style>
