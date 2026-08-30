<template>
  <div class="overlay" @click.self="uiStore.closeReminderPicker()">
    <div class="reminder-panel animate-slide-up">
      <div class="panel-header">
        <img src="/pic/reminder1.png" class="panel-header-icon" />
        <h2 class="panel-title">{{ player?.name }} 的提示標記</h2>
        <button class="close-btn" @click="uiStore.closeReminderPicker()">✕</button>
      </div>

      <div class="reminder-content" ref="contentRef">
        <!-- 1. 現有標記 -->
        <div v-if="existingReminders.length > 0" class="section">
          <div class="section-title">現有標記 (點擊修改)</div>
          <div class="badges-container">
            <button
              v-for="r in existingReminders"
              :key="r.id"
              class="reminder-badge existing"
              :class="{ 'is-editing': editingId === r.id, 'is-old': r.round < gameStore.round }"
              @click="startEdit(r)"
            >
              {{ (r.source_role && r.source_role !== '劇本' && r.source_role !== '自定義') ? `${r.source_role}: ${r.text}` : r.text }}
              <span v-if="r.round < gameStore.round" class="old-tag">過往</span>
            </button>
          </div>
        </div>

        <div v-if="existingReminders.length > 0" class="divider" />

        <!-- 2. 輸入自定義 -->
        <div class="section">
          <div class="section-title">{{ editingId ? '修改標記' : '新增自定義標記' }}</div>
          <div class="custom-input-row">
            <input
              v-model="customText"
              class="custom-input"
              :placeholder="editingId ? '修改標記內容...' : '輸入標記內容...'"
              @keyup.enter="handleAction"
              autocomplete="off"
              ref="inputRef"
            />
            <button 
              class="action-btn" 
              :disabled="!customText.trim()" 
              @click="handleAction"
              :class="{ 'update-mode': !!editingId }"
            >
              {{ editingId ? '更新' : '新增' }}
            </button>
            <button 
              v-if="editingId" 
              class="delete-btn" 
              @click="handleDelete"
              title="刪除此標記"
            >
              <img src="/pic/trash.png" class="delete-btn-img" />
            </button>
            <button 
              v-if="editingId" 
              class="cancel-btn" 
              @click="cancelEdit"
            >
              取消
            </button>
          </div>
        </div>

        <div class="divider" />

        <!-- 3. 提示標記分類 -->
        <div class="reminder-groups">
          <!-- A. 常用與通用 -->
          <div class="section">
            <div class="section-title">通用標記</div>
            <div class="badges-container">
              <button
                v-for="rem in commonReminders"
                :key="rem"
                class="reminder-badge common-badge"
                @click="quickAdd(rem)"
              >
                {{ rem }}
              </button>
            </div>
          </div>

          <!-- 身份標記已整合至下方場上角色專屬標記中 -->

          <!-- C. 場上角色標記 -->
          <div v-if="inPlayGroups.length > 0" class="section">
            <div class="section-title">場上角色專屬標記 ({{ inPlayGroups.length }})</div>
            <div class="role-group-container">
              <div v-for="group in inPlayGroups" :key="group.roleName" class="role-subgroup">
                <div class="role-tiny-label">{{ group.roleName }}</div>
                <div class="badges-container">
                  <button
                    v-for="rem in group.reminders"
                    :key="rem"
                    class="reminder-badge in-play-badge"
                    @click="quickAdd(rem, group.roleName)"
                  >
                    {{ rem }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="section no-reminders">
            <div class="section-title">提示標記</div>
            <p class="empty-hint">當前場上角色暫無專屬提示。您可以使用上方輸入框新增自定義標記。</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { useScriptStore } from '../stores/scriptStore'
import type { ReminderToken } from '../types'

const uiStore = useUIStore()
const gameStore = useGameStore()
const scriptStore = useScriptStore()

const editingId = ref<string | null>(null)
const customText = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'Esc') {
    e.stopImmediatePropagation()
    uiStore.closeReminderPicker()
  }
}

const player = computed(() => {
  const id = uiStore.reminderPickerPlayerId
  return gameStore.players.find(p => p.id === id) || null
})
const existingReminders = computed(() => player.value?.reminders ?? [])

const commonReminders = ['善良','邪惡']
/**
 * 分類場上角色標記
 */
const inPlayGroups = computed(() => {
  const groups: { roleName: string; reminders: string[] }[] = []
  
  // 取得目前所有曾經上場的角色 ID，加上如果有人身上有該角色留下的標記也算
  const currentSources = new Set(gameStore.players.flatMap(p => p.reminders.map(r => r.source_role)))
  
  const roleIdsInPlay = new Set([
    ...gameStore.historicalRoleIds,
    ...gameStore.players.map(p => p.role?.id).filter(Boolean),
    ...gameStore.activeFabled
  ])

  // 合併當前劇本角色與全域大全角色，保證完整提取 reminders 與 remindersGlobal 資訊
  const allAvailableChars = new Map<string, any>()
  if (scriptStore.masterScript?.characters) {
    scriptStore.masterScript.characters.forEach(c => allAvailableChars.set(c.id, c))
  }
  if (gameStore.script?.characters) {
    gameStore.script.characters.forEach(c => {
      if (allAvailableChars.has(c.id)) {
        const existing = allAvailableChars.get(c.id)
        allAvailableChars.set(c.id, {
          ...existing,
          reminders: Array.from(new Set([...(existing.reminders || []), ...(c.reminders || [])])),
          remindersGlobal: Array.from(new Set([...(existing.remindersGlobal || []), ...(c.remindersGlobal || [])]))
        })
      } else {
        allAvailableChars.set(c.id, c)
      }
    })
  }

  for (const char of allAvailableChars.values()) {
    // 只要該角色在場上、曾經在場上、或者其標記目前還留在場上，即顯示其提示標記群組
    if (roleIdsInPlay.has(char.id) || currentSources.has(char.name)) {
      const allReminders = Array.from(new Set([
        ...(char.reminders || []),
        ...(char.remindersGlobal || [])
      ]))

      if (allReminders.length > 0) {
        groups.push({
          roleName: char.name,
          reminders: allReminders
        })
      }
    }
  }
  return groups
})

// 全域身份標記已合併入 inPlayGroups 中

function startEdit(rem: ReminderToken) {
  editingId.value = rem.id
  customText.value = rem.text
  nextTick(() => inputRef.value?.focus())
}

function cancelEdit() {
  editingId.value = null
  customText.value = ''
}

async function handleAction() {
  if (!player.value || !customText.value.trim()) return
  
  if (editingId.value) {
    await gameStore.updateReminder(player.value.id, editingId.value, customText.value.trim())
  } else {
    await gameStore.addReminder(player.value.id, customText.value.trim(), '自定義')
  }
  
  cancelEdit()
}

async function handleDelete() {
  if (!player.value || !editingId.value) return
  await gameStore.removeReminder(player.value.id, editingId.value)
  cancelEdit()
  // ---- 直接刪除，不跳出確認,保留原本的跳出確認的程式碼 ------------------------------------
  // if (confirm('確認要刪除這個提示標記嗎？')) {
  //   await gameStore.removeReminder(player.value.id, editingId.value)
  //   cancelEdit()
  // }
  // ------------------------------------------------------------------------------------------
}

async function quickAdd(text: string, source: string = '劇本') {
  if (!player.value) return
  await gameStore.addReminder(player.value.id, text, source)
  
  nextTick(() => {
    if (contentRef.value) {
      contentRef.value.scrollTo({ top: 0, behavior: 'smooth' })
    }
  })
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 2000; /* 提高層級，確保在所有 UI 之上 */
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.reminder-panel {
  width: 100%;
  /* 移除 max-width 以達到滿版效果 */
  background: #1a1b23;
  border-top: 2px solid rgba(201, 168, 76, 0.4); /* 頂部金邊 */
  border-radius: 20px 20px 0 0; /* 僅保留頂部圓角 */
  overflow: hidden;
  box-shadow: var(--shadow-panel);
  display: flex;
  flex-direction: column;
  height: 85vh;
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px); /* 留空間給傳統的系統工具列，+12px 為可調整的紅線間距 */
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid rgba(201, 168, 76, 0.1);
  flex-shrink: 0;
}

.panel-header-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}
.panel-title {
  font-family: var(--font-title);
  font-size: 16px;
  color: var(--color-gold);
  flex: 1;
}

.close-btn {
  color: var(--color-text-muted);
  font-size: 18px;
  background: none;
  border: none;
  padding: 4px;
}

.reminder-content {
  padding: 16px;
  overflow-y: auto;
  flex-grow: 1;
}

.section { margin-bottom: 16px; }

.section-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 1.5px;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.badges-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reminder-badge {
  background: rgba(13, 27, 42, 0.8);
  border: 1px solid rgba(201, 168, 76, 0.3);
  color: var(--color-text-primary);
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 13px;
  transition: all var(--transition-fast);
  cursor: pointer;
}

.reminder-badge:hover {
  border-color: var(--color-gold);
  background: rgba(201, 168, 76, 0.1);
}

.reminder-badge.existing {
  background: rgba(201, 168, 76, 0.15);
  border-color: var(--color-gold-muted);
}

.reminder-badge.is-editing {
  background: var(--color-gold);
  color: #000;
  border-color: #fff;
}

.reminder-badge.is-old {
  filter: grayscale(0.8) opacity(0.7);
}

.old-tag {
  font-size: 9px;
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 4px;
  border-radius: 4px;
  color: #ccc;
  margin-left: 4px;
}

.custom-input-row {
  display: flex;
  gap: 8px;
}

.custom-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(201, 168, 76, 0.3);
  color: #fff;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.action-btn {
  background: var(--color-gold-dark);
  border: none;
  color: #fff;
  padding: 0 16px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}

.action-btn.update-mode { background: #4a9bd4; }

.delete-btn {
  background: rgba(224, 32, 32, 0.2);
  border: 1px solid rgba(224, 32, 32, 0.4);
  color: #e02020;
  border-radius: 8px;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #ccc;
  padding: 0 12px;
  border-radius: 8px;
}

.divider {
  height: 1px;
  background: rgba(201, 168, 76, 0.1);
  margin: 16px 0;
}

/* 標記分組網格方塊樣式 */
.role-group-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
}

.role-subgroup {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(201, 168, 76, 0.15);
  padding: 10px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.role-tiny-label {
  font-size: 12px;
  color: var(--color-gold);
  font-weight: 700;
  margin-bottom: 2px;
  letter-spacing: 0.5px;
}

.in-play-badge {
  border-color: rgba(201, 168, 76, 0.4);
  background: rgba(201, 168, 76, 0.1);
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 12px;
}

.common-badge {
  border-color: rgba(74, 155, 212, 0.4);
  background: rgba(74, 155, 212, 0.05);
}

.global-badge {
  border-color: rgba(139, 179, 77, 0.6);
  background: rgba(139, 179, 77, 0.1);
  color: #8bb34d;
}

.other-badge {
  opacity: 0.7;
  font-size: 11px;
}

.empty-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  font-style: italic;
  line-height: 1.6;
}
</style>
