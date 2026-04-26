<template>
  <div v-if="player" class="sheet-overlay">
    <!-- 遮罩層：點擊此處關閉 -->
    <div class="sheet-backdrop" @click="uiStore.selectPlayer(null)"></div>
    
    <transition name="sheet-slide" appear>
      <div class="control-sheet" @click.stop>
        <!-- 手把條 -->
        <div class="sheet-handle" @click="uiStore.selectPlayer(null)"></div>
        
        <div class="sheet-content">
          <!-- 玩家標題區 -->
          <div class="player-header">
            <div 
              class="player-avatar" 
              :class="!uiStore.isRolesHidden ? player.role?.role_type.toLowerCase() : ''"
              @click="uiStore.isSingleRoleShowcase = true"
              title="點擊放大展示"
            >
              <img v-if="player.role?.image && !uiStore.isRolesHidden" :src="player.role.image" alt="" />
              <span v-else>{{ (player.role && !uiStore.isRolesHidden) ? '🎭' : '👤' }}</span>
            </div>
            <div class="player-meta">
              <h2 class="name" @click="handleRename" title="點擊修改名稱" style="cursor: pointer;">{{ player.name }}</h2>
              <p class="role" :class="!uiStore.isRolesHidden ? player.role?.role_type.toLowerCase() : ''">
                {{ uiStore.isRolesHidden ? '角色已隱藏' : (player.role?.name || '未指派角色') }}
              </p>
            </div>
            <button class="close-sheet" @click="uiStore.selectPlayer(null)">✕</button>
          </div>

          <!-- 角色能力描述 -->
          <div v-if="player.role?.ability && !uiStore.isRolesHidden" class="player-ability-box">
            {{ player.role.ability }}
          </div>

          <!-- 頂部重點操作：提示標記 -->
          <button class="action-btn reminder-btn-hero" @click="handleReminderPicker">
            <span class="icon">🔖</span>
            <span class="label">提示標記 (Reminders)</span>
          </button>

          <!-- 主操作按鈕組 (大按鈕) -->
          <div class="action-grid">
            <button 
              class="action-btn death-btn" 
              :class="{ 'is-dead': !player.is_alive }"
              @click="handleToggleAlive"
            >
              <span class="icon">{{ player.is_alive ? '💀' : '❤️' }}</span>
              <span class="label">{{ player.is_alive ? '標記死亡' : '恢復存活' }}</span>
            </button>

            <button class="action-btn role-btn" @click="handleRolePicker">
              <span class="icon">🎭</span>
              <span class="label">變更角色</span>
            </button>
          </div>

          <!-- 次要切換開關 -->
          <div class="toggle-list">
            <div class="toggle-item" v-if="!player.is_alive">
              <div class="toggle-info">
                <span class="t-icon">👻</span>
                <div>
                  <div class="t-title">靈魂投票權</div>
                  <div class="t-sub">{{ player.has_ghost_vote ? '尚未使用' : '已使用' }}</div>
                </div>
              </div>
              <button 
                class="switch" 
                :class="{ 'active': player.has_ghost_vote }"
                @click="handleToggleGhost"
              >
                <div class="switch-dot"></div>
              </button>
            </div>

            <div class="toggle-item">
              <div class="toggle-info">
                <span class="t-icon">🗳️</span>
                <div>
                  <div class="t-title">今日可提名</div>
                  <div class="t-sub">{{ player.can_nominate ? '可以提名' : '不可提名' }}</div>
                </div>
              </div>
              <button 
                class="switch" 
                :class="{ 'active': player.can_nominate }"
                @click="handleToggleNominate"
              >
                <div class="switch-dot"></div>
              </button>
            </div>
          </div>

          <!-- 提名操作 (僅白天顯示) -->
          <div class="nomination-actions" v-if="gameStore.phase === 'Day'">
            <div class="section-title">提名管理</div>
            <div class="action-grid mini">
              <button 
                class="action-btn nom-btn" 
                @click="handleStartNominationAs"
                :disabled="!player.is_alive || !player.can_nominate"
              >
                <span class="icon">📢</span>
                <span class="label">由他發起提名</span>
              </button>
              <button 
                class="action-btn nom-btn" 
                @click="handleNominateHim"
                :disabled="player.is_nominated"
              >
                <span class="icon">⚖️</span>
                <span class="label">提名此玩家</span>
              </button>
            </div>
          </div>

          <!-- 危險操作 -->
          <button class="remove-btn" @click="handleRemove">
            🗑️ 移除此玩家
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'

const uiStore = useUIStore()
const gameStore = useGameStore()

const player = computed(() => {
  return gameStore.players.find(p => p.id === uiStore.selectedPlayerId)
})

async function handleToggleAlive() {
  if (player.value) await gameStore.toggleAlive(player.value.id)
}

function handleRolePicker() {
  if (player.value) {
    uiStore.openRolePicker(player.value)
    uiStore.selectPlayer(null) // 縮回工具列
  }
}

function handleRename() {
  if (player.value) {
    uiStore.openRenameDialog(player.value)
    uiStore.selectPlayer(null) // 縮回工具列
  }
}

function handleReminderPicker() {
  if (player.value) {
    uiStore.openReminderPicker(player.value.id)
    uiStore.selectPlayer(null) // 縮回工具列
  }
}


async function handleToggleGhost() {
  if (player.value) await gameStore.toggleGhostVote(player.value.id)
}

async function handleToggleNominate() {
  if (player.value) await gameStore.toggleCanNominate(player.value.id)
}

function handleRemove() {
  if (!player.value) return
  const targetId = player.value.id
  const targetName = player.value.name
  
  uiStore.selectPlayer(null) // 點擊按鈕後立即縮回面板
  
  uiStore.showConfirm(
    '移除玩家',
    `確定要移除 ${targetName} 嗎？`,
    async () => {
      await gameStore.removePlayer(targetId)
    },
    true
  )
}

function handleStartNominationAs() {
  if (player.value) {
    uiStore.startNomination(player.value.id, '')
    uiStore.selectPlayer(null)
  }
}

function handleNominateHim() {
  if (player.value) {
    uiStore.startNomination('', player.value.id)
    uiStore.selectPlayer(null)
  }
}
</script>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: flex-end;
}

.sheet-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
}

.control-sheet {
  position: relative;
  width: 100%;
  background: #1a1c24;
  background: linear-gradient(to bottom, #242835, #16181f);
  border-top: 2px solid rgba(201, 168, 76, 0.4);
  border-radius: 24px 24px 0 0;
  padding-bottom: env(safe-area-inset-bottom, 20px);
  box-shadow: 0 -10px 40px rgba(0,0,0,0.6);
  z-index: 2001;
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  margin: 12px auto;
  cursor: pointer;
}

.sheet-content {
  padding: 0 20px 20px;
}

.player-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  position: relative;
}

.player-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border: 2px solid #555;
  overflow: hidden;
  flex-shrink: 0;
  cursor: zoom-in; /* 加入放大圖示暗示 */
  transition: transform 0.2s;
}

.player-avatar:active {
  transform: scale(0.9);
}

.player-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.player-avatar.townsfolk { border-color: var(--color-townsfolk); }
.player-avatar.outsider { border-color: var(--color-outsider); }
.player-avatar.minion { border-color: var(--color-minion); }
.player-avatar.demon { border-color: var(--color-demon); }

.player-meta .name {
  font-family: var(--font-title);
  font-size: 26px;
  color: var(--color-text-bright);
  margin-bottom: 4px;
}

.role {
  font-size: 18px;
  font-weight: 500;
}

.role.townsfolk { color: var(--color-townsfolk); }
.role.outsider { color: var(--color-outsider); }
.role.minion { color: var(--color-minion); }
.role.demon { color: var(--color-demon); }

.close-sheet {
  margin-left: auto;
  background: rgba(255,255,255,0.05);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #888;
}

.player-ability-box {
  font-size: 13px;
  color: #bbb;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  line-height: 1.5;
  border-left: 3px solid rgba(201, 168, 76, 0.5);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.action-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  color: white;
}

.action-btn:active {
  background: rgba(255,255,255,0.1);
  transform: scale(0.96);
}

.action-btn .icon { font-size: 24px; }
.action-btn .label {
  font-size: 15px;
  font-weight: 600;
  color: #ccc;
}

.death-btn.is-dead {
  background: rgba(139, 26, 26, 0.2);
  border-color: rgba(139, 26, 26, 0.4);
}
.death-btn.is-dead .label { color: #e87070; }

.reminder-btn-hero {
  width: 100%;
  margin-bottom: 12px;
  background: rgba(201, 168, 76, 0.1);
  border: 1px solid rgba(201, 168, 76, 0.3);
  padding: 16px;
  flex-direction: row !important; /* 強制橫向排列 */
  justify-content: center;
  gap: 12px !important;
  border-radius: 18px;
}

.reminder-btn-hero .label {
  color: var(--color-gold);
  font-size: 16px;
}

.action-grid.mini .action-btn {
  padding: 10px;
  flex-direction: row;
  justify-content: center;
}

.toggle-list {
  background: rgba(0,0,0,0.2);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 20px;
}

.toggle-item {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.toggle-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.t-icon { font-size: 18px; }
.t-title { font-size: 14px; color: #eee; font-weight: 500; }
.t-sub { font-size: 11px; color: #888; }

.switch {
  width: 44px;
  height: 24px;
  background: #333;
  border-radius: 12px;
  position: relative;
  transition: background 0.3s;
  border: none;
}

.switch.active { background: var(--color-gold); }
.switch-dot {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s;
}
.switch.active .switch-dot { transform: translateX(20px); }

.remove-btn {
  width: 100%;
  padding: 12px;
  background: none;
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: #f44336;
  border-radius: 12px;
  font-size: 13px;
}

.nomination-actions {
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(201, 168, 76, 0.05);
  border: 1px solid rgba(201, 168, 76, 0.1);
  border-radius: 16px;
}

.nomination-actions .section-title {
  margin-bottom: 12px;
  font-size: 11px;
  color: var(--color-gold-muted);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.action-grid.mini {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.sheet-slide-enter-active, .sheet-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.sheet-slide-enter-from, .sheet-slide-leave-to {
  transform: translateY(100%);
}
</style>
