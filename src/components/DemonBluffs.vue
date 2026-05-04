<template>
  <div class="demon-bluffs">
    <div class="bluffs-header">
      <span class="header-icon">👿</span>
      <span class="header-title">惡魔虛張</span>
    </div>
    
    <div class="bluffs-row">
      <div 
        v-for="(bluff, index) in gameStore.demonBluffs" 
        :key="index"
        class="bluff-slot"
        :class="{ 'is-locked': gameStore.phase !== 'Setup' }"
        @click="gameStore.phase === 'Setup' && uiStore.openRolePickerForBluff(index)"
      >
        <div v-if="bluff" class="bluff-token">
          <img v-if="bluff.image" :src="bluff.image" :alt="bluff.name" class="bluff-img" />
          <span v-else class="bluff-emoji">📸</span>
          <div class="bluff-name">{{ bluff.name }}</div>
        </div>
        <div v-else class="bluff-empty">
          <span class="empty-plus">{{ gameStore.phase === 'Setup' ? '+' : '🔒' }}</span>
          <div class="empty-text">{{ gameStore.phase === 'Setup' ? '設置' : '已鎖定' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'

const gameStore = useGameStore()
const uiStore = useUIStore()
</script>

<style scoped>
.demon-bluffs {
  background: rgba(139, 26, 26, 0.08);
  border: 1px solid rgba(139, 26, 26, 0.2);
  border-radius: 12px;
  padding: 10px 12px;
  width: 100%;
}

.bluffs-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.header-icon { font-size: 14px; }
.header-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #e87070;
}

.bluffs-row {
  display: flex;
  gap: 10px;
  justify-content: space-between;
}

.bluff-slot {
  flex: 1;
  aspect-ratio: 1;
  background: rgba(0,0,0,0.2);
  border: 1px dashed rgba(255,255,255,0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  overflow: hidden;
}

.bluff-slot:hover:not(.is-locked) {
  background: rgba(0,0,0,0.3);
  border-color: rgba(232, 112, 112, 0.4);
}

.bluff-slot.is-locked {
  cursor: default;
  opacity: 0.6;
  filter: grayscale(0.5);
  border-style: solid;
  border-color: rgba(255,255,255,0.05);
}

.bluff-token {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
}

.bluff-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.bluff-emoji { font-size: 18px; }

.bluff-name {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-townsfolk);
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bluff-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--color-text-muted);
}

.empty-plus { font-size: 16px; margin-bottom: -2px; }
.empty-text { font-size: 9px; }
</style>
