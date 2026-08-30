<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="night-order-panel panel animate-slide-up">
      <div class="panel-header">
        <div class="panel-header-title-group">
          <span class="panel-icon">🌙</span>
          <h2 class="panel-title">夜晚行動順序</h2>
        </div>
        <div class="panel-header-actions">
          <button
            v-if="hasCustomOrder"
            class="reset-order-btn"
            title="恢復官方預設順序"
            @click="resetNightOrder"
          >🔄 預設</button>
          <button
            class="whiteboard-btn"
            title="開啟白板"
            @click="uiStore.openPanel('whiteboard')"
          >📋 白板</button>
          <button
            class="edit-order-btn"
            :class="{ 'editing-active': isEditing }"
            @click="isEditing = !isEditing"
          >{{ isEditing ? '✓ 完成' : '✏️ 調整順序' }}</button>
          <button class="close-btn" @click="uiStore.closePanel()">✕</button>
        </div>
      </div>

      <!-- 提示條 -->
      <div v-if="isEditing" class="edit-hint-bar">
        <span>✏️ 正在調整「{{ gameStore.script?.name || '當前劇本' }}」之順序（僅獨立影響本劇本）</span>
      </div>

      <!-- 標籤切換 (根據階段自動隱藏無關標籤) -->
      <div class="tab-bar">
        <button
          v-if="gameStore.phase === 'FirstNight' || gameStore.phase === 'Setup'"
          class="tab-btn"
          :class="{ 'tab-active': activeTab === 'first' }"
          @click="activeTab = 'first'"
        >首個夜晚</button>
        <button
          v-if="gameStore.phase !== 'FirstNight' && gameStore.phase !== 'Setup'"
          class="tab-btn"
          :class="{ 'tab-active': activeTab === 'other' }"
          @click="activeTab = 'other'"
        >其他夜晚</button>
      </div>

      <!-- 順序列表 (編輯模式顯示全劇本夜間角色列表，普通模式顯示遊戲即時列表) -->
      <div class="order-list" ref="listRef" @scroll="handleScroll">
        <div class="order-empty" v-if="(isEditing ? editOrderList : currentOrder).length === 0">
          <span>此劇本無夜晚行動角色</span>
        </div>

        <!-- 編輯模式列表 (支援滑鼠與手機觸控 Pointer Events 拖拽) -->
        <template v-if="isEditing">
          <div
            v-for="(char, i) in editOrderList"
            :key="char.id"
            :data-sort-index="i"
            class="order-item order-item-editing"
            :class="{
              'is-dragging': sortDragIndex === i,
              'is-over': sortOverIndex === i && sortDragIndex !== i
            }"
          >
            <div
              class="drag-handle"
              title="按住拖拽排序"
              @pointerdown="onPointerDown($event, i)"
            >☰</div>
            <div class="order-index">{{ i + 1 }}</div>
            <div class="order-role-icon" :class="char.role_type?.toLowerCase()">
              <img v-if="char.image" :src="char.image" :alt="char.name" />
              <span v-else class="role-text-fallback">{{ char.name.charAt(0) }}</span>
            </div>
            <div class="order-info">
              <div class="order-role-name">{{ char.name }}</div>
              <div class="order-role-type" :class="char.role_type?.toLowerCase()">
                {{ roleTypeLabel(char) }}
              </div>
            </div>
            <div class="order-controls">
              <button
                class="move-btn"
                :disabled="i === 0"
                @click.stop="moveItem(i, -1)"
                title="上移"
              >▲</button>
              <button
                class="move-btn"
                :disabled="i === editOrderList.length - 1"
                @click.stop="moveItem(i, 1)"
                title="下移"
              >▼</button>
            </div>
          </div>
        </template>

        <!-- 普通遊戲檢視模式列表 -->
        <template v-else>
          <div
            v-for="(char, i) in currentOrder"
            :key="char.uniqueKey"
            class="order-item"
            :class="{
              'order-item-active': isActiveInGame(char),
              'order-item-evil': isEvilRole(char),
              'order-item-pressable': char.player
            }"
            @mousedown="char.player && startLongPress(char.player.id)"
            @mouseup="cancelLongPress"
            @mouseleave="cancelLongPress"
            @touchstart.passive="char.player && startLongPress(char.player.id)"
            @touchend.passive="cancelLongPress"
            @touchmove.passive="cancelLongPress"
          >
            <!-- 序號 -->
            <div class="order-index">{{ i + 1 }}</div>
            <img
              v-if="char.player && !char.player.is_alive"
              src="/pic/grave.png"
              class="order-player-dead-img"
              alt="死亡"
            />
            <!-- 角色圖示 -->
            <div class="order-role-icon" :class="char.role_type?.toLowerCase()">
              <img v-if="char.image" :src="char.image" :alt="char.name" />
              <span v-else-if="!char.is_system" class="role-text-fallback">{{ char.name.charAt(0) }}</span>
              <img v-else-if="roleEmoji(char).startsWith('/') || roleEmoji(char).startsWith('http')" :src="roleEmoji(char)" :alt="char.name" />
              <span v-else class="order-role-emoji">{{ roleEmoji(char) }}</span>
            </div>

            <!-- 角色資訊 -->
            <div class="order-info">
              <div class="order-header-row">
                <div class="order-role-header">
                  <span class="order-role-name">{{ char.name }}</span>
                  <span class="order-role-type" :class="char.role_type?.toLowerCase()">
                    {{ roleTypeLabel(char) }}
                  </span>
                </div>
                <!-- 玩家名稱 (若已指派角色) -->
                <div class="order-player" v-if="char.player">
                  <span class="order-player-name">👤 {{ char.player.name }}</span>
                </div>
              </div>

              <!-- 夜晚提示語 (正式 JSON 內容) -->
              <div class="order-reminder" v-if="getNightReminder(char)">
                {{ getNightReminder(char) }}
              </div>
              <!-- 相克規則 (僅顯示劇本存在的相克角色) -->
              <div v-if="!char.is_system && getInScriptConflicts(char).length > 0" class="order-conflicts">
                <div v-for="(rule, idx) in getInScriptConflicts(char)" :key="idx" class="conflict-item">
                  <span class="conflict-badge">⚔️ vs {{ getCharacterName(rule.target || rule.charB) }}</span>
                  <span v-if="rule.desc" class="conflict-desc">: {{ rule.desc }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'
import type { RoleType } from '../types'
import { ROLE_TYPE_LABEL } from '../types'

const gameStore = useGameStore()
const uiStore = useUIStore()

const listRef = ref<HTMLElement | null>(null)
const isEditing = ref(false)

const activeTab = ref<'first' | 'other'>(
  (gameStore.phase === 'FirstNight' || gameStore.phase === 'Setup') ? 'first' : 'other'
)

const hasCustomOrder = computed(() => {
  const s = gameStore.script
  if (!s) return false
  return activeTab.value === 'first'
    ? Boolean(s.custom_first_night_order && s.custom_first_night_order.length > 0)
    : Boolean(s.custom_other_night_order && s.custom_other_night_order.length > 0)
})

const editOrderList = computed(() => {
  const isFirst = activeTab.value === 'first'
  if (!isFirst) return gameStore.otherNightOrder

  const isTeensy = gameStore.players.length === 5 || gameStore.players.length === 6
  let sys = [...SYSTEM_ACTIONS]
  if (isTeensy) {
    sys = sys.filter(act => act.id !== 'sys_minion_info').map(act => {
      if (act.id === 'sys_demon_info') {
        return { ...act, first_night_reminder: '惡魔獲得三個不在場的角色作為偽裝。' }
      }
      return act
    })
  }

  const allFirstChars = [...sys, ...gameStore.firstNightOrder]
  const customOrder = gameStore.script?.custom_first_night_order

  if (customOrder && customOrder.length > 0) {
    const orderMap = new Map(customOrder.map((id, idx) => [id, idx]))
    return allFirstChars.sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999 + (a.night_order_first ?? 999)
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999 + (b.night_order_first ?? 999)
      return idxA - idxB
    })
  }

  return allFirstChars.sort((a, b) => (a.night_order_first ?? 999) - (b.night_order_first ?? 999))
})

const sortDragIndex = ref<number | null>(null)
const sortOverIndex = ref<number | null>(null)

// 防抖儲存機制，避免大資料量時頻繁寫檔造成卡頓
let saveDebounceTimer: number | null = null

function triggerSaveDebounced() {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
  }
  saveDebounceTimer = window.setTimeout(() => {
    saveCurrentNightOrder()
    saveDebounceTimer = null
  }, 400)
}

async function saveCurrentNightOrder() {
  const isFirst = activeTab.value === 'first'
  const orderedIds = editOrderList.value.map(c => c.id)
  await gameStore.updateScriptCustomNightOrder(isFirst ? 'first' : 'other', orderedIds)
}

function applyOrderChange(fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
  const isFirst = activeTab.value === 'first'
  const list = [...editOrderList.value]
  if (fromIndex >= list.length || toIndex >= list.length) return

  const [removed] = list.splice(fromIndex, 1)
  list.splice(toIndex, 0, removed)
  const orderedIds = list.map(c => c.id)

  // 同步更新 store 中的響應式順序，0ms 反應
  if (gameStore.script) {
    if (isFirst) {
      gameStore.script.custom_first_night_order = [...orderedIds]
    } else {
      gameStore.script.custom_other_night_order = [...orderedIds]
    }
  }
}

// 點擊按鈕上下移動
function moveItem(index: number, delta: number) {
  const targetIndex = index + delta
  if (targetIndex < 0 || targetIndex >= editOrderList.value.length) return

  applyOrderChange(index, targetIndex)
  triggerSaveDebounced()
}

// --- Pointer Events 觸控與滑鼠拖拽事件 ---
function onPointerDown(e: PointerEvent, index: number) {
  if (e.button !== 0) return
  const handleEl = e.currentTarget as HTMLElement
  try {
    handleEl.setPointerCapture(e.pointerId)
  } catch (err) {
    console.warn('Pointer Capture 鎖定失敗:', err)
  }

  sortDragIndex.value = index
  sortOverIndex.value = index

  const onPointerMove = (moveEvt: PointerEvent) => {
    if (sortDragIndex.value === null) return

    const draggingEl = document.querySelector('.order-item-editing.is-dragging') as HTMLElement | null
    let prevPe = ''
    if (draggingEl) {
      prevPe = draggingEl.style.pointerEvents
      draggingEl.style.pointerEvents = 'none'
    }

    const target = document.elementFromPoint(moveEvt.clientX, moveEvt.clientY)
    if (draggingEl) {
      draggingEl.style.pointerEvents = prevPe
    }

    const itemEl = target?.closest('[data-sort-index]') as HTMLElement | null
    if (itemEl && itemEl.dataset.sortIndex !== undefined) {
      const overIdx = parseInt(itemEl.dataset.sortIndex, 10)
      const currentDrag = sortDragIndex.value
      if (!isNaN(overIdx) && overIdx !== currentDrag) {
        applyOrderChange(currentDrag, overIdx)
        sortDragIndex.value = overIdx
        sortOverIndex.value = overIdx
      }
    }
  }

  const cleanup = (upEvt: PointerEvent) => {
    try {
      handleEl.releasePointerCapture(upEvt.pointerId)
    } catch (err) {}

    handleEl.removeEventListener('pointermove', onPointerMove)
    handleEl.removeEventListener('pointerup', cleanup)
    handleEl.removeEventListener('pointercancel', cleanup)

    if (sortDragIndex.value !== null) {
      triggerSaveDebounced()
    }

    sortDragIndex.value = null
    sortOverIndex.value = null
  }

  handleEl.addEventListener('pointermove', onPointerMove)
  handleEl.addEventListener('pointerup', cleanup)
  handleEl.addEventListener('pointercancel', cleanup)
}

async function resetNightOrder() {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
    saveDebounceTimer = null
  }
  const isFirst = activeTab.value === 'first'
  if (gameStore.script) {
    if (isFirst) delete gameStore.script.custom_first_night_order
    else delete gameStore.script.custom_other_night_order
  }
  await gameStore.resetScriptCustomNightOrder(activeTab.value)
}

// 恢復捲動位置與註冊按鍵事件
onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  if (listRef.value && uiStore.nightOrderScrollPos > 0) {
    await nextTick()
    listRef.value.scrollTop = uiStore.nightOrderScrollPos
  }
})

onBeforeUnmount(() => {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
    saveCurrentNightOrder()
  }
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'Esc') {
    e.stopImmediatePropagation()
    uiStore.closePanel()
  }
}

// 紀錄捲動位置
function handleScroll(e: Event) {
  const target = e.target as HTMLElement
  uiStore.setNightOrderScroll(target.scrollTop)
}

/**
 * 系統預設流程 (首夜專用)
 */
const SYSTEM_ACTIONS: any[] = [
  {
    id: 'sys_minion_info',
    name: '爪牙信息',
    role_type: 'Minion',
    first_night_reminder: '爪牙彼此相認，並得知惡魔是誰。',
    night_order_first: 10,
    is_system: true
  },
  {
    id: 'sys_demon_info',
    name: '惡魔信息',
    role_type: 'Demon',
    first_night_reminder: '惡魔得知爪牙是誰，並獲得三個不在場的角色作為偽裝。',
    night_order_first: 11,
    is_system: true
  }
]

const currentOrder = computed(() => {
  const isFirst = activeTab.value === 'first'
  const rolePlayersMap = new Map<string, any[]>()
  gameStore.players.forEach(p => {
    if (p.role?.id) {
      if (!rolePlayersMap.has(p.role.id)) {
        rolePlayersMap.set(p.role.id, [])
      }
      rolePlayersMap.get(p.role.id)!.push(p)
    }
  })

  if (!isFirst) {
    const expandedOrder: any[] = []
    gameStore.otherNightOrder.forEach(char => {
      const playersWithThisRole = rolePlayersMap.get(char.id) || []
      playersWithThisRole.forEach((player, pIdx) => {
        expandedOrder.push({
          ...char,
          uniqueKey: `${char.id}_${player.id}_${pIdx}`,
          player: player
        })
      })
    })
    return expandedOrder
  }

  // 首夜：依照融合了系統流程與角色的正式排序列表展示
  const expandedOrder: any[] = []
  const fullOrderList = editOrderList.value

  fullOrderList.forEach((char, idx) => {
    if (char.is_system) {
      expandedOrder.push({
        ...char,
        uniqueKey: `sys_${char.id}_${idx}`,
        player: null
      })
    } else {
      const playersWithThisRole = rolePlayersMap.get(char.id) || []
      if (playersWithThisRole.length > 0) {
        playersWithThisRole.forEach((player, pIdx) => {
          expandedOrder.push({
            ...char,
            uniqueKey: `${char.id}_${player.id}_${pIdx}`,
            player: player
          })
        })
      }
    }
  })
  
  return expandedOrder
})

function isActiveInGame(char: any) {
  if (char.is_system) return true
  return char.player ? char.player.is_alive : false
}

function isEvilRole(char: any) {
  return char.role_type === 'Minion' || char.role_type === 'Demon'
}

function roleEmoji(char: any) {
  if (char.id === 'sys_minion_info') return '/pic/Minions.png'
  if (char.id === 'sys_demon_info') return '/pic/Demons.png'
  const map: Record<RoleType, string> = {
    Townsfolk: '/pic/Townsfolk.png',
    Outsider: '/pic/Outsiders.png',
    Minion: '/pic/Minions.png',
    Demon: '/pic/Demons.png',
    Traveler: '/pic/Travellers_new.png',
    Fabled: '/pic/Fabled_new.png',
    Loric: '/pic/Loric.png'
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

function getInScriptConflicts(char: any) {
  if (!char || !char.conflicts || !gameStore.script) return []
  const scriptCharIds = new Set(gameStore.script.characters.map(c => c.id))
  return char.conflicts.filter((rule: any) => {
    const targetId = rule.target || rule.charB
    return targetId && scriptCharIds.has(targetId)
  })
}

function getCharacterName(id?: string) {
  if (!id) return '未知'
  const char = gameStore.script?.characters.find(c => c.id === id)
  return char ? char.name : id
}

// 長按邏輯
let longPressTimer: number | null = null

function startLongPress(playerId: string) {
  cancelLongPress()
  longPressTimer = window.setTimeout(() => {
    uiStore.openReminderPicker(playerId)
    uiStore.closePanel()
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }, 500)
}

function cancelLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
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
  height: 85vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px 20px 12px 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid rgba(201,168,76,0.15);
  flex-wrap: nowrap;
}

.panel-header-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-shrink: 1;
}

.panel-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.panel-title {
  font-family: var(--font-title);
  font-size: 15px;
  color: var(--color-gold);
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.reset-order-btn {
  font-size: 11px;
  color: var(--color-text-muted);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 4px 7px;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 600;
  transition: all var(--transition-fast);
}

.reset-order-btn:hover {
  background: rgba(229, 115, 115, 0.15);
  color: #e57373;
  border-color: rgba(229, 115, 115, 0.3);
}

.whiteboard-btn,
.edit-order-btn {
  font-size: 11px;
  color: var(--color-gold);
  background: rgba(201, 168, 76, 0.1);
  border: 1px solid rgba(201, 168, 76, 0.3);
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.whiteboard-btn:hover {
  background: rgba(201, 168, 76, 0.25);
  border-color: var(--color-gold);
}

.edit-order-btn.editing-active {
  background: var(--color-gold);
  color: #121212;
}

.close-btn {
  color: var(--color-text-muted);
  font-size: 16px;
  background: none;
  border: none;
  padding: 4px 6px;
  cursor: pointer;
  flex-shrink: 0;
}

.edit-hint-bar {
  background: rgba(201, 168, 76, 0.1);
  color: var(--color-gold);
  font-size: 11px;
  padding: 6px 16px;
  text-align: center;
  border-bottom: 1px solid rgba(201, 168, 76, 0.2);
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
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
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

.order-item-pressable:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.06);
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
  margin-top: 2px;
}

.order-role-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--color-bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.order-role-icon img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.order-role-emoji { font-size: 18px; }

.order-info {
  flex: 1;
  min-width: 0;
}

.order-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.order-role-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.order-role-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.order-role-type {
  font-size: 11px;
}

.order-role-type.townsfolk { color: var(--color-townsfolk); }
.order-role-type.outsider  { color: var(--color-outsider); }
.order-role-type.minion    { color: var(--color-minion); }
.order-role-type.demon     { color: var(--color-demon); }

.order-player {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.order-player-name {
  font-size: 12px;
  color: var(--color-gold);
  font-weight: 600;
  background: rgba(201, 168, 76, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(201, 168, 76, 0.2);
}

.order-player-dead-img {
  width: 22px;
  height: 22px;
  object-fit: contain;
  vertical-align: middle;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

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

.role-text-fallback {
  font-size: 18px;
  font-weight: 900;
  font-family: 'ChineseFont', var(--font-title), sans-serif;
  color: currentColor;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  user-select: none;
}

.order-role-icon.townsfolk { color: var(--color-townsfolk); }
.order-role-icon.outsider  { color: var(--color-outsider); }
.order-role-icon.minion    { color: var(--color-minion); }
.order-role-icon.demon     { color: var(--color-demon); }
.order-role-icon.traveler  { color: var(--color-traveler); }

.order-conflicts {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conflict-item {
  font-size: 11px;
  background: rgba(229, 115, 115, 0.08);
  border: 1px solid rgba(229, 115, 115, 0.2);
  border-radius: 6px;
  padding: 4px 8px;
  line-height: 1.4;
}

.conflict-badge {
  color: #e57373;
  font-weight: 700;
}

.conflict-desc {
  color: var(--color-text-muted);
  font-style: italic;
}

/* 編輯模式項目樣式 */
.order-item-editing {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.02);
  user-select: none;
  transition: background 0.15s, transform 0.15s, border-color 0.15s;
}

.order-item-editing.is-dragging {
  opacity: 0.5;
  background: rgba(201, 168, 76, 0.2);
  border: 1px dashed var(--color-gold);
}

.order-item-editing.is-over {
  border-top: 2px solid var(--color-gold);
  background: rgba(201, 168, 76, 0.1);
}

.drag-handle {
  font-size: 18px;
  color: var(--color-gold-muted);
  cursor: grab;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  touch-action: none;
  flex-shrink: 0;
}

.drag-handle:active {
  cursor: grabbing;
  color: var(--color-gold);
}

.order-controls {
  display: flex;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}

.move-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--color-gold);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.move-btn:hover:not(:disabled) {
  background: rgba(201, 168, 76, 0.25);
  border-color: var(--color-gold);
}

.move-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .panel-header {
    padding: 12px 10px 10px;
    gap: 6px;
  }
  .panel-title {
    font-size: 14px;
  }
  .reset-order-btn,
  .whiteboard-btn,
  .edit-order-btn {
    font-size: 10.5px;
    padding: 3px 5px;
  }
  .order-item {
    padding: 8px 10px;
    gap: 8px;
  }
  .order-item-editing {
    padding: 6px 10px;
    gap: 8px;
  }
}
</style>
