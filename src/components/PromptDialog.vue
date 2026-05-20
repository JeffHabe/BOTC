<template>
  <div class="overlay" @click.self="cancel">
    <div class="confirm-dialog animate-slide-up">
      <div class="confirm-icon">
        📝
      </div>
      <h3 class="confirm-title">{{ uiStore.promptDialog?.title }}</h3>
      <p class="confirm-message">{{ uiStore.promptDialog?.message }}</p>
      
      <input
        v-model="inputValue"
        ref="inputEl"
        class="prompt-input"
        @keyup.enter="confirm"
        @keyup.esc="cancel"
      />
      
      <div class="confirm-actions">
        <button class="btn-ghost" @click="cancel">取消</button>
        <button class="btn-primary" @click="confirm">確認</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useUIStore } from '../stores/uiStore'

const uiStore = useUIStore()
const inputValue = ref(uiStore.promptDialog?.defaultValue || '')
const inputEl = ref<HTMLInputElement | null>(null)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  // 自動聚焦輸入框並選中文字
  setTimeout(() => {
    inputEl.value?.focus()
    inputEl.value?.select()
  }, 100)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'Esc') {
    e.stopImmediatePropagation()
    cancel()
  }
}

function confirm() {
  uiStore.promptDialog?.onConfirm(inputValue.value)
}

function cancel() {
  uiStore.promptDialog?.onCancel()
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
  margin-bottom: 16px;
}

.prompt-input {
  width: 100%;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--color-text-primary);
  font-size: 14px;
  margin-bottom: 20px;
  outline: none;
  box-sizing: border-box;
}

.prompt-input:focus {
  border-color: var(--color-gold);
  background: rgba(255, 255, 255, 0.08);
}

.confirm-actions {
  display: flex;
  gap: 10px;
}

.confirm-actions button {
  flex: 1;
}
</style>
