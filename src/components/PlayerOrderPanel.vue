<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="order-panel panel animate-slide-up">
      <div class="panel-header">
        <img src="/pic/sort.png" class="panel-header-icon" />
        <h2 class="panel-title">調整座位順序</h2>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <div class="info-text">
        按住並拖曳玩家來調整他們在魔典上的座次順序。
      </div>

      <div class="player-list">
        <div
          v-for="(player, index) in players"
          :key="player.id"
          class="player-item"
          :class="{ 'drag-over': dragOver === index, 'dragging': dragging === index }"
          draggable="true"
          @dragstart="onDragStart(index)"
          @dragover.prevent="onDragOver(index)"
          @drop="onDrop(index)"
          @dragend="onDragEnd"
        >
          <span class="index">{{ index + 1 }}</span>
          <div class="drag-handle">☰</div>
          <span class="name">{{ player.name }}</span>
          <span v-if="player.role" class="role-hint">({{ player.role.name }})</span>
        </div>
      </div>

      <div class="panel-actions">
        <button class="btn-primary" @click="closePanel">關閉</button>
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

const players = ref([...gameStore.players])

const dragging = ref<number | null>(null)
const dragOver = ref<number | null>(null)

function onDragStart(index: number) {
  dragging.value = index
}

function onDragOver(index: number) {
  dragOver.value = index
}

async function onDrop(index: number) {
  if (dragging.value === null || dragging.value === index) return

  const arr = [...players.value]
  const [removed] = arr.splice(dragging.value, 1)
  arr.splice(index, 0, removed)
  players.value = arr

  // 自動儲存：直接更新 store
  await gameStore.reorderPlayers(players.value.map(p => p.id))

  dragging.value = index
  dragOver.value = null
}

function onDragEnd() {
  dragging.value = null
  dragOver.value = null
}

function closePanel() {
  uiStore.closePanel()
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

.order-panel {
  width: 100%;
  max-width: 400px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px 20px 12px 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.panel-header-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  margin-right: 8px;
}

.panel-title {
  flex: 1;
  font-family: var(--font-title);
  font-size: 16px;
  color: var(--color-gold);
}

.close-btn { background: none; border: none; font-size: 18px; color: var(--color-text-muted); cursor: pointer; }

.info-text {
  padding: 12px 16px;
  font-size: 12px;
  color: var(--color-text-muted);
  background: rgba(201,168,76,0.05);
}

.player-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.player-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  background: var(--color-bg-surface);
  cursor: grab;
  transition: background 0.15s, opacity 0.15s;
  user-select: none;
}

.player-item.dragging {
  opacity: 0.4;
  cursor: grabbing;
}

.player-item.drag-over {
  background: rgba(201, 168, 76, 0.12);
  border-color: rgba(201, 168, 76, 0.3);
}

.index {
  width: 20px;
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: bold;
}

.drag-handle {
  color: var(--color-gold-muted);
  font-size: 18px;
  padding: 0 4px;
}

.name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
}

.role-hint {
  font-size: 11px;
  color: var(--color-townsfolk);
  opacity: 0.6;
}

.panel-actions {
  padding: 16px;
  border-top: 1px solid rgba(255,255,255,0.08);
}

.btn-primary { width: 100%; }
</style>
