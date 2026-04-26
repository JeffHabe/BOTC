<template>
  <div class="overlay" @click.self="uiStore.closeRolePicker()">
    <div class="role-picker-panel panel animate-slide-up">
      <div class="panel-header">
        <span class="panel-icon">🎭</span>
        <h2 class="panel-title">
          {{ title }}
        </h2>
        <button class="close-btn" @click="uiStore.closeRolePicker()">✕</button>
      </div>

      <div class="picker-search">
        <input 
          v-model="scriptStore.searchQuery" 
          placeholder="搜索角色..." 
          class="search-input"
          ref="searchInput"
        />
        <div class="filter-row">
          <div class="type-filters">
            <button 
              v-for="t in filterOptions" 
              :key="t.value"
              class="filter-btn"
              :class="{ active: scriptStore.filterType === t.value }"
              @click="scriptStore.filterType = t.value"
            >
              {{ t.label }}
            </button>
          </div>
          <button class="pool-toggle-btn" :class="{ 'is-active': showAllRoles }" @click="showAllRoles = !showAllRoles">
            {{ showAllRoles ? '☑️ 顯示全部' : '◻️ 僅限池內' }}
          </button>
        </div>
      </div>

      <div class="role-grid">
        <button 
          class="role-item role-item-none" 
          @click="selectRole(null)"
          v-if="!scriptStore.searchQuery"
        >
          <div class="role-icon">🚫</div>
          <div class="role-name">無角色</div>
        </button>

        <button 
          v-for="char in displayedCharacters" 
          :key="char.id"
          class="role-item"
          :class="[
            char.role_type.toLowerCase(), 
            { 'is-selected': isSelected(char), 'is-occupied': isOccupied(char) && !isSelected(char) }
          ]"
          @click="selectRole(char)"
        >
          <!-- 佔用標記 -->
          <div v-if="isOccupied(char) && !isSelected(char)" class="role-badge-occupied">
            已在場
          </div>

          <div class="role-icon">
            <img v-if="char.image" :src="char.image" :alt="char.name" />
            <span v-else class="emoji">{{ getEmoji(char.role_type) }}</span>
          </div>
          <div class="role-name">{{ char.name }}</div>
          <div class="role-check" v-if="isSelected(char)">✓</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useScriptStore } from '../stores/scriptStore'
import { useGameStore } from '../stores/gameStore'
import type { CharacterDef, RoleType } from '../types'

const uiStore = useUIStore()
const scriptStore = useScriptStore()
const gameStore = useGameStore()

const searchInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  searchInput.value?.focus()
})

const title = computed(() => {
  if (uiStore.rolePickerPlayer) {
    return `為 ${uiStore.rolePickerPlayer.name} 選擇角色`
  }
  if (uiStore.rolePickerDemonBluffIndex !== null) {
    return `設定惡魔虛張角色 #${uiStore.rolePickerDemonBluffIndex + 1}`
  }
  return '選擇角色'
})

const showAllRoles = ref(false)

const displayedCharacters = computed(() => {
  const all = scriptStore.filteredCharacters
  if (showAllRoles.value) return all
  
  const excluded = new Set(uiStore.excludedPoolIds)
  return all.filter(c => !excluded.has(c.id))
})

const filterOptions: { label: string, value: RoleType | 'All' }[] = [
  { label: '全部', value: 'All' },
  { label: '村民', value: 'Townsfolk' },
  { label: '外來者', value: 'Outsider' },
  { label: '爪牙', value: 'Minion' },
  { label: '惡魔', value: 'Demon' },
]

function getEmoji(type: RoleType) {
  const map: Record<string, string> = {
    Townsfolk: '🏘️', Outsider: '🧪', Minion: '🔱', Demon: '😈', Traveler: '🧳'
  }
  return map[type] || '❓'
}

function isSelected(char: CharacterDef) {
  if (uiStore.rolePickerPlayer) {
    return uiStore.rolePickerPlayer.role?.id === char.id
  }
  if (uiStore.rolePickerDemonBluffIndex !== null) {
    return gameStore.demonBluffs[uiStore.rolePickerDemonBluffIndex]?.id === char.id
  }
  return false
}

// 判斷角色是否已被分配 (場上玩家或其它虛張聲勢)
const inPlayRoleIds = computed(() => 
  new Set(gameStore.players.map(p => p.role?.id).filter(Boolean))
)

const bluffRoleIds = computed(() => 
  new Set(gameStore.demonBluffs.map(b => b?.id).filter(Boolean))
)

function isOccupied(char: CharacterDef) {
  // 對於目前正在選取的對象（玩家或虛張位），不算佔用
  // 但如果被「其它」玩家或「其它」虛張位佔用，則算佔用
  
  if (uiStore.rolePickerPlayer) {
    // 正在為玩家選角色：看其它玩家 + 所有虛張
    const otherPlayers = gameStore.players
      .filter(p => p.id !== uiStore.rolePickerPlayer?.id)
      .map(p => p.role?.id)
    return otherPlayers.includes(char.id) || bluffRoleIds.value.has(char.id)
  }
  
  if (uiStore.rolePickerDemonBluffIndex !== null) {
    // 正在選虛張：看所有玩家 + 其它虛張位
    const otherBluffs = gameStore.demonBluffs
      .filter((_, idx) => idx !== uiStore.rolePickerDemonBluffIndex)
      .map(b => b?.id)
    return inPlayRoleIds.value.has(char.id) || otherBluffs.includes(char.id)
  }
  
  return inPlayRoleIds.value.has(char.id) || bluffRoleIds.value.has(char.id)
}

async function selectRole(char: CharacterDef | null) {
  if (uiStore.rolePickerPlayer) {
    await gameStore.assignRole(uiStore.rolePickerPlayer.id, char)
  } else if (uiStore.rolePickerDemonBluffIndex !== null) {
    await gameStore.setDemonBluff(uiStore.rolePickerDemonBluffIndex, char)
  }
  uiStore.closeRolePicker()
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 0 8px;
}

.role-picker-panel {
  width: 100%;
  max-width: 500px;
  height: 80vh; /* 固定高度，防止因角色數量不同導致面板跳動 */
  display: flex;
  flex-direction: column;
  background: #1a1b23;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -10px 40px rgba(0,0,0,0.8);
}

.panel-header {
  display: flex;
  align-items: center;
  padding: 0 16px;
  min-height: 56px; /* 固定高度，防止標題文字換行時推擠下方內容 */
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.panel-title {
  flex: 1;
  font-family: var(--font-title);
  font-size: 15px;
  color: var(--color-gold);
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--color-text-muted);
}

.picker-search {
  padding: 12px 16px;
  background: rgba(0,0,0,0.1);
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(201,168,76,0.3);
  border-radius: 10px;
  color: white;
  margin-bottom: 12px;
  outline: none;
}

.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.type-filters {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  flex: 1;
}

.pool-toggle-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.2);
  color: var(--color-text-muted);
  border-radius: 14px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.pool-toggle-btn.is-active {
  background: rgba(201,168,76,0.15);
  border-color: var(--color-gold);
  color: var(--color-gold);
}

.filter-btn {
  white-space: nowrap;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--color-text-muted);
}

.filter-btn.active {
  background: var(--color-gold-muted);
  color: black;
  border-color: var(--color-gold);
}

.role-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;
}

.role-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 10px 4px;
  gap: 6px;
  position: relative;
  transition: all 0.2s;
}

.role-item:active { transform: scale(0.92); background: rgba(255,255,255,0.08); }

.role-item.is-selected {
  border-color: var(--color-gold);
  background: rgba(201, 168, 76, 0.15);
}

.role-item.is-occupied {
  opacity: 0.5;
  filter: grayscale(0.5);
}

.role-badge-occupied {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #aaa;
  font-size: 8px;
  padding: 1px 4px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 2;
}

.role-item-none { grid-column: span 4; flex-direction: row; justify-content: center; gap: 12px; padding: 12px; }

.role-icon { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); border-radius: 50%; }
.role-icon img { width: 36px; height: 36px; object-fit: contain; }
.emoji { font-size: 24px; }

.role-name { font-size: 11px; font-weight: 600; text-align: center; color: var(--color-text-primary); }

.role-item.townsfolk { border-top: 3px solid var(--color-townsfolk); }
.role-item.outsider  { border-top: 3px solid var(--color-outsider); }
.role-item.minion    { border-top: 3px solid var(--color-minion); }
.role-item.demon     { border-top: 3px solid var(--color-demon); }

.role-check {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--color-gold);
  color: black;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}
</style>
