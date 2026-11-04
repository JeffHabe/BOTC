<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="order-panel panel animate-slide-up">
      <div class="panel-header">
        <img src="/pic/sort.png" class="panel-header-icon" />
        <h2 class="panel-title">{{ uiStore.language === 'en' ? 'Seat Arrangement' : '調整座位順序' }}</h2>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <div class="info-text">
        {{ uiStore.language === 'en' ? 'Drag players or tap ▲/▼ arrows to reorder seating on the grimoire.' : '按住手柄拖曳或點擊 ▲/▼ 按鈕，調整玩家在魔典上的座次順序。' }}
      </div>

      <div class="player-list" ref="listRef">
        <div v-if="players.length === 0" class="empty-state">
          {{ uiStore.language === 'en' ? 'No players on the board' : '魔典上目前沒有玩家' }}
        </div>

        <div
          v-for="(player, index) in players"
          :key="player.id"
          class="player-item"
          :class="{
            'is-dragging': sortDragIndex === index,
            'is-over': sortOverIndex === index && sortDragIndex !== index
          }"
          :data-index="index"
        >
          <div
            class="drag-handle"
            :title="uiStore.language === 'en' ? 'Drag to reorder' : '按住拖曳排序'"
            @pointerdown="onPointerDown($event, index)"
          >☰</div>

          <span class="index">{{ index + 1 }}</span>

          <span class="name">
            {{ uiStore.language === 'en' && player.name === '空座位' ? 'Empty' : player.name }}
          </span>

          <span v-if="player.role" class="role-hint" :class="player.role.role_type?.toLowerCase()">
            ({{ player.role.name }})
          </span>

          <!-- 上移 / 下移控制按鈕 -->
          <div class="player-controls">
            <button
              class="move-btn"
              :disabled="index === 0"
              @click.stop="movePlayer(index, -1)"
              :title="uiStore.language === 'en' ? 'Move Up' : '上移'"
            >▲</button>
            <button
              class="move-btn"
              :disabled="index === players.length - 1"
              @click.stop="movePlayer(index, 1)"
              :title="uiStore.language === 'en' ? 'Move Down' : '下移'"
            >▼</button>
          </div>
        </div>
      </div>

      <div class="panel-actions">
        <button class="btn-primary" @click="closePanel">{{ uiStore.language === 'en' ? 'Close' : '關閉' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'

const uiStore = useUIStore()
const gameStore = useGameStore()

const listRef = ref<HTMLElement | null>(null)
const players = ref([...gameStore.players])

// 隨 gameStore.players 變更保持同步
watch(
  () => gameStore.players,
  (newPlayers) => {
    if (sortDragIndex.value === null) {
      players.value = [...newPlayers]
    }
  },
  { deep: true }
)

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

// 點擊 ▲ / ▼ 按鈕移動順序
async function movePlayer(index: number, delta: number) {
  const targetIndex = index + delta
  if (targetIndex < 0 || targetIndex >= players.value.length) return

  const arr = [...players.value]
  const [removed] = arr.splice(index, 1)
  arr.splice(targetIndex, 0, removed)
  players.value = arr

  // 同步並儲存到 store 與後端
  await gameStore.reorderPlayers(players.value.map(p => p.id))
}

// --- 跨裝置 Pointer Events 拖曳排序實作 ---
const sortDragIndex = ref<number | null>(null)
const sortOverIndex = ref<number | null>(null)

function onPointerDown(e: PointerEvent, index: number) {
  if (e.button !== 0) return
  if (e.cancelable) e.preventDefault()

  const handleEl = e.currentTarget as HTMLElement
  try {
    handleEl.setPointerCapture(e.pointerId)
  } catch (_) {}

  sortDragIndex.value = index
  sortOverIndex.value = index

  let rafId: number | null = null
  let latestClientY = e.clientY

  const onPointerMove = (moveEvt: PointerEvent) => {
    if (sortDragIndex.value === null) return
    if (moveEvt.cancelable) moveEvt.preventDefault()
    latestClientY = moveEvt.clientY

    if (rafId !== null) return

    rafId = requestAnimationFrame(() => {
      rafId = null
      if (sortDragIndex.value === null || !listRef.value) return

      const clientY = latestClientY
      const currentDrag = sortDragIndex.value
      const items = listRef.value.querySelectorAll<HTMLElement>('.player-item')
      if (items.length === 0) return

      let targetIdx = currentDrag

      if (currentDrag > 0) {
        for (let i = currentDrag - 1; i >= 0; i--) {
          const rect = items[i].getBoundingClientRect()
          const midY = rect.top + rect.height / 2
          if (clientY < midY) {
            targetIdx = i
          } else {
            break
          }
        }
      }

      if (currentDrag < items.length - 1 && targetIdx === currentDrag) {
        for (let i = currentDrag + 1; i < items.length; i++) {
          const rect = items[i].getBoundingClientRect()
          const midY = rect.top + rect.height / 2
          if (clientY > midY) {
            targetIdx = i
          } else {
            break
          }
        }
      }

      if (targetIdx !== currentDrag) {
        const arr = [...players.value]
        const [removed] = arr.splice(currentDrag, 1)
        arr.splice(targetIdx, 0, removed)
        players.value = arr

        sortDragIndex.value = targetIdx
        sortOverIndex.value = targetIdx
      }
    })
  }

  const cleanup = async (upEvt: PointerEvent) => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    try {
      handleEl.releasePointerCapture(upEvt.pointerId)
    } catch (_) {}

    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', cleanup)
    window.removeEventListener('pointercancel', cleanup)

    if (sortDragIndex.value !== null) {
      await gameStore.reorderPlayers(players.value.map(p => p.id))
    }

    sortDragIndex.value = null
    sortOverIndex.value = null
  }

  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', cleanup)
  window.addEventListener('pointercancel', cleanup)
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
  max-width: 440px;
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

.close-btn { 
  background: none; 
  border: none; 
  font-size: 18px; 
  color: var(--color-text-muted); 
  cursor: pointer; 
}

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
  min-height: 200px;
}

.empty-state {
  text-align: center;
  color: var(--color-text-muted);
  padding: 32px 16px;
  font-size: 14px;
}

.player-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  gap: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  background: var(--color-bg-surface);
  transition: background 0.15s, opacity 0.15s, border-color 0.15s;
  user-select: none;
}

.player-item.is-dragging {
  opacity: 0.5;
  background: rgba(201, 168, 76, 0.15);
}

.player-item.is-over {
  border-top: 2px solid var(--color-gold);
  background: rgba(201, 168, 76, 0.08);
}

.index {
  width: 24px;
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: bold;
}

.drag-handle {
  color: var(--color-gold-muted);
  font-size: 18px;
  padding: 4px 6px;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
  color: var(--color-gold);
}

.name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
}

.role-hint {
  font-size: 11px;
  color: var(--color-gold-muted);
}
.role-hint.townsfolk { color: #4a90e2; }
.role-hint.outsider { color: #50e3c2; }
.role-hint.minion { color: #f5a623; }
.role-hint.demon { color: #e02020; }
.role-hint.traveler { color: #b8e986; }

.player-controls {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.move-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--color-text-primary);
  border-radius: 6px;
  width: 32px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.move-btn:hover:not(:disabled) {
  background: rgba(201, 168, 76, 0.2);
  border-color: var(--color-gold);
  color: var(--color-gold);
}

.move-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.panel-actions {
  padding: 16px;
  border-top: 1px solid rgba(255,255,255,0.08);
}

.btn-primary { 
  width: 100%; 
  padding: 10px;
  font-size: 14px;
}
</style>
