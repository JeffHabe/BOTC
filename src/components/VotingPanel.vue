<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="voting-panel panel animate-slide-up">
      <div class="panel-header">
        <span class="panel-icon">🗳️</span>
        <h2 class="panel-title">投票管理</h2>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <!-- 發起提名 -->
      <div class="nominate-section" v-if="gameStore.phase === 'Day'">
        <div class="section-title">發起提名</div>
        <div class="nominate-row">
          <div class="select-wrap">
            <label class="select-label">提名者</label>
            <select v-model="nominatorId" class="player-select">
              <option value="" disabled>選擇玩家...</option>
              <option v-for="p in canNominate" :key="p.id" :value="p.id">
                {{ gameStore.players.findIndex(pl => pl.id === p.id) + 1 }}. {{ p.name }}
              </option>
            </select>
          </div>
          <div class="nominate-arrow">提名</div>
          <div class="select-wrap">
            <label class="select-label">被提名者</label>
            <select v-model="nomineeId" class="player-select">
              <option value="" disabled>選擇玩家...</option>
              <option v-for="p in notYetNominated" :key="p.id" :value="p.id">
                {{ gameStore.players.findIndex(pl => pl.id === p.id) + 1 }}. {{ p.name }}
              </option>
            </select>
          </div>
        </div>
        <button 
          class="btn-primary nominate-btn" 
          :disabled="!nominatorId || !nomineeId"
          @click="doNominate"
        >
          確認提名
        </button>
      </div>

      <!-- 提名列表 -->
      <div class="nominations-list">
        <div class="section-title">提名記錄 (第 {{ currentRound }} 輪)</div>

        <!-- 邪惡勢力統計 (僅說書人可見，若隱藏角色則不顯示) -->
        <div class="evil-stats-bar" v-if="!uiStore.isRolesHidden && nominations.length > 0">
          <div class="stat-box">
            <span class="label">🔱 爪牙提名:</span>
            <span class="value">{{ evilStats.minionNoms }}</span>
          </div>
          <div class="stat-divider">|</div>
          <div class="stat-box">
            <span class="label">👹 惡魔投票:</span>
            <span class="value">{{ evilStats.demonVotes }}</span>
          </div>
        </div>
        
        <div v-if="nominations.length === 0" class="empty-nominations">
          今日尚未有任何提名
        </div>

        <div 
          v-for="(nom, index) in nominations" 
          :key="index"
          class="nomination-card"
          :class="{ 'nom-executed': nom.executed, 'nom-expandable': nom.executed || nom.round < currentRound }"
          @click="toggleExpand(index)"
        >
          <div class="nom-header">
            <!-- 一般檢視模式 -->
            <template v-if="editingNomIndex !== index">
              <div class="nom-names">
                <span class="nom-round-tag">第 {{ nom.round }} 輪</span>
                <span :style="{ color: getPlayerColor(nom.nominator_id) }">{{ playerName(nom.nominator_id) }}</span> 
                <span class="nom-verb">提名了</span> 
                <span :style="{ color: getPlayerColor(nom.nominee_id) }">{{ playerName(nom.nominee_id) }}</span>
                
                <button 
                  v-if="!nom.executed && nom.round === currentRound" 
                  class="btn-edit-nom" 
                  @click.stop="startEditNomination(index)"
                  title="修改提名"
                >
                  ✍️
                </button>
              </div>
              <div class="nom-score" :class="{ 'score-pass': nom.votes_for.length >= (nom.round === currentRound && !nom.executed ? gameStore.threshold : nom.threshold) }">
                {{ nom.votes_for.length }} / {{ nom.round === currentRound && !nom.executed ? gameStore.threshold : nom.threshold }} 票
              </div>
            </template>

            <!-- 編輯模式 -->
            <div class="nom-edit-form" v-else @click.stop>
              <div class="edit-row">
                <select v-model="editNominatorId" class="player-select mini">
                  <option v-for="p in availableNominatorsForEdit" :key="p.id" :value="p.id">
                    {{ pIndex(p.id) }}. {{ p.name }}
                  </option>
                </select>
                <span class="nominate-arrow">提名</span>
                <select v-model="editNomineeId" class="player-select mini">
                  <option v-for="p in availableNomineesForEdit" :key="p.id" :value="p.id">
                    {{ pIndex(p.id) }}. {{ p.name }}
                  </option>
                </select>
              </div>
              <div class="edit-actions">
                <button class="btn-primary mini-btn" @click="saveEditNomination">儲存</button>
                <button class="btn-danger mini-btn" @click="cancelEditNomination">取消</button>
              </div>
              <div v-if="editError" class="edit-error">{{ editError }}</div>
            </div>
          </div>

          <!-- 投票詳情 -->
          <div class="nom-body" v-if="!nom.executed && nom.round === currentRound">
            <div class="vote-grid">
              <button 
                v-for="(p, idx) in gameStore.players" 
                :key="p.id"
                class="vote-btn"
                :class="{ 
                  'vote-yes': nom.votes_for.includes(p.id),
                  'vote-ghost': !p.is_alive,
                  'vote-spent': !p.is_alive && !p.has_ghost_vote && !nom.votes_for.includes(p.id)
                }"
                @click.stop="toggleVote(index, p.id)"
                :disabled="!p.is_alive && !p.has_ghost_vote && !nom.votes_for.includes(p.id)"
              >
                <div class="vote-player-wrap">
                  <span v-if="!p.is_alive" class="vote-ghost-icon">👻</span>
                  <span class="vote-player">{{ idx + 1 }}. {{ p.name }}</span>
                </div>
                <span v-if="nom.votes_for.includes(p.id)" class="vote-mark">✓</span>
              </button>
            </div>

            <div class="nom-actions">
              <button 
                class="btn-danger" 
                :disabled="getExecutionStatus(index).disabled"
                @click.stop="doExecute(index)"
              >
                {{ getExecutionStatus(index).label }}
              </button>
            </div>
          </div>

          <!-- 已執行或歷史記錄的樣式 -->
          <div class="nom-executed-badge" v-else-if="nom.executed">
            <span class="status">⚖️ 已處決</span>
            <span class="final-score">(今日最終票數: {{ nom.votes_for.length }})</span>
            <button class="btn-undo" @click.stop="doUndoExecute(index)">撤銷</button>
          </div>
          
          <div class="nom-history-badge" v-if="nom.executed || nom.round < currentRound || expandedNoms.has(index)">
            <div class="vote-summary" v-if="nom.votes_for.length > 0">
              贊成者 ({{ nom.votes_for.length }}位): 
              <span v-for="(vId, vIdx) in nom.votes_for" :key="vId" class="voter-item">
                <span :style="{ color: getPlayerColor(vId) }">{{ playerName(vId) }}</span>
                <span v-if="vIdx < nom.votes_for.length - 1" class="voter-sep">, </span>
              </span>
            </div>
            <div class="vote-summary" v-else>今日無人投贊成票</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'
import { ROLE_TYPE_COLOR } from '../types'

const gameStore = useGameStore()
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
    uiStore.closePanel()
  }
}

const nominatorId = computed({
  get: () => uiStore.nominationNominatorId,
  set: (val) => uiStore.nominationNominatorId = val
})
const nomineeId = computed({
  get: () => uiStore.nominationNomineeId,
  set: (val) => uiStore.nominationNomineeId = val
})

const currentRound = computed(() => gameStore.round)
const nominations = computed(() => gameStore.nominations)

const expandedNoms = ref(new Set<number>())

// 編輯模式狀態
const editingNomIndex = ref<number | null>(null)
const editNominatorId = ref('')
const editNomineeId = ref('')
const editError = ref('')

function toggleExpand(index: number) {
  const nom = nominations.value[index]
  if (nom.executed || nom.round !== currentRound.value) {
    if (expandedNoms.value.has(index)) {
      expandedNoms.value.delete(index)
    } else {
      expandedNoms.value.add(index)
    }
  }
}



const maxVotesInfo = computed(() => {
  let max = 0
  let count = 0
  const todayNoms = nominations.value.filter(n => n.round === currentRound.value && !n.executed)
  
  todayNoms.forEach(n => {
    const v = n.votes_for.length
    if (v > max) {
      max = v
      count = 1
    } else if (v === max && v > 0) {
      count++
    }
  })
  
  return { max, count }
})

function getExecutionStatus(nomIndex: number) {
  const nom = nominations.value[nomIndex]
  const votes = nom.votes_for.length
  const currentThreshold = nom.round === currentRound.value && !nom.executed ? gameStore.threshold : nom.threshold
  const thresholdReached = votes >= currentThreshold
  
  const isMax = votes === maxVotesInfo.value.max
  const isTie = isMax && maxVotesInfo.value.count > 1
  
  if (!thresholdReached) return { label: '未達門檻', disabled: true }
  if (!isMax) return { label: '非最高票', disabled: true }
  if (isTie) return { label: '票數平手', disabled: true }
  
  return { label: '執行處決', disabled: false }
}

const canNominate = computed(() =>
  gameStore.players.filter(p => p.can_nominate && p.is_alive)
)
const notYetNominated = computed(() =>
  gameStore.players.filter(p => !p.is_nominated)
)

function isMinion(id: string) {
  const p = gameStore.players.find(p => p.id === id)
  if (!p || !p.role) return false
  return p.role.role_type === 'Minion'
}

function isDemon(id: string) {
  const p = gameStore.players.find(p => p.id === id)
  if (!p || !p.role) return false
  return p.role.role_type === 'Demon'
}

const evilStats = computed(() => {
  const todayNoms = nominations.value.filter(n => n.round === currentRound.value)
  
  // 僅計算爪牙發起的提名次數
  const minionNoms = todayNoms.filter(n => isMinion(n.nominator_id)).length
  
  // 僅計算惡魔在今日所有投票中投出的總票數
  let demonVotes = 0
  todayNoms.forEach(n => {
    n.votes_for.forEach(vId => {
      if (isDemon(vId)) demonVotes++
    })
  })
  
  return { minionNoms, demonVotes }
})

function playerName(id: string) {
  const all = gameStore.players
  const idx = all.findIndex(p => p.id === id)
  if (idx === -1) return '未知'
  return `${idx + 1}. ${all[idx].name}`
}

function getPlayerColor(id: string) {
  const p = gameStore.players.find(p => p.id === id)
  if (!p || !p.role || uiStore.isRolesHidden) return 'var(--color-text-primary)'
  return ROLE_TYPE_COLOR[p.role.role_type] || 'var(--color-text-primary)'
}

function pIndex(id: string) {
  return gameStore.players.findIndex(p => p.id === id) + 1
}

const availableNominatorsForEdit = computed(() => {
  if (editingNomIndex.value === null) return []
  const currentNom = nominations.value[editingNomIndex.value]
  return gameStore.players.filter(p => 
    p.is_alive && (p.can_nominate || p.id === currentNom.nominator_id)
  )
})

const availableNomineesForEdit = computed(() => {
  if (editingNomIndex.value === null) return []
  const currentNom = nominations.value[editingNomIndex.value]
  return gameStore.players.filter(p => 
    !p.is_nominated || p.id === currentNom.nominee_id
  )
})

function startEditNomination(index: number) {
  const nom = nominations.value[index]
  editingNomIndex.value = index
  editNominatorId.value = nom.nominator_id
  editNomineeId.value = nom.nominee_id
  editError.value = ''
}

function cancelEditNomination() {
  editingNomIndex.value = null
  editError.value = ''
}

async function saveEditNomination() {
  if (editingNomIndex.value === null) return
  if (!editNominatorId.value || !editNomineeId.value) {
    editError.value = '請選擇提名人與被提名人'
    return
  }
  await gameStore.editNomination(editingNomIndex.value, editNominatorId.value, editNomineeId.value)
  if (gameStore.error) {
    editError.value = gameStore.error
  } else {
    editingNomIndex.value = null
  }
}

async function doNominate() {
  if (!nominatorId.value || !nomineeId.value) return
  await gameStore.nominate(nominatorId.value, nomineeId.value)
  nominatorId.value = ''
  nomineeId.value = ''
}

async function toggleVote(nomIndex: number, voterId: string) {
  await gameStore.vote(nomIndex, voterId)
}

async function doExecute(nomIndex: number) {
  uiStore.showConfirm(
    '處決確認',
    `確認要處決玩家 ${playerName(nominations.value[nomIndex].nominee_id)} 嗎？`,
    async () => {
      await gameStore.execute(nomIndex)
    },
    true
  )
}

async function doUndoExecute(nomIndex: number) {
  uiStore.showConfirm(
    '撤銷處決',
    `確認要撤銷玩家 ${playerName(nominations.value[nomIndex].nominee_id)} 的處決嗎？\n這將恢復該玩家的存活狀態。`,
    async () => {
      await gameStore.undoExecution(nomIndex)
    },
    false
  )
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

.voting-panel {
  width: 100%;
  max-width: 440px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px 20px 12px 12px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 16px 10px;
  border-bottom: 1px solid rgba(201,168,76,0.1);
  flex-shrink: 0;
}

.panel-icon { font-size: 18px; }

.panel-title {
  font-family: var(--font-title);
  font-size: 16px;
  color: var(--color-gold);
  flex: 1;
}

.close-btn {
  color: var(--color-text-muted);
  font-size: 16px;
  background: none;
  padding: 4px 8px;
}

.nominate-section {
  padding: 12px 16px;
  flex-shrink: 0;
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.nominate-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 12px;
}

.select-wrap { flex: 1; }

.select-label {
  display: block;
  font-size: 10px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.player-select {
  width: 100%;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(201,168,76,0.3);
  border-radius: 8px;
  color: var(--color-text-primary);
  font-size: 13px;
  padding: 8px 10px;
  outline: none;
}

.nominate-arrow {
  color: var(--color-gold-muted);
  font-size: 11px;
  padding-bottom: 12px;
  flex-shrink: 0;
}

.nominate-btn {
  width: 100%;
}

.nominations-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.evil-stats-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(224, 32, 32, 0.1);
  border: 1px solid rgba(224, 32, 32, 0.2);
  padding: 6px 12px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 12px;
}

.evil-stats-bar .stat-box {
  display: flex;
  align-items: center;
  gap: 6px;
}

.evil-stats-bar .label {
  color: #f1948a;
  font-weight: 500;
}

.evil-stats-bar .value {
  color: #fff;
  font-weight: 800;
  font-size: 14px;
}

.evil-stats-bar .stat-divider {
  color: rgba(255,255,255,0.1);
}

.nomination-card {
  background: var(--color-bg-elevated);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  transition: all var(--transition-fast);
}

.nom-expandable {
  cursor: pointer;
}

.nom-expandable:hover {
  border-color: rgba(201,168,76,0.3);
}

.nom-executed {
  opacity: 0.7;
  border-color: rgba(139,26,26,0.4);
}

.nom-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.nom-names {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.nom-verb {
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: normal;
}

.btn-edit-nom {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 0.2s;
  opacity: 0.7;
}

.btn-edit-nom:hover {
  background: rgba(255,255,255,0.1);
  opacity: 1;
}

.nom-edit-form {
  width: 100%;
  background: rgba(0,0,0,0.15);
  border-radius: 8px;
  padding: 10px;
  border: 1px dashed rgba(201,168,76,0.3);
}

.edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.player-select.mini {
  padding: 4px 6px;
  font-size: 12px;
}

.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.mini-btn {
  padding: 4px 12px;
  font-size: 11px;
  border-radius: 6px;
}

.edit-error {
  color: #ff5252;
  font-size: 11px;
  margin-top: 6px;
  text-align: right;
}

.nom-round-tag {
  font-size: 10px;
  background: var(--color-bg-surface);
  color: var(--color-gold-muted);
  border: 1px solid rgba(201,168,76,0.3);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
  white-space: nowrap;
}

.nom-score {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-bg-surface);
  padding: 4px 10px;
  border-radius: 20px;
}

.score-pass {
  color: var(--color-gold-bright);
  background: rgba(201,168,76,0.15);
}

.vote-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.vote-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-bg-surface);
  border: 1px solid rgba(255,255,255,0.06);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.vote-btn.vote-yes {
  background: rgba(201,168,76,0.2);
  border-color: var(--color-gold);
  color: var(--color-gold-bright);
}

.vote-player-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}

.vote-ghost-icon {
  font-size: 10px;
  opacity: 0.7;
}

.vote-btn.vote-ghost {
  background: rgba(100, 100, 120, 0.1);
  border-style: dashed;
}

.vote-btn.vote-spent {
  opacity: 0.3;
  cursor: not-allowed;
}

.vote-player {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vote-mark { font-size: 10px; font-weight: 700; }

.nom-actions { 
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.nom-executed-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 13px;
  color: var(--color-text-muted);
  padding: 8px 0;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.btn-undo {
  background: rgba(201,168,76,0.1);
  border: 1px solid rgba(201,168,76,0.3);
  color: var(--color-gold);
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.empty-nominations {
  padding: 30px 0;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
  font-style: italic;
}

.nom-history-badge {
  padding: 10px;
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 8px;
}

.vote-summary {
  line-height: 1.6;
}

.voter-item {
  display: inline-block;
}

.voter-sep {
  color: var(--color-text-muted);
  margin-right: 4px;
}
</style>
