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
              <span v-else-if="player.role && !uiStore.isRolesHidden" class="role-text-fallback">{{ player.role.name.charAt(0) }}</span>
              <img v-else src="/pic/token1.png" alt="預設頭像" />
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
          <div v-if="player.role?.ability && !uiStore.isRolesHidden" class="player-ability-box" v-html="player.role.ability">
          </div>

          <!-- 核心操作網格 (第1列：死亡與變更角色並排；第2列：白天提名與被提名並排) -->
          <div class="action-grid">
            <template v-if="player.is_alive">
              <button class="action-btn death-btn" @click="handleKill">
                <img src="/pic/skull.png" class="action-btn-img" />
                <span class="label">死亡</span>
                <span v-if="isProtected" class="warning-badge" title="注意：該玩家目前有保護標記">⚠️被保護</span>
              </button>
            </template>
            <template v-else>
              <button class="action-btn revive-btn" @click="handleRevive">
                <img src="/pic/heart-edge.png" class="action-btn-img" />
                <span class="label">復活</span>
              </button>
            </template>

            <button class="action-btn role-btn" @click="handleRolePicker">
              <img src="/pic/mask-edge.png" class="action-btn-img" />
              <span class="label">變更角色</span>
            </button>

            <!-- 提名操作 (僅白天顯示) -->
            <template v-if="gameStore.phase === 'Day'">
              <button 
                class="action-btn nom-btn" 
                @click="handleStartNominationAs"
                :disabled="isNominatorDisabled"
              >
                <img src="/pic/fill-hand.png" class="action-btn-img" />
                <span class="label">提名</span>
              </button>
              <button 
                class="action-btn nom-btn" 
                @click="handleNominateHim"
                :disabled="player.is_nominated"
              >
                <img src="/pic/vote-tag.png?v=2" class="action-btn-img" />
                <span class="label">被提名</span>
              </button>
            </template>
          </div>

          <!-- 次要狀態與提示燈 -->
          <div class="toggle-list">
            <div class="toggle-item" v-if="!player.is_alive">
              <div class="toggle-info">
                <img src="/pic/grave.png" class="toggle-icon-img" />
                <div>
                  <div class="t-title">死亡票</div>
                  <div class="t-sub">
                    {{ player.has_ghost_vote || (player.extra_votes && player.extra_votes > 0) ? (player.extra_votes ? `剩餘 ${player.extra_votes + 1} 次` : '尚未使用') : '已使用' }}
                  </div>
                </div>
              </div>
              <!-- 提示燈：可以就亮，沒有就暗 -->
              <div 
                class="nominate-indicator-lamp" 
                :class="{ 'is-lit': player.has_ghost_vote || (player.extra_votes && player.extra_votes > 0) }"
                :title="(player.has_ghost_vote || (player.extra_votes && player.extra_votes > 0)) ? '尚未使用' : '已使用'"
              >
                <span class="lamp-bulb"></span>
                <span class="lamp-text">{{ (player.has_ghost_vote || (player.extra_votes && player.extra_votes > 0)) ? '有票' : '已使用' }}</span>
              </div>
            </div>

            <div class="toggle-item">
              <div class="toggle-info">
                <img src="/pic/fill-hand.png" class="toggle-icon-img" />
                <div>
                  <div class="t-title">提名權</div>
                  <div class="t-sub">
                    {{ nominateSubtext }}
                  </div>
                </div>
              </div>
              <!-- 提示燈：可以就亮，沒有就暗 -->
              <div 
                class="nominate-indicator-lamp" 
                :class="{ 'is-lit': canPlayerNominate }"
                :title="canPlayerNominate ? '可以提名' : '不可提名'"
              >
                <span class="lamp-bulb"></span>
                <span class="lamp-text">{{ canPlayerNominate ? '可提名' : '不可' }}</span>
              </div>
            </div>
          </div>

          <!-- 底部操作列 -->
          <div class="sheet-footer-actions">
            <button class="remove-btn" @click="handleRemove">
              <img src="/pic/trash.png" class="remove-btn-img" />
              移除此玩家
            </button>
            <button class="btn-ghost close-bottom-btn" @click="uiStore.selectPlayer(null)">
              ✕ 返回主畫面
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
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
    uiStore.selectPlayer(null)
  }
}

const player = computed(() => {
  return gameStore.players.find(p => p.id === uiStore.selectedPlayerId)
})

const isNominatorDisabled = computed(() => {
  const p = player.value
  if (!p) return true
  if (p.is_alive) {
    if (p.role?.id === 'golem' && gameStore.nominations.some(n => n.nominator_id === p.id)) {
      return true
    }
    return !p.can_nominate
  }
  if (p.role?.id === 'banshee') {
    return !p.can_nominate && !(p.extra_nominations && p.extra_nominations > 0)
  }
  return true
})

// 死者不能發起提名 (非報喪女妖特例)，提示燈與提名資格嚴格連動
const canPlayerNominate = computed(() => {
  return !isNominatorDisabled.value
})

const nominateSubtext = computed(() => {
  const p = player.value
  if (!p) return '不可提名'
  if (p.role?.id === 'golem') {
    const hasNominated = gameStore.nominations.some(n => n.nominator_id === p.id)
    if (hasNominated) return '每局限一次（已使用）'
    if (canPlayerNominate.value) return '每局限一次（可提名）'
  }
  if (canPlayerNominate.value) {
    return p.extra_nominations ? `剩餘 ${p.extra_nominations + 1} 次` : '可以提名'
  }
  return '不可提名'
})

// 偵測玩家是否處於保護狀態 (僅偵測當晚/當輪設定的標記，且發動者必須狀態正常)
const isProtected = computed(() => {
  if (!player.value) return false
  const protectKeywords = ['保護', '守護', '防護', 'safe', 'protected', '不吃刀','不會死亡']
  const abnormalKeywords = ['中毒', '醉酒', 'poisoned', 'drunk']

  // 1. 被動能力檢查：檢查玩家自己的角色能力描述
  if (player.value.role?.ability.includes('你不會死亡')) {
    // 檢查自己是否中毒或醉酒
    const isSelfAbnormal = player.value.reminders.some(rem => 
      abnormalKeywords.some(kw => rem.text.toLowerCase().includes(kw))
    )
    // 如果沒有異常狀態，則被動保護生效
    if (!isSelfAbnormal) return true
  }

  // 2. 外部標記檢查：偵測提示標記 (僅偵測當晚/當輪設定的標記，且發動者必須狀態正常)
  return player.value.reminders.some(rem => {
    // 基本檢查：輪次是否正確且包含關鍵字
    const isCurrentRound = rem.round === gameStore.round
    const isProtectText = protectKeywords.some(kw => rem.text.toLowerCase().includes(kw))
    
    if (!isCurrentRound || !isProtectText) return false

    // 來源檢查：如果來源是系統設定，則直接生效
    if (rem.source_role === '系統' || rem.source_role === 'System') return true

    // 發動者狀態檢查
    const sourcePlayer = gameStore.players.find(p => 
      p.role && (p.role.id === rem.source_role || p.role.name === rem.source_role)
    )
    if (sourcePlayer) {
      // 檢查該發動者是否中毒或醉酒
      const isSourceAbnormal = sourcePlayer.reminders.some(sRem => 
        abnormalKeywords.some(kw => sRem.text.toLowerCase().includes(kw))
      )
      // 如果發動者異常，則保護無效
      if (isSourceAbnormal) return false
    }

    return true
  })
})

async function handleKill() {
  if (player.value) {
    await gameStore.killPlayer(player.value.id)
  }
}

async function handleRevive() {
  if (player.value) {
    await gameStore.revivePlayer(player.value.id)
    // 移除處決或被殺的特殊標記
    const toRemove = player.value.reminders.filter(r => r.text === '處決' || r.text === '被殺')
    for (const r of toRemove) {
      await gameStore.removeReminder(player.value.id, r.id)
    }
  }
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
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  margin: 12px auto;
  cursor: pointer;
  flex-shrink: 0;
}

.sheet-content {
  padding: 0 20px 20px;
  overflow-y: auto;
  flex-grow: 1;
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

.full-width {
  grid-column: 1 / -1;
}

.action-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
  color: white;
  position: relative;
  min-height: 80px;
}

.action-btn:active {
  background: rgba(255,255,255,0.1);
  transform: scale(0.96);
}

.action-btn-img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}
.action-btn .label {
  font-size: 14px;
  font-weight: 600;
  color: #ccc;
}

.death-btn:active {
  background: rgba(139, 26, 26, 0.3);
}

.revive-btn {
  background: rgba(46, 125, 50, 0.1);
  border-color: rgba(46, 125, 50, 0.3);
}
.revive-btn .label { color: #81c784; }

.type-toggle-btn {
  background: rgba(201, 168, 76, 0.05);
  border-color: rgba(201, 168, 76, 0.2);
}
.type-toggle-btn .label { color: var(--color-gold-muted); }

.reminder-btn {
  background: rgba(201, 168, 76, 0.08);
  border-color: rgba(201, 168, 76, 0.2);
}
.reminder-btn .label { color: var(--color-gold); }

.rem-count-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: var(--color-gold);
  color: #000;
  font-size: 10px;
  font-weight: 900;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

/* 保護警告樣式 */
.warning-badge {
  position: absolute;
  top: 1px;
  left: 5px;
  font-size: 14px;
  filter: drop-shadow(0 0 5px rgba(255, 200, 0, 0.5));
  animation: pulse-warning 1.5s infinite ease-in-out;
  z-index: 5;
}

.has-warning {
  border-color: rgba(255, 166, 0, 0.5) !important;
  background: rgba(255, 166, 0, 0.1) !important;
  box-shadow: 0 0 15px rgba(255, 166, 0, 0.1);
}

@keyframes pulse-warning {
  0% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0.7; }
}

.role-btn {
  background: rgba(138, 92, 199, 0.05);
  border-color: rgba(138, 92, 199, 0.2);
}
.role-btn .label { color: #a78bfa; }

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

.remove-btn {
  width: 100%;
  padding: 12px;
  background: none;
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: #f44336;
  border-radius: 12px;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.remove-btn-img {
  width: 14px;
  height: 14px;
  object-fit: contain;
}
.toggle-icon-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.nominate-indicator-lamp {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 11px;
  color: #777;
  transition: all 0.3s ease;
}

.nominate-indicator-lamp .lamp-bulb {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #555;
  transition: all 0.3s ease;
}

.nominate-indicator-lamp.is-lit {
  color: #a7f3d0;
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(52, 211, 153, 0.35);
}

.nominate-indicator-lamp.is-lit .lamp-bulb {
  background: #10b981;
  box-shadow: 0 0 8px #10b981, 0 0 12px rgba(16, 185, 129, 0.6);
}

.sheet-footer-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.close-bottom-btn {
  width: 100%;
  padding: 12px;
  font-size: 14px;
  color: #aaa;
  border-color: rgba(255, 255, 255, 0.05);
}

.sheet-slide-enter-active, .sheet-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.sheet-slide-enter-from, .sheet-slide-leave-to {
  transform: translateY(100%);
}
.role-text-fallback {
  font-size: 32px;
  font-weight: 900;
  font-family: 'ChineseFont', var(--font-title), sans-serif;
  color: currentColor;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  user-select: none;
}
.player-avatar.townsfolk { border-color: var(--color-townsfolk); color: var(--color-townsfolk); }
.player-avatar.outsider { border-color: var(--color-outsider); color: var(--color-outsider); }
.player-avatar.minion { border-color: var(--color-minion); color: var(--color-minion); }
.player-avatar.demon { border-color: var(--color-demon); color: var(--color-demon); }
</style>
