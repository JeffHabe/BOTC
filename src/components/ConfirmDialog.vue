<template>
  <div class="overlay" @click.self="uiStore.closeConfirm()">
    <div class="confirm-dialog animate-slide-up">
      <div class="confirm-icon" :class="{ danger: uiStore.confirmDialog?.danger }">
        {{ uiStore.confirmDialog?.danger ? '⚠️' : 'ℹ️' }}
      </div>
      <h3 class="confirm-title">{{ uiStore.confirmDialog?.title }}</h3>
      <p class="confirm-message">{{ uiStore.confirmDialog?.message }}</p>
      <div class="confirm-actions">
        <button v-if="!uiStore.confirmDialog?.alertOnly" class="btn-ghost" @click="uiStore.closeConfirm()">取消</button>
        <button
          :class="uiStore.confirmDialog?.danger ? 'btn-danger' : 'btn-primary'"
          @click="onConfirm"
        >確認</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useUIStore } from '../stores/uiStore'
const uiStore = useUIStore()

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'Esc') {
    e.stopImmediatePropagation()
    uiStore.closeConfirm()
  }
}

async function onConfirm() {
  await uiStore.confirmDialog?.onConfirm()
  uiStore.closeConfirm()
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.confirm-dialog {
  background: linear-gradient(160deg, var(--color-bg-elevated), var(--color-bg-mid));
  border: var(--border-panel);
  border-radius: 20px;
  padding: 28px 24px 20px;
  width: 100%;
  max-width: 340px;
  text-align: center;
  box-shadow: var(--shadow-panel);
  max-height: 85vh;
  overflow-y: auto;
}

.confirm-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.confirm-icon.danger { color: var(--color-red-bright); }

.confirm-title {
  font-family: var(--font-title);
  font-size: 17px;
  color: var(--color-text-bright);
  margin-bottom: 10px;
}

.confirm-message {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 24px;
}

.confirm-actions {
  display: flex;
  gap: 10px;
}

.confirm-actions button {
  flex: 1;
}
</style>
