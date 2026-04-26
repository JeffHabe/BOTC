<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="night-order-panel panel animate-slide-up">
      <div class="panel-header">
        <span class="panel-icon">🌙</span>
        <h2 class="panel-title">夜晚行動順序</h2>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <!-- 標籤切換 -->
      <div class="tab-bar">
        <button
          class="tab-btn"
          :class="{ 'tab-active': activeTab === 'first' }"
          @click="activeTab = 'first'"
        >首個夜晚</button>
        <button
          class="tab-btn"
          :class="{ 'tab-active': activeTab === 'other' }"
          @click="activeTab = 'other'"
        >其他夜晚</button>
      </div>

      <!-- 順序列表 -->
      <div class="order-list">
        <div class="order-empty" v-if="currentOrder.length === 0">
          <span>此劇本無夜晚行動角色</span>
        </div>

        <div
          v-for="(char, i) in currentOrder"
          :key="char.id"
          class="order-item"
          :class="{
            'order-item-active': isActiveInGame(char),
            'order-item-evil': isEvilRole(char),
          }"
        >
          <!-- 序號 -->
          <div class="order-index">{{ i + 1 }}</div>

          <!-- 角色圖示 -->
          <div class="order-role-icon">
            <img v-if="char.image" :src="char.image" :alt="char.name" />
            <span v-else class="order-role-emoji">{{ roleEmoji(char) }}</span>
          </div>

          <!-- 角色資訊 -->
          <div class="order-info">
            <div class="order-role-name">{{ char.name }}</div>
            <div class="order-role-type" :class="char.role_type.toLowerCase()">
              {{ roleTypeLabel(char) }}
            </div>
            <!-- 夜晚提示語 (正式 JSON 內容) -->
            <div class="order-reminder" v-if="getNightReminder(char)">
              {{ getNightReminder(char) }}
            </div>
          </div>

          <!-- 玩家名稱 (若已指派角色) -->
          <div class="order-player" v-if="getPlayerByRole(char.id)">
            <span class="order-player-name">{{ getPlayerByRole(char.id)!.name }}</span>
            <span
              v-if="!getPlayerByRole(char.id)!.is_alive"
              class="order-player-dead"
            >💀</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'
import type { RoleType } from '../types'
import { ROLE_TYPE_LABEL } from '../types'

const gameStore = useGameStore()
const uiStore = useUIStore()

const activeTab = ref<'first' | 'other'>('first')

/**
 * 系統預設流程 (首夜專用)
 */
const SYSTEM_ACTIONS: any[] = [
  {
    id: 'sys_minion_info',
    name: '爪牙信息',
    role_type: 'Minion',
    first_night_reminder: '爪牙彼此相認，並得知惡魔是誰。',
    is_system: true
  },
  {
    id: 'sys_demon_info',
    name: '惡魔信息',
    role_type: 'Demon',
    first_night_reminder: '惡魔得知爪牙是誰，並獲得三個不在場的角色作為偽裝（虛張聲勢）。',
    is_system: true
  }
]


const currentOrder = computed(() => {
  const isFirst = activeTab.value === 'first'
  
  // 2. 過濾已上場的角色
  const inPlayRoleIds = new Set(gameStore.players.map(p => p.role?.id).filter(Boolean))
  let baseOrder = [...(isFirst ? gameStore.firstNightOrder : gameStore.otherNightOrder)]
  baseOrder = baseOrder.filter(char => inPlayRoleIds.has(char.id))

  // 3. 首夜添加系統步驟 (任何劇本首夜皆顯示)
  if (isFirst) {
    return [...SYSTEM_ACTIONS, ...baseOrder]
  }
  
  return baseOrder
})

function isActiveInGame(char: any) {
  if (char.is_system) return true
  return gameStore.players.some(p => p.role?.id === char.id && p.is_alive)
}

function isEvilRole(char: any) {
  return char.role_type === 'Minion' || char.role_type === 'Demon'
}

function getPlayerByRole(roleId: string) {
  return gameStore.players.find(p => p.role?.id === roleId) ?? null
}

function roleEmoji(char: any) {
  if (char.id === 'sys_minion_info') return '🔱'
  if (char.id === 'sys_demon_info') return '😈'
  const map: Record<RoleType, string> = {
    Townsfolk: '👤', Outsider: '👤', Minion: '🔱', Demon: '😈',
    Traveler: '👤', Fabled: '👤'
  }
  return map[char.role_type as RoleType] ?? '❓'
}

function roleTypeLabel(char: any) {
  if (char.is_system) return '系統流程'
  const type = char.role_type as RoleType
  return ROLE_TYPE_LABEL[type] ?? type
}

function getNightReminder(char: any) {
  return activeTab.value === 'first' 
    ? char.first_night_reminder 
    : char.other_night_reminder
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

.night-order-panel {
  width: 100%;
  max-width: 440px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px 20px 12px 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid rgba(201,168,76,0.15);
}

.panel-icon { font-size: 20px; }

.panel-title {
  font-family: var(--font-title);
  font-size: 16px;
  color: var(--color-gold);
  flex: 1;
  letter-spacing: 1px;
}

.close-btn {
  color: var(--color-text-muted);
  font-size: 16px;
  background: none;
  padding: 4px 8px;
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.tab-btn {
  flex: 1;
  padding: 12px;
  font-size: 13px;
  color: var(--color-text-muted);
  background: none;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
}

.tab-btn.tab-active {
  color: var(--color-gold);
  border-bottom-color: var(--color-gold);
}

.order-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.order-empty {
  padding: 40px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-left: 3px solid transparent;
  transition: all var(--transition-fast);
}

.order-item:active { background: rgba(255,255,255,0.04); }

.order-item-active {
  border-left-color: var(--color-gold);
  background: rgba(201, 168, 76, 0.05);
}

.order-item-evil {
  background: rgba(139, 26, 26, 0.05);
}

.order-index {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-bg-elevated);
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.order-role-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.order-role-icon img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.order-role-emoji { font-size: 18px; }

.order-info { flex: 1 }

.order-role-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.order-role-type {
  font-size: 11px;
  margin-top: 1px;
}

.order-role-type.townsfolk { color: var(--color-townsfolk); }
.order-role-type.outsider  { color: var(--color-outsider); }
.order-role-type.minion    { color: var(--color-minion); }
.order-role-type.demon     { color: var(--color-demon); }

.order-reminder {
  font-size: 11px;
  color: var(--color-gold-muted);
  margin-top: 4px;
  line-height: 1.4;
  font-style: italic;
  background: rgba(255,255,255,0.03);
  padding: 4px 8px;
  border-radius: 4px;
  border-left: 2px solid var(--color-gold-muted);
}

.order-player {
  display: flex;
  align-items: center;
  gap: 4px;
}

.order-player-name {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.order-player-dead { font-size: 12px; }
</style>
