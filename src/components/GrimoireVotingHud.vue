<template>
  <!-- 當白天階段且 HUD 可見時顯示 -->
  <aside 
    v-if="gameStore.phase === 'Day' && uiStore.isVotingHudVisible"
    class="grimoire-voting-hud"
    :class="{ 'is-collapsed': uiStore.isVotingHudCollapsed }"
    aria-label="魔典投票控制面板"
  >
    <!-- 收合狀態小掛件 -->
    <div v-if="uiStore.isVotingHudCollapsed" class="hud-collapsed-pill" @click="uiStore.toggleVotingHud()">
      <span class="pill-badge">第 {{ currentRound }} 天</span>
      <span class="pill-title">{{ hudTitle }}</span>
      <span class="pill-expand-icon">‹</span>
    </div>

    <!-- 展開狀態面板 -->
    <div v-else class="hud-card">
      <!-- 頂部資訊列：天數、計時器、收合鈕 -->
      <div class="hud-header">
        <div class="hud-day-title">第 {{ currentRound }} 天</div>
        
        <div class="hud-timer-wrap" @click="toggleTimer">
          <span 
            class="hud-timer-badge" 
            :class="{ 
              'timer-ended': uiStore.timerRemaining === 0 && !uiStore.isTimerRunning,
              'timer-running': uiStore.isTimerRunning 
            }"
          >
            {{ timerText }}
          </span>
          <button class="hud-timer-quick-btn" @click.stop="quickAddTimer" title="加60秒">+1分</button>
        </div>

        <button class="hud-collapse-btn" @click="uiStore.toggleVotingHud()" title="收合面板">
          <span class="collapse-icon">»</span>
        </button>
      </div>

      <!-- 模式一：魔典直接投票進行中 (圖一) -->
      <div v-if="uiStore.isDirectVotingActive && activeNomination" class="hud-voting-mode">
        <!-- 核心對局狀態 -->
        <div class="hud-matchup-row">
          <span class="hud-nominator" :style="{ color: getPlayerColor(activeNomination.nominator_id) }">
            {{ formatPlayerSeat(activeNomination.nominator_id) }}
          </span>
          <span class="hud-action-text">提名</span>
          <span class="hud-nominee" :style="{ color: getPlayerColor(activeNomination.nominee_id) }">
            {{ formatPlayerSeat(activeNomination.nominee_id) }}
          </span>
          <span class="hud-vote-score" :class="{ 'score-reached': currentVoteCount >= activeThreshold }">
            {{ currentVoteCount }} / {{ activeThreshold }} 票
          </span>
        </div>

        <!-- 額外票數微調 -->
        <div class="hud-extra-votes-row">
          <span class="extra-label">額外票數:</span>
          <button class="btn-extra" @click="changeExtraVotes(-1)">-</button>
          <span class="extra-val" :class="{ 'is-pos': extraVotes > 0, 'is-neg': extraVotes < 0 }">
            {{ extraVotes > 0 ? '+' : '' }}{{ extraVotes }}
          </span>
          <button class="btn-extra" @click="changeExtraVotes(1)">+</button>
        </div>

        <!-- 提示說明 -->
        <div class="hud-hint-text">
          點廣場上的玩家卡片切換舉手，死者投票會自動扣掉幽靈票
        </div>

        <!-- 底部按鈕區 -->
        <div class="hud-actions-row">
          <button class="btn-hud-primary" @click="confirmRecordVotes">
            記錄票數
          </button>
          <button class="btn-hud-cancel" @click="cancelDirectVoting">
            撤銷
          </button>
        </div>
      </div>

      <!-- 模式三：點廣場令片選擇提名 (如截圖引導) -->
      <div v-else-if="uiStore.nominationPickingStep !== 'none'" class="hud-picking-mode">
        <div class="hud-picking-hint">
          <template v-if="uiStore.nominationPickingStep === 'nominator'">
            點廣場上的玩家，選擇由誰發起提名
          </template>
          <template v-else>
            已選提名者: <span class="highlight-nominator">{{ formatPlayerSeat(uiStore.pickingNominatorId || '') }}</span><br />
            點廣場上的玩家，選擇提名誰
          </template>
        </div>
        <div class="hud-picking-actions">
          <button class="btn-hud-cancel full-width" @click="uiStore.cancelPickingNomination()">
            取消
          </button>
        </div>
      </div>

      <!-- 模式二：提名列表與處決結算 (圖二) -->
      <div v-else class="hud-list-mode">
        <!-- 待處決狀態提示 -->
        <div class="hud-execution-status">
          <span class="exec-label">待處決:</span>
          <span v-if="executionCandidate" class="exec-player-name">
            {{ formatPlayerSeat(executionCandidate.nom.nominee_id) }} ({{ executionCandidate.votes }} 票)
          </span>
          <span v-else class="exec-none">
            {{ tieCandidate ? '平票 (暫不處決)' : '無人達處決門檻' }}
          </span>
        </div>

        <!-- 歷史提名記錄列表 -->
        <div class="hud-nom-list-scroll">
          <div v-if="dayNominations.length === 0" class="hud-empty-noms">
            今日尚無提名記錄
          </div>
          <div 
            v-for="item in dayNominations" 
            :key="item.index" 
            class="hud-nom-item"
            :class="{ 
              'is-lead': executionCandidate && executionCandidate.index === item.index,
              'is-executed': item.nom.executed
            }"
            @click="resumeOrViewNomination(item.index)"
          >
            <div class="nom-item-info">
              <span class="nom-item-seat" :style="{ color: getPlayerColor(item.nom.nominator_id) }">
                {{ formatPlayerSeat(item.nom.nominator_id) }}
              </span>
              <span class="nom-arrow">→</span>
              <span class="nom-item-seat" :style="{ color: getPlayerColor(item.nom.nominee_id) }">
                {{ formatPlayerSeat(item.nom.nominee_id) }}
              </span>
            </div>
            
            <div class="nom-item-score-wrap">
              <span class="nom-item-score">
                {{ calcNomVotes(item.nom) }}/{{ item.nom.threshold || gameStore.threshold }}
              </span>
              <span v-if="executionCandidate && executionCandidate.index === item.index" class="skull-badge" title="最高票待處決">
                💀
              </span>
              <span v-else-if="item.nom.executed" class="executed-badge" title="已處決">
                ⚰️
              </span>
            </div>
          </div>
        </div>

        <!-- 底部大按鈕：[提名] 與 [處決] -->
        <div class="hud-list-actions">
          <button class="btn-hud-nominate" @click="uiStore.startPickingNomination()">
            提名
          </button>
          <button 
            class="btn-hud-execute" 
            :disabled="!executionCandidate" 
            @click="executeCandidate"
          >
            處決
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'
import { ROLE_TYPE_COLOR } from '../types'

const gameStore = useGameStore()
const uiStore = useUIStore()

// 當前天數
const currentRound = computed(() => gameStore.round || 1)

// 收合時標題
const hudTitle = computed(() => {
  if (uiStore.isDirectVotingActive && activeNomination.value) {
    return `${formatPlayerSeat(activeNomination.value.nominee_id)} 投票中`
  }
  if (executionCandidate.value) {
    return `待處決: ${formatPlayerSeat(executionCandidate.value.nom.nominee_id)}`
  }
  return '投票管理'
})

// 計時文字
const timerText = computed(() => {
  if (uiStore.timerRemaining === 0 && !uiStore.isTimerRunning) {
    return '時間到'
  }
  const m = Math.floor(uiStore.timerRemaining / 60)
  const s = uiStore.timerRemaining % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

function toggleTimer() {
  if (uiStore.isTimerRunning) {
    uiStore.pauseTimer()
  } else {
    if (uiStore.timerRemaining === 0) {
      uiStore.addTimerSeconds(60)
    }
    uiStore.startTimer()
  }
}

function quickAddTimer() {
  uiStore.addTimerSeconds(60)
}

// 當前進行中的提名
const activeNomination = computed(() => {
  if (uiStore.directVotingNomIndex === null) return null
  return gameStore.nominations[uiStore.directVotingNomIndex] || null
})

const activeThreshold = computed(() => {
  if (!activeNomination.value) return gameStore.threshold
  return activeNomination.value.threshold || gameStore.threshold
})

const extraVotes = computed(() => {
  return activeNomination.value?.extra_votes || 0
})

const currentVoteCount = computed(() => {
  if (!activeNomination.value) return 0
  const base = activeNomination.value.votes_for.length
  return Math.max(0, base + extraVotes.value)
})

function changeExtraVotes(diff: number) {
  if (uiStore.directVotingNomIndex === null) return
  const current = extraVotes.value
  gameStore.adjustExtraVotes(uiStore.directVotingNomIndex, current + diff)
}

// 記錄票數
function confirmRecordVotes() {
  uiStore.endDirectVoting()
}

// 撤銷直接投票
function cancelDirectVoting() {
  if (uiStore.directVotingNomIndex !== null) {
    const idx = uiStore.directVotingNomIndex
    uiStore.showConfirm(
      '取消投票',
      '確定要撤銷此輪提名與投票記錄嗎？已消耗的幽靈票將會歸還。',
      async () => {
        await gameStore.removeNomination(idx)
        uiStore.endDirectVoting()
      },
      true
    )
  } else {
    uiStore.endDirectVoting()
  }
}

// 今日所有提名
const dayNominations = computed(() => {
  return gameStore.nominations
    .map((nom, index) => ({ nom, index }))
    .filter(item => item.nom.round === currentRound.value)
})

function calcNomVotes(nom: any): number {
  return Math.max(0, (nom.votes_for?.length || 0) + (nom.extra_votes || 0))
}

// 計算待處決人選 (必須達到門檻，且為嚴格最高票)
const maxVoteCalculation = computed(() => {
  const currentNoms = dayNominations.value.filter(n => !n.nom.executed)
  if (currentNoms.length === 0) return { candidate: null, isTie: false }

  let maxVotes = 0
  let candidates: typeof currentNoms = []

  for (const item of currentNoms) {
    const votes = calcNomVotes(item.nom)
    const threshold = item.nom.threshold || gameStore.threshold
    if (votes >= threshold) {
      if (votes > maxVotes) {
        maxVotes = votes
        candidates = [item]
      } else if (votes === maxVotes) {
        candidates.push(item)
      }
    }
  }

  if (candidates.length === 1) {
    return { candidate: { ...candidates[0], votes: maxVotes }, isTie: false }
  } else if (candidates.length > 1) {
    return { candidate: null, isTie: true }
  }
  return { candidate: null, isTie: false }
})

const executionCandidate = computed(() => maxVoteCalculation.value.candidate)
const tieCandidate = computed(() => maxVoteCalculation.value.isTie)

// 執行處決
async function executeCandidate() {
  if (!executionCandidate.value) return
  const nomItem = executionCandidate.value
  const nomineeName = formatPlayerSeat(nomItem.nom.nominee_id)
  
  uiStore.showConfirm(
    '處決確認',
    `確認要處決 ${nomineeName} 嗎？此操作將使該玩家死亡。`,
    async () => {
      await gameStore.execute(nomItem.index)
    },
    true
  )
}

// 點擊清單項目恢復直接投票
function resumeOrViewNomination(nomIndex: number) {
  const nom = gameStore.nominations[nomIndex]
  if (!nom || nom.executed) return
  const nomineeIdx = gameStore.players.findIndex(p => p.id === nom.nominee_id)
  const initialVoter = nomineeIdx !== -1 ? (nomineeIdx + 1) % gameStore.players.length : 0
  uiStore.startDirectVoting(nomIndex, nom.nominee_id, nom.nominator_id, initialVoter)
}

// 輔助格式化
function getPlayerIndex(playerId: string) {
  return gameStore.players.findIndex(p => p.id === playerId)
}

function formatPlayerSeat(playerId: string): string {
  const idx = getPlayerIndex(playerId)
  if (idx === -1) return '未知'
  return `${idx + 1}號`
}

function getPlayerColor(playerId: string): string {
  if (uiStore.isRolesHidden) return '#c9a84c'
  const p = gameStore.players.find(pl => pl.id === playerId)
  if (!p || !p.role) return '#c9a84c'
  return ROLE_TYPE_COLOR[p.role.role_type] || '#c9a84c'
}
</script>

<style scoped>
.grimoire-voting-hud {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 120;
  width: 260px;
  pointer-events: auto;
  user-select: none;
}

.grimoire-voting-hud.is-collapsed {
  width: auto;
}

/* 收合膠囊 */
.hud-collapsed-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(18, 18, 22, 0.88);
  border: 1px solid rgba(201, 168, 76, 0.45);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  padding: 8px 14px;
  border-radius: 20px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
}

.hud-collapsed-pill:hover {
  border-color: rgba(201, 168, 76, 0.8);
  transform: translateY(-2px);
}

.pill-badge {
  font-size: 11px;
  color: #c9a84c;
  font-weight: 700;
}

.pill-title {
  font-size: 12px;
  color: #eee;
}

.pill-expand-icon {
  font-size: 13px;
  color: #c9a84c;
}

/* 展開卡片 */
.hud-card {
  background: rgba(14, 15, 18, 0.92);
  border: 1px solid rgba(201, 168, 76, 0.35);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
  padding: 12px;
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #e6e6e6;
  font-size: 13px;
}

/* 頂部列 */
.hud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 6px;
}

.hud-day-title {
  font-weight: bold;
  color: #c9a84c;
  font-size: 14px;
}

.hud-timer-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.hud-timer-badge {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(201, 168, 76, 0.3);
  padding: 2px 7px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  color: #fff;
}

.hud-timer-badge.timer-running {
  border-color: #2ecc71;
  color: #2ecc71;
}

.hud-timer-badge.timer-ended {
  background: rgba(192, 57, 43, 0.4);
  border-color: #e74c3c;
  color: #ff7675;
}

.hud-timer-quick-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #aaa;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 4px;
  cursor: pointer;
}

.hud-timer-quick-btn:hover {
  color: #fff;
  border-color: rgba(201, 168, 76, 0.6);
}

.hud-collapse-btn {
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
}

.hud-collapse-btn:hover {
  color: #c9a84c;
}

/* 模式一：投票進行中 */
.hud-voting-mode {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hud-matchup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: bold;
}

.hud-nominator {
  color: #c9a84c;
}

.hud-action-text {
  font-size: 12px;
  color: #888;
  font-weight: normal;
  margin: 0 4px;
}

.hud-nominee {
  color: #e74c3c;
}

.hud-vote-score {
  margin-left: auto;
  font-family: monospace;
  color: #bbb;
}

.hud-vote-score.score-reached {
  color: #2ecc71;
}

.hud-extra-votes-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  font-size: 12px;
  color: #aaa;
}

.btn-extra {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-extra:hover {
  border-color: #c9a84c;
}

.extra-val {
  min-width: 24px;
  text-align: center;
  font-weight: bold;
}

.extra-val.is-pos { color: #2ecc71; }
.extra-val.is-neg { color: #e74c3c; }

.hud-hint-text {
  font-size: 11px;
  color: #777;
  line-height: 1.35;
}

.hud-actions-row {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.btn-hud-secondary {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ddd;
  padding: 6px 0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.btn-hud-secondary:hover {
  background: rgba(255, 255, 255, 0.16);
  border-color: #c9a84c;
}

.btn-hud-primary {
  flex: 1.2;
  background: #c0392b;
  border: none;
  color: #fff;
  font-weight: bold;
  padding: 6px 0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(192, 57, 43, 0.4);
}

.btn-hud-primary:hover {
  background: #d63031;
}

.btn-hud-cancel {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #999;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.btn-hud-cancel:hover {
  color: #fff;
  border-color: #888;
}

/* 模式二：列表與處決 */
.hud-list-mode {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hud-execution-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
}

.exec-label {
  color: #aaa;
}

.exec-player-name {
  color: #e74c3c;
  font-weight: bold;
}

.exec-none {
  color: #777;
}

.hud-nom-list-scroll {
  max-height: 120px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 2px;
}

.hud-empty-noms {
  text-align: center;
  color: #666;
  font-size: 11px;
  padding: 8px 0;
}

.hud-nom-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.hud-nom-item:hover {
  background: rgba(255, 255, 255, 0.09);
}

.hud-nom-item.is-lead {
  background: rgba(192, 57, 43, 0.25);
  border: 1px solid rgba(192, 57, 43, 0.5);
}

.hud-nom-item.is-executed {
  opacity: 0.6;
}

.nom-item-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.nom-arrow {
  color: #666;
  font-size: 11px;
}

.nom-item-score-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: monospace;
  font-size: 12px;
  color: #aaa;
}

.skull-badge {
  font-size: 12px;
}

.executed-badge {
  font-size: 12px;
}

/* 提名發起表單 */
.hud-create-form {
  background: rgba(0, 0, 0, 0.4);
  padding: 8px;
  border-radius: 6px;
  border: 1px solid rgba(201, 168, 76, 0.2);
}

.form-title {
  font-size: 11px;
  color: #c9a84c;
  margin-bottom: 6px;
}

.form-selects {
  display: flex;
  align-items: center;
  gap: 4px;
}

.hud-select {
  flex: 1;
  background: #1e1e24;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #eee;
  padding: 4px;
  border-radius: 4px;
  font-size: 11px;
}

.select-sep {
  color: #888;
}

.form-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.btn-hud-form-ok {
  flex: 1;
  background: #27ae60;
  border: none;
  color: #fff;
  padding: 4px 0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}

.btn-hud-form-ok:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-hud-form-cancel {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #999;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}

/* 列表大按鈕 */
.hud-list-actions {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.btn-hud-nominate {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #eee;
  font-weight: bold;
  padding: 7px 0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}

.btn-hud-nominate:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: #c9a84c;
}

.btn-hud-execute {
  flex: 1.2;
  background: #c0392b;
  border: none;
  color: #fff;
  font-weight: bold;
  padding: 7px 0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(192, 57, 43, 0.4);
}

.btn-hud-execute:hover:not(:disabled) {
  background: #d63031;
}

.btn-hud-execute:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

/* 點廣場令片選擇提名模式 (如截圖) */
.hud-picking-mode {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
}

.hud-picking-hint {
  font-size: 13px;
  color: #f1f2f6;
  line-height: 1.5;
  text-align: center;
  font-weight: 500;
  padding: 6px 4px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 6px;
  border: 1px dashed rgba(201, 168, 76, 0.4);
}

.highlight-nominator {
  color: #c9a84c;
  font-weight: 700;
}

.hud-picking-actions {
  display: flex;
}

.full-width {
  width: 100%;
  text-align: center;
  padding: 8px 0;
}
</style>

