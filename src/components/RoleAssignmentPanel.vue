<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="assignment-panel panel animate-slide-up">
      <div class="panel-header">
        <span class="panel-icon">🎲</span>
        <h2 class="panel-title">隨機分配角色</h2>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <div class="assignment-content">
        <!-- 步驟 1: 配置人數 -->
        <div v-if="step === 'config'" class="step-config">
          <div class="info-banner">
            <span class="info-icon">👥</span>
            <span>當前玩家人數: <strong>{{ totalPlayers }}</strong></span>
          </div>

          <div class="counts-editor">
            <div v-for="type in roleTypes" :key="type.key" class="count-row">
              <div class="type-info">
                <span class="type-dot" :style="{ backgroundColor: type.color }"></span>
                <span class="type-label">{{ type.label }}</span>
              </div>
              <div class="count-controls">
                <button @click="adjustCount(type.key, -1)" class="minus">-</button>
                <div class="count-val">{{ counts[type.key] }}</div>
                <button @click="adjustCount(type.key, 1)" class="plus">+</button>
              </div>
            </div>
          </div>

          <div class="config-footer">
            <div class="total-status" :class="{ 'is-match': totalConfigured === totalPlayers }">
              總計配置: {{ totalConfigured }} / {{ totalPlayers }}
            </div>
            <button 
              class="btn-primary start-btn" 
              :disabled="totalConfigured !== totalPlayers"
              @click="generatePlan"
            >
              生成角色清單
            </button>
          </div>
        </div>

        <!-- 步驟 2: 查看結果並確認 -->
        <div v-else class="step-preview">
          <div class="preview-header">
            <button class="btn-ghost btn-sm" @click="step = 'config'">← 返回修改</button>
            <h3 class="preview-title">預覽分配結果</h3>
          </div>

          <div class="preview-list">
            <div v-for="item in previewAssignments" :key="item.player_id" class="preview-item">
              <span class="p-name">{{ playerName(item.player_id) }}</span>
              <span class="p-divider">→</span>
              <span v-if="item.role" class="p-role" :class="item.role.role_type.toLowerCase()">
                {{ item.role.name }}
              </span>
              <span v-else class="p-role none">未分配</span>
            </div>

            <div class="divider"><span>惡魔虛張</span></div>
            <div class="bluff-list">
              <div v-for="(b, i) in previewBluffs" :key="i" class="bluff-item">
                <span v-if="b" class="b-role">{{ b.name }}</span>
                <span v-else class="b-role none">無虛張</span>
              </div>
            </div>
          </div>

          <div class="preview-actions">
            <button class="btn-ghost" @click="generatePlan">🎲 重新生成</button>
            <button class="btn-primary" @click="confirmAssignment">✅ 確認並正式指派</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { useScriptStore } from '../stores/scriptStore'
import type { CharacterDef, RoleType } from '../types'
import { ROLE_TYPE_LABEL, ROLE_TYPE_COLOR } from '../types'

const uiStore = useUIStore()
const gameStore = useGameStore()
const scriptStore = useScriptStore()

const step = ref<'config' | 'preview'>('config')
const totalPlayers = computed(() => gameStore.players.length)

const counts = reactive<Record<string, number>>({
  Townsfolk: 0,
  Outsider: 0,
  Minion: 0,
  Demon: 0
})

const roleTypes = [
  { key: 'Townsfolk', label: '村民', color: ROLE_TYPE_COLOR.Townsfolk },
  { key: 'Outsider', label: '外來者', color: ROLE_TYPE_COLOR.Outsider },
  { key: 'Minion', label: '爪牙', color: ROLE_TYPE_COLOR.Minion },
  { key: 'Demon', label: '惡魔', color: ROLE_TYPE_COLOR.Demon },
]

onMounted(() => {
  // 根據基礎規則預設人數 (5-15人)
  const p = totalPlayers.value
  if (p === 5) { counts.Townsfolk = 3; counts.Outsider = 0; counts.Minion = 1; counts.Demon = 1; }
  else if (p === 6) { counts.Townsfolk = 3; counts.Outsider = 1; counts.Minion = 1; counts.Demon = 1; }
  else if (p === 7) { counts.Townsfolk = 5; counts.Outsider = 0; counts.Minion = 1; counts.Demon = 1; }
  else if (p === 8) { counts.Townsfolk = 5; counts.Outsider = 1; counts.Minion = 1; counts.Demon = 1; }
  else if (p === 9) { counts.Townsfolk = 5; counts.Outsider = 2; counts.Minion = 1; counts.Demon = 1; }
  else if (p === 10) { counts.Townsfolk = 7; counts.Outsider = 0; counts.Minion = 2; counts.Demon = 1; }
  else if (p === 11) { counts.Townsfolk = 7; counts.Outsider = 1; counts.Minion = 2; counts.Demon = 1; }
  else if (p === 12) { counts.Townsfolk = 7; counts.Outsider = 2; counts.Minion = 2; counts.Demon = 1; }
  else {
    counts.Townsfolk = Math.max(0, p - 3)
    counts.Demon = 1
    counts.Minion = 1
    counts.Outsider = 1
  }
})

const totalConfigured = computed(() => Object.values(counts).reduce((a, b) => a + b, 0))

function adjustCount(key: string, delta: number) {
  counts[key] = Math.max(0, counts[key] + delta)
}

const previewAssignments = ref<{ player_id: string, role: CharacterDef | null }[]>([])
const previewBluffs = ref<(CharacterDef | null)[]>([null, null, null])

function generatePlan() {
  if (!gameStore.script) return
  const script = gameStore.script
  
  const pool: CharacterDef[] = []
  
  // 按照配置從劇本中選取角色
  for (const [type, count] of Object.entries(counts)) {
    const available = script.characters.filter(c => c.role_type === type && !c.setup)
    if (available.length < count) {
      alert(`劇本中的 ${ROLE_TYPE_LABEL[type as RoleType]} 數量不足（需要 ${count} 個，只有 ${available.length} 個）`)
      return
    }
    const shuffled = [...available].sort(() => Math.random() - 0.5)
    pool.push(...shuffled.slice(0, count))
  }
  
  // 隨機打亂角色池
  const finalPool = [...pool].sort(() => Math.random() - 0.5)
  
  // 指派給玩家
  previewAssignments.value = gameStore.players.map((p, i) => ({
    player_id: p.id,
    role: finalPool[i] || null
  }))
  
  // 生成虛張角色 (從未被選中的村民中選)
  const usedIds = new Set(pool.map(c => c.id))
  const availableBluffs = script.characters.filter(c => c.role_type === 'Townsfolk' && !usedIds.has(c.id))
  const shuffledBluffs = [...availableBluffs].sort(() => Math.random() - 0.5)
  previewBluffs.value = [
    shuffledBluffs[0] || null,
    shuffledBluffs[1] || null,
    shuffledBluffs[2] || null
  ]
  
  step.value = 'preview'
}

function playerName(id: string) {
  return gameStore.players.find(p => p.id === id)?.name || id
}

async function confirmAssignment() {
  await gameStore.bulkAssignRoles(previewAssignments.value, previewBluffs.value)
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

.assignment-panel {
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
  padding: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.panel-title {
  flex: 1;
  font-family: var(--font-title);
  font-size: 16px;
  color: var(--color-gold);
}

.close-btn { background: none; border: none; font-size: 18px; color: var(--color-text-muted); }

.assignment-content { flex: 1; overflow-y: auto; padding: 20px; }

.info-banner {
  background: rgba(201, 168, 76, 0.1);
  border-radius: 10px;
  padding: 10px 16px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.counts-editor { display: flex; flex-direction: column; gap: 16px; margin-bottom: 30px; }

.count-row { display: flex; align-items: center; justify-content: space-between; }

.type-info { display: flex; align-items: center; gap: 10px; }
.type-dot { width: 8px; height: 8px; border-radius: 50%; }
.type-label { font-size: 14px; font-weight: 600; }

.count-controls { display: flex; align-items: center; background: rgba(0,0,0,0.2); border-radius: 20px; padding: 2px; }
.count-controls button { width: 32px; height: 32px; border-radius: 50%; border: none; background: none; color: white; font-size: 18px; cursor: pointer; }
.count-controls button:active { background: rgba(255,255,255,0.1); }
.count-val { width: 40px; text-align: center; font-weight: 700; font-size: 16px; }

.config-footer { text-align: center; }
.total-status { font-size: 12px; color: var(--color-text-muted); margin-bottom: 12px; }
.total-status.is-match { color: var(--color-gold); font-weight: bold; }

.start-btn { width: 100%; padding: 14px; }

.preview-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.preview-title { font-family: var(--font-title); font-size: 14px; color: var(--color-gold-muted); }

.preview-list { background: rgba(0,0,0,0.15); border-radius: 12px; padding: 12px; margin-bottom: 20px; }
.preview-item { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 8px; }
.p-name { font-weight: 600; width: 80px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
.p-divider { color: var(--color-text-muted); }
.p-role { font-weight: 700; }
.p-role.townsfolk { color: var(--color-townsfolk); }
.p-role.outsider  { color: var(--color-outsider); }
.p-role.minion    { color: var(--color-minion); }
.p-role.demon     { color: var(--color-demon); }

.bluff-list { display: flex; justify-content: space-around; gap: 8px; }
.bluff-item { font-size: 12px; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 4px; color: var(--color-townsfolk); border: 1px solid rgba(74, 155, 212, 0.2); }

.divider { display: flex; align-items: center; margin: 16px 0; font-size: 11px; color: var(--color-text-muted); }
.divider::before, .divider::after { content: ''; flex: 1; border-top: 1px solid rgba(255,255,255,0.08); }
.divider span { padding: 0 10px; }

.preview-actions { display: flex; gap: 10px; }
.preview-actions button { flex: 1; }
</style>
