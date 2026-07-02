<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="editor-panel panel animate-slide-up">
      <div class="panel-header">
        <span class="panel-icon" @click="mode = 'list'" style="cursor:pointer">{{ mode === 'list' ? '📝' : '←' }}</span>
        <h2 class="panel-title">{{ mode === 'list' ? '自定義角色庫' : (editingId ? '編輯角色' : '新增角色') }}</h2>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <!-- 列表模式 -->
      <div v-if="mode === 'list'" class="panel-body list-mode">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input v-model="searchQuery" placeholder="搜尋角色名稱/ID..." class="search-input" />
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</button>
        </div>

        <!-- 篩選與管理工具列合併行 -->
        <div class="filter-management-row">
          <div class="team-filter-container">
            <button 
              v-for="team in [
                { key: 'Townsfolk', label: '鎮民', color: 'var(--color-townsfolk)' },
                { key: 'Outsider', label: '外來者', color: 'var(--color-outsider)' },
                { key: 'Minion', label: '爪牙', color: 'var(--color-minion)' },
                { key: 'Demon', label: '惡魔', color: 'var(--color-demon)' },
                { key: 'Traveler', label: '旅行者', color: '#8bb34d' },
                { key: 'Fabled', label: '傳奇', color: '#e6c547' }
              ]" 
              :key="team.key"
              class="team-filter-pill"
              :class="{ active: selectedTeam === team.key }"
              :style="selectedTeam === team.key ? { borderColor: team.color, color: team.color, background: team.color + '1a' } : {}"
              @click="selectedTeam = selectedTeam === team.key ? '' : team.key"
            >
              {{ team.label }}
            </button>
          </div>

          <div class="management-btns-group">
            <button class="btn-ghost btn-icon-only" @click="exportLibrary" title="匯出當前角色庫備份">
              <img src="/pic/export.png" class="btn-icon-img" />
            </button>
            <button class="btn-ghost btn-icon-only" @click="importLibrary" title="從備份檔案匯入角色庫">
              <img src="/pic/import.png" class="btn-icon-img" />
            </button>
            <button class="btn-ghost btn-icon-only" @click="resetToDefault" title="恢復成官方預設全庫">
              <img src="/pic/reset.png" class="btn-icon-img" />
            </button>
          </div>
        </div>

        <div v-if="isBatchMode" class="batch-actions-bar">
          <div class="batch-count">已選擇 {{ selectedBatchIds.size }} 個角色</div>
          <div class="batch-btns">
            <button class="btn-ghost btn-xs" @click="toggleSelectAllBatch">
              {{ selectedBatchIds.size === filteredRawCharacters.length ? '取消全選' : '全選' }}
            </button>
            <button class="btn-danger btn-xs" :disabled="selectedBatchIds.size === 0" @click="executeBatchDelete">
              🗑️ 刪除已選
            </button>
            <button class="btn-ghost btn-xs cancel-batch-btn" @click="disableBatchMode">
              取消
            </button>
          </div>
        </div>
        <div v-else class="header-actions">
          <button class="btn-primary add-btn" @click="openAdd">
            + 新增角色
          </button>
          <button class="btn-ghost batch-btn-trigger" @click="enableBatchMode" title="批量刪除角色">
            🗑️ 批量刪除
          </button>
          <button class="btn-ghost sort-mode-btn" @click="cycleSortMode" :title="`當前排序：${sortModeLabels[sortMode]}`">
            {{ sortModeLabels[sortMode] }}
          </button>
          <button class="btn-ghost sort-dir-btn" @click="isDesc = !isDesc" :title="isDesc ? '當前為倒序，點擊切換為正序' : '當前為正序，點擊切換為倒序'">
            {{ isDesc ? '▼ 倒序' : '▲ 正序' }}
          </button>
        </div>

        <div class="char-list" :class="{ 'in-batch-mode': isBatchMode }">
          <div 
            v-for="char in filteredRawCharacters" 
            :key="char.id" 
            class="char-item" 
            :class="{ 'selected-for-batch': selectedBatchIds.has(char.id) }"
            @click="handleCharItemClick(char)"
          >
            <div v-if="isBatchMode" class="batch-checkbox-container" @click.stop>
              <input 
                type="checkbox" 
                class="batch-checkbox-input"
                :checked="selectedBatchIds.has(char.id)" 
                @change="toggleSelectBatch(char.id)" 
              />
            </div>
            <div class="char-logo" :class="(char.team || char.role_type || '').toLowerCase()">
              <img v-if="char.image" :src="char.image" class="char-img" />
              <span v-else class="char-text-fallback">{{ char.name.charAt(0) }}</span>
            </div>
            <div class="char-info">
              <div class="char-name">
                <span :class="['type-dot', (char.team || char.role_type || '').toLowerCase()]"></span>
                {{ char.name || '未知' }}
                <span v-if="char.is_custom" class="custom-badge" title="這是自定義或已修改的角色">🛠️ 自定義</span>
                <span v-if="char.is_temp" class="temp-badge" title="本局暫存角色，切換劇本時將會自動清理">⏱️ 暫存</span>
              </div>
              <div class="char-sub">
                {{ char.id }}
                <span v-if="char.firstNight" class="night-order-info n-first">🌙1: {{ char.firstNight }}</span>
                <span v-if="char.otherNight" class="night-order-info n-other">🌙+: {{ char.otherNight }}</span>
              </div>
              <div v-if="char.reminders && char.reminders.length > 0" class="char-reminders-list">
                <span v-for="r in char.reminders" :key="r" class="reminder-tag">
                  🔸{{ r }}
                </span>
              </div>
              <div v-if="char.conflicts && char.conflicts.length > 0" class="char-conflicts">
                <div v-for="(rule, idx) in char.conflicts" :key="idx" class="conflict-badge">
                  <div class="conflict-badge-title">⚔️ vs {{ getCharacterName(rule.target || rule.charB) }}</div>
                  <div v-if="rule.desc" class="conflict-badge-desc">{{ rule.desc }}</div>
                </div>
              </div>
            </div>
            <div v-if="char.is_temp" class="char-action-zone" @click.stop>
              <button class="btn-promote-temp" @click="promoteTempCharacter(char)" title="將此暫存角色永久登錄至角色庫">
                💾 登錄
              </button>
            </div>
            <span class="arrow">›</span>
          </div>
        </div>
      </div>

      <!-- 編輯/新增模式 -->
      <div v-else class="panel-body form-mode">
        <div class="form-group">
          <label>官方英文 ID (不得重複, 只能英文與底線)</label>
          <input class="form-input" v-model="formData.id" :disabled="!!editingId" placeholder="例如: po_charge" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>中文名稱</label>
            <input class="form-input" v-model="formData.name" placeholder="例如: 充能惡魔" />
          </div>
          <div class="form-group">
            <label>類型 (英文)</label>
            <select class="form-input" v-model="formData.team">
              <option value="Townsfolk">鎮民 (Townsfolk)</option>
              <option value="Outsider">外來者 (Outsider)</option>
              <option value="Minion">爪牙 (Minion)</option>
              <option value="Demon">惡魔 (Demon)</option>
              <option value="Traveler">旅行者 (Traveler)</option>
              <option value="Fabled">傳說角色 (Fabled)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>技能描述</label>
          <textarea class="form-input" v-model="formData.ability" rows="3" placeholder="角色的技能效果說明..."></textarea>
        </div>

        <div class="form-group">
          <label>圖片網址 (URL)</label>
          <div class="input-with-action">
            <input class="form-input" v-model="formData.image" placeholder="https://..." />
            <button class="btn-ghost action-btn" @click="fileInput?.click()" title="從本機上傳圖片">
              📂 上傳
            </button>
            <input 
              type="file" 
              ref="fileInput" 
              style="display: none" 
              accept="image/*" 
              @change="handleFileUpload" 
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>首夜行動順序 (空白為無)</label>
            <input class="form-input" type="number" v-model.number="formData.firstNight" />
          </div>
          <div class="form-group">
            <label>其他夜晚順序 (空白為無)</label>
            <input class="form-input" type="number" v-model.number="formData.otherNight" />
          </div>
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label>提示標記 (Reminders)</label>
            <button class="btn-ghost" style="padding: 4px 8px; font-size: 12px;" @click="addReminderToken">+ 新增標記</button>
          </div>
          <div class="reminders-list-edit">
            <div v-for="(_, index) in formData.reminders" :key="index" class="reminder-edit-row">
              <input class="form-input" v-model="formData.reminders[index]" placeholder="例如: 中毒" />
              <button class="btn-danger-icon" @click="removeReminderToken(index)">✕</button>
            </div>
            <div v-if="!formData.reminders || formData.reminders.length === 0" class="no-reminders-hint">
              無提示標記。點擊右上角新增，以便在遊戲中為玩家標記狀態。
            </div>
          </div>
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label>相克規則</label>
            <button class="btn-ghost" style="padding: 4px 8px; font-size: 12px;" @click="addConflictRule">+ 新增規則</button>
          </div>
          <div v-for="(rule, index) in formData.conflicts" :key="index" class="conflict-rule">
            <div class="form-group" style="margin-bottom: 8px;">
              <label>衝突對象</label>
              <select class="form-input" v-model="rule.target">
                <option v-for="c in rawListWithoutMeta" :key="'T'+c.id" :value="c.id">{{ c.name }} ({{ c.id }})</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 12px;">
              <label>相克規則描述</label>
              <textarea class="form-input" v-model="rule.desc" placeholder="輸入規則描述..." rows="2"></textarea>
            </div>
            <div style="display: flex; justify-content: flex-end;">
              <button class="btn-danger" style="padding: 6px 12px; font-size: 12px;" @click="removeConflictRule(index)">刪除此規則</button>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn-danger" v-if="editingId" @click="deleteCharacter">刪除</button>
          <div style="flex:1"></div>
          <button class="btn-ghost" @click="mode = 'list'">取消</button>
          <button class="btn-primary" :disabled="!isFormValid" @click="saveCharacter">儲存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useScriptStore } from '../stores/scriptStore'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'

const uiStore = useUIStore()
const scriptStore = useScriptStore()

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'Esc') {
    e.stopImmediatePropagation()
    if (mode.value === 'form') {
      mode.value = 'list'
    } else {
      uiStore.closePanel()
    }
  }
}

const fileInput = ref<HTMLInputElement | null>(null)
const mode = ref<'list' | 'form'>('list')
const searchQuery = ref('')
const selectedTeam = ref('')
const editingId = ref<string | null>(null)

// 綁定到表單的資料
const formData = ref<any>({
  id: '',
  name: '',
  team: 'Townsfolk',
  ability: '',
  image: '',
  firstNight: '',
  otherNight: '',
  conflicts: [],
  reminders: []
})

const rawListWithoutMeta = computed(() => {
  return scriptStore.rawCharacterList.filter(c => c.id !== '_meta')
})

function getCharacterName(id: string) {
  if (!id) return '未知'
  const char = scriptStore.rawCharacterList.find(c => c.id === id)
  return char ? char.name : id
}

const filteredRawCharacters = computed(() => {
  let list = rawListWithoutMeta.value
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(c => 
      (c.name && c.name.toLowerCase().includes(q)) || 
      (c.id && c.id.toLowerCase().includes(q))
    )
  }
  if (selectedTeam.value) {
    list = list.filter(c => {
      const t = (c.team || c.role_type || '').toLowerCase()
      return t === selectedTeam.value.toLowerCase()
    })
  }
  const teamOrder: Record<string, number> = {
    townsfolk: 1,
    outsider: 2,
    minion: 3,
    demon: 4,
    traveler: 5,
    fabled: 6
  }

  const sorted = [...list].sort((a, b) => {
    if (sortMode.value === 'temp') {
      const aTemp = a.is_temp ? 1 : 0
      const bTemp = b.is_temp ? 1 : 0
      return bTemp - aTemp
    }
    if (sortMode.value === 'name') {
      return (a.name || '').localeCompare(b.name || '', 'zh-Hant')
    }
    if (sortMode.value === 'id') {
      return (a.id || '').localeCompare(b.id || '')
    }
    if (sortMode.value === 'type') {
      const aOrder = teamOrder[(a.team || a.role_type || '').toLowerCase()] || 99
      const bOrder = teamOrder[(b.team || b.role_type || '').toLowerCase()] || 99
      return aOrder - bOrder
    }
    return 0
  })

  if (isDesc.value) {
    sorted.reverse()
  }
  return sorted
})

type SortMode = 'temp' | 'name' | 'id' | 'type'
const sortMode = ref<SortMode>('temp')
const isDesc = ref(false)

const sortModeLabels: Record<SortMode, string> = {
  temp: '⏱️ 暫存優先',
  name: '🔤 依名稱',
  id: '🔑 依 ID',
  type: '👥 依類型'
}

function cycleSortMode() {
  const modes: SortMode[] = ['temp', 'name', 'id', 'type']
  const nextIdx = (modes.indexOf(sortMode.value) + 1) % modes.length
  sortMode.value = modes[nextIdx]
}

const isBatchMode = ref(false)
const selectedBatchIds = ref<Set<string>>(new Set())

function enableBatchMode() {
  isBatchMode.value = true
  selectedBatchIds.value = new Set()
}

function disableBatchMode() {
  isBatchMode.value = false
  selectedBatchIds.value = new Set()
}

function handleCharItemClick(char: any) {
  if (isBatchMode.value) {
    toggleSelectBatch(char.id)
  } else {
    openEdit(char)
  }
}

function toggleSelectBatch(id: string) {
  const next = new Set(selectedBatchIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedBatchIds.value = next
}

function toggleSelectAllBatch() {
  if (selectedBatchIds.value.size === filteredRawCharacters.value.length) {
    selectedBatchIds.value = new Set()
  } else {
    selectedBatchIds.value = new Set(filteredRawCharacters.value.map(c => c.id))
  }
}

async function executeBatchDelete() {
  if (selectedBatchIds.value.size === 0) return
  uiStore.showConfirm(
    '批量刪除角色',
    `確定要刪除這 ${selectedBatchIds.value.size} 個選擇的角色嗎？此操作將無法還原！`,
    async () => {
      const idsToDelete = selectedBatchIds.value
      const newList = scriptStore.rawCharacterList.filter(c => !idsToDelete.has(c.id))
      await scriptStore.saveCharacters(newList)
      disableBatchMode()
      uiStore.showAlert('刪除成功', `已成功刪除 ${idsToDelete.size} 個角色。`)
    },
    true
  )
}

function openAdd() {
  editingId.value = null
  formData.value = {
    id: '',
    name: '',
    team: 'Townsfolk',
    ability: '',
    image: '',
    firstNight: '',
    otherNight: '',
    conflicts: [],
    reminders: []
  }
  mode.value = 'form'
}

function openEdit(char: any) {
  editingId.value = char.id
  formData.value = {
    id: char.id || '',
    name: char.name || '',
    team: char.team || char.role_type || 'Townsfolk',
    ability: char.ability || '',
    image: char.image || '',
    firstNight: char.firstNight || '',
    otherNight: char.otherNight || '',
    conflicts: char.conflicts ? JSON.parse(JSON.stringify(char.conflicts)) : [],
    reminders: char.reminders ? JSON.parse(JSON.stringify(char.reminders)) : []
  }
  mode.value = 'form'
}

const isFormValid = computed(() => {
  return formData.value.id.trim() && formData.value.name.trim()
})

async function promoteTempCharacter(char: any) {
  const newList = [...scriptStore.rawCharacterList]
  const idx = newList.findIndex(c => c.id === char.id)
  if (idx > -1) {
    newList[idx] = { ...newList[idx], is_temp: false }
    await scriptStore.saveCharacters(newList)
    uiStore.showAlert('登錄成功', `自創角色「${char.name}」已成功登錄為永久角色！`)
  }
}

async function saveCharacter() {
  if (!isFormValid.value) return

  const newList = [...scriptStore.rawCharacterList]
  // 準備要儲存的資料，確保所有編輯過的欄位都能正確覆蓋
  const newChar: any = {
    id: formData.value.id.trim(),
    name: formData.value.name.trim(),
    team: formData.value.team,
    ability: formData.value.ability,
    image: formData.value.image ? formData.value.image.replace(/\\/g, '') : '',
    // 如果為空則設為 undefined，合併時會覆蓋舊值並在序列化時移除
    firstNight: formData.value.firstNight ? Number(formData.value.firstNight) : undefined,
    otherNight: formData.value.otherNight ? Number(formData.value.otherNight) : undefined,
    // 過濾掉沒有選擇對象的無效規則，並確保空陣列也能正確覆蓋舊規則
    conflicts: (formData.value.conflicts || []).filter((r: any) => r.target),
    reminders: (formData.value.reminders || []).map((r: string) => r.trim()).filter((r: string) => r),
    // 標記為自定義/已修改，並強制清除暫存標籤
    is_custom: true,
    is_temp: false
  }

  if (editingId.value) {
    const idx = newList.findIndex(c => c.id === editingId.value)
    if (idx > -1) {
      newList[idx] = { ...newList[idx], ...newChar }
    }
  } else {
    // 檢查 ID
    if (newList.some(c => c.id === newChar.id)) {
      uiStore.showAlert('ID 已存在', '該 ID 已存在，請更換一個。')
      return
    }
    newList.push(newChar)
  }

  await scriptStore.saveCharacters(newList)
  mode.value = 'list'
}

async function deleteCharacter() {
  if (!editingId.value) return
  uiStore.showConfirm(
    '刪除角色',
    '確定要刪除這個角色嗎？',
    async () => {
      const newList = scriptStore.rawCharacterList.filter(c => c.id !== editingId.value)
      await scriptStore.saveCharacters(newList)
      mode.value = 'list'
    },
    true
  )
}

function addConflictRule() {
  if (!formData.value.conflicts) formData.value.conflicts = []
  formData.value.conflicts.push({ target: '', desc: '' })
}

function removeConflictRule(index: number | string) {
  formData.value.conflicts.splice(Number(index), 1)
}

function addReminderToken() {
  if (!formData.value.reminders) formData.value.reminders = []
  formData.value.reminders.push('')
}

function removeReminderToken(index: number | string) {
  formData.value.reminders.splice(Number(index), 1)
}

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  
  const file = target.files[0]
  if (file.size > 2 * 1024 * 1024) {
    uiStore.showAlert('圖片過大', '圖片太大了 (超過 2MB)，請壓縮後再上傳。')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    formData.value.image = e.target?.result as string
    // 清除 input，以便下次選擇同一張檔案也能觸發 change
    target.value = ''
  }
  reader.readAsDataURL(file)
}

async function resetToDefault() {
  uiStore.showConfirm(
    '復原預設',
    '確定要將角色庫恢復成官方預設狀態嗎？這將會榆蓋您新增或修改過的所有角色且無法復原！建議先執行「匯出備份」。',
    async () => {
      try {
        await scriptStore.resetToDefault()
      } catch (e) {
        uiStore.showAlert('復原失敗', '復原失敗：' + String(e))
      }
    },
    true
  )
}

async function exportLibrary() {
  const json = JSON.stringify(scriptStore.rawCharacterList, null, 2)
  const fileName = `botc-characters-${Date.now()}.json`

  try {
    const filePath = await save({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      defaultPath: fileName
    })

    if (filePath) {
      await writeTextFile(filePath, json)
      uiStore.showAlert('匯出成功', '角色庫已成功匯出至：' + filePath)
    }
  } catch (e) {
    console.warn('Tauri export failed, falling back to browser download', e)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }
}

async function importLibrary() {
  try {
    const filePath = await open({
      multiple: false,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (!filePath) return

    const json = await readTextFile(filePath)
    const importedList = JSON.parse(json)

    if (!Array.isArray(importedList)) {
      uiStore.showAlert('匯入失敗', '匯入失敗：檔案格式不正確（必須是 JSON 陣列）')
      return
    }

    uiStore.showConfirm(
      '匯入處理',
      `確定要匯入此備份嗎？若偵測到重複的「自定義角色」將會自動重新命名以保護現有資料。檔案內含 ${importedList.length} 個角色。`,
      async () => {
        const currentList = [...scriptStore.rawCharacterList]
        importedList.forEach((newChar: any) => {
          const existingIdx = currentList.findIndex(c => c.id === newChar.id)
          const existing = existingIdx > -1 ? currentList[existingIdx] : null
          if (existing && existing.is_custom) {
            let counter = 1
            let newId = `${newChar.id}_${counter}`
            while (currentList.some(c => c.id === newId)) { counter++; newId = `${newChar.id}_${counter}` }
            currentList.push({ ...newChar, id: newId, name: `${newChar.name}_${counter}` })
          } else if (existing) {
            currentList[existingIdx] = newChar
          } else {
            currentList.push(newChar)
          }
        })
        await scriptStore.saveCharacters(currentList)
        uiStore.showAlert('匯入成功', '✅ 角色庫已成功匯入（衝突角色已自動重新命名）！')
      }
    )
  } catch (e) {
    console.error('Import failed', e)
    uiStore.showAlert('匯入失敗', '❌ 匯入失敗：' + String(e))
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

.editor-panel {
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
  padding: 10px 16px; /* 縮小上下內距 */
  border-bottom: 1px solid rgba(201,168,76,0.1);
  flex-shrink: 0;
  background: var(--color-bg-surface);
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
  border: none;
  cursor: pointer;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.panel-body.form-mode {
  padding: 16px;
}

.search-bar {
  position: relative;
  margin: 10px 16px; /* 縮小上下外距 */
  margin-bottom: 8px;
}

.class-filter-container {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 0 16px 4px;
  margin-bottom: 12px;
  scrollbar-width: none;
}

.class-filter-container::-webkit-scrollbar {
  display: none;
}

.class-filter-pill {
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.class-filter-pill:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.class-filter-pill.active {
  background: rgba(201, 168, 76, 0.2);
  border-color: var(--color-gold);
  color: var(--color-gold);
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  opacity: 0.5;
}

.search-input {
  width: 100%;
  padding: 10px 36px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 14px;
  outline: none;
}

.search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #888;
  font-size: 14px;
  cursor: pointer;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 16px 16px;
  height: 38px;
}

.header-actions button {
  height: 38px !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  white-space: nowrap;
  font-size: 11.5px;
  font-weight: 600;
  padding: 0 10px;
  border-radius: 8px;
  transition: all 0.2s;
}

.add-btn {
  flex: 1.2;
  padding: 0 12px !important;
}

.char-list {
  display: flex;
  flex-direction: column;
}

.char-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 16px;
  background: none;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.char-item:active {
  background: rgba(255,255,255,0.05);
}

.char-logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.char-logo.townsfolk { color: #5dade2; }
.char-logo.outsider { color: #48c9b0; }
.char-logo.minion { color: #ec7063; }
.char-logo.demon { color: #f1948a; }
.char-logo.traveler { color: #8bb34d; }
.char-logo.fabled { color: #e6c547; }

.char-text-fallback {
  font-size: 18px;
  font-weight: 900;
  font-family: 'ChineseFont', var(--font-title), sans-serif;
  color: currentColor;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  user-select: none;
}

.char-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.char-info { flex: 1; overflow: hidden; }

.char-name {
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.type-dot.townsfolk { background-color: var(--color-townsfolk); }
.type-dot.outsider { background-color: var(--color-outsider); }
.type-dot.minion { background-color: var(--color-minion); }
.type-dot.demon { background-color: var(--color-demon); }
.type-dot.traveler { background-color: #8bb34d; }
.type-dot.fabled { background-color: #e6c547; }

.custom-badge {
  font-size: 9px;
  background: linear-gradient(135deg, #9c27b0, #673ab7);
  color: white;
  padding: 1px 4px;
  border-radius: 4px;
  margin-left: 4px;
  font-weight: normal;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.temp-badge {
  font-size: 9px;
  background: linear-gradient(135deg, #e65100, #ff8f00);
  color: white;
  padding: 1px 4px;
  border-radius: 4px;
  margin-left: 4px;
  font-weight: normal;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.char-action-zone {
  display: flex;
  align-items: center;
  margin-left: auto;
  margin-right: 8px;
}

.btn-promote-temp {
  background: rgba(201, 168, 76, 0.15);
  border: 1px solid var(--color-gold);
  color: var(--color-gold);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-promote-temp:hover {
  background: var(--color-gold);
  color: #121218;
}

.char-sub {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.night-order-info {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  color: #fff;
}

.n-first {
  background: rgba(74, 144, 226, 0.2);
  border: 1px solid rgba(74, 144, 226, 0.3);
  color: #82b1ff;
}

.n-other {
  background: rgba(230, 126, 34, 0.2);
  border: 1px solid rgba(230, 126, 34, 0.3);
  color: #ffcc80;
}

.char-conflicts {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conflict-badge {
  font-size: 10px;
  color: #e57373;
  background: rgba(229, 115, 115, 0.08);
  border: 1px solid rgba(229, 115, 115, 0.15);
  padding: 4px 8px;
  border-radius: 6px;
}

.conflict-badge-title {
  font-weight: 700;
  margin-bottom: 1px;
}

.conflict-badge-desc {
  font-size: 10px;
  color: var(--color-text-muted);
  line-height: 1.3;
  font-style: italic;
}

.arrow {
  color: var(--color-gold-muted);
}

/* Form Styles */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-group label {
  font-size: 12px;
  color: var(--color-gold);
  font-weight: 600;
}

.form-row {
  display: flex;
  gap: 12px;
}
.form-row .form-group { flex: 1; }

.conflict-rule {
  background: rgba(0,0,0,0.15);
  border: 1px solid rgba(255,255,255,0.05);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.form-input {
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 10px;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  flex: 1;
}

.input-with-action {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  white-space: nowrap;
  padding: 10px 12px;
  font-size: 13px;
  flex-shrink: 0;
}

.form-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.btn-primary, .btn-ghost, .btn-danger {
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  font-weight: bold;
  cursor: pointer;
}

.btn-primary { background: var(--color-gold); color: black; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { background: rgba(255,255,255,0.1); color: white; }
.btn-danger { background: rgba(244, 67, 54, 0.2); color: #f44336; border: 1px solid rgba(244, 67, 54, 0.4); }

.char-reminders-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.reminder-tag {
  font-size: 10px;
  background: rgba(74, 144, 226, 0.12);
  border: 1px solid rgba(74, 144, 226, 0.25);
  color: #e79718;
  padding: 2px 6px;
  border-radius: 4px;
}

.reminders-list-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0,0,0,0.15);
  border: 1px solid rgba(255,255,255,0.05);
  padding: 12px;
  border-radius: 8px;
}

.reminder-edit-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.reminder-edit-row .form-input {
  padding: 8px 10px;
  font-size: 13px;
}

.btn-danger-icon {
  background: rgba(244, 67, 54, 0.15);
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: #f44336;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  border: none;
  transition: all var(--transition-fast);
}

.btn-danger-icon:active {
  background: rgba(244, 67, 54, 0.3);
}

.no-reminders-hint {
  font-size: 12px;
  color: var(--color-text-muted);
  text-align: center;
  padding: 8px 0;
  line-height: 1.5;
}

.team-filter-container {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 0 16px 4px;
  margin-bottom: 12px;
  scrollbar-width: none;
}

.team-filter-container::-webkit-scrollbar {
  display: none;
}

.team-filter-pill {
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.team-filter-pill:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.team-filter-pill.active {
  border-color: currentColor;
  background: rgba(255, 255, 255, 0.1);
}

.btn-icon-only {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px !important;
  width: 38px;
  height: 38px;
  box-sizing: border-box;
}

.btn-icon-only .btn-icon-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  display: block;
}

/* 批量刪除樣式 */
.batch-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: rgba(244, 67, 54, 0.08);
  border: 1px dashed rgba(244, 67, 54, 0.3);
  border-radius: 8px;
  margin: 10px 16px;
  box-sizing: border-box;
}

.batch-count {
  font-size: 13px;
  font-weight: bold;
  color: #f44336;
}

.batch-btns {
  display: flex;
  gap: 8px;
}

.btn-xs {
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-xs.btn-danger {
  background: #f44336;
  color: white;
}

.btn-xs.btn-danger:hover:not(:disabled) {
  background: #d32f2f;
}

.btn-xs.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-xs.btn-ghost {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-muted);
}

.btn-xs.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
}

.cancel-batch-btn {
  border-color: rgba(255, 255, 255, 0.15) !important;
}

.batch-checkbox-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  flex-shrink: 0;
}

.batch-checkbox-input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #f44336;
}

.char-list.in-batch-mode .char-item {
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.char-list.in-batch-mode .char-item.selected-for-batch {
  background: rgba(244, 67, 54, 0.04);
  border-left-color: #f44336;
}

.batch-btn-trigger {
  color: #f44336 !important;
  border-color: rgba(244, 67, 54, 0.3) !important;
  background: rgba(244, 67, 54, 0.05) !important;
}

.batch-btn-trigger:hover {
  background: rgba(244, 67, 54, 0.15) !important;
}

.sort-mode-btn {
  font-size: 11px;
  font-weight: bold;
  min-width: 90px;
  text-align: center;
  justify-content: center;
  border-color: rgba(255, 255, 255, 0.15) !important;
  color: var(--color-gold) !important;
  background: rgba(255, 255, 255, 0.02) !important;
}

.sort-mode-btn:hover {
  background: rgba(255, 255, 255, 0.08) !important;
}

.btn-icon-only {
  width: 38px !important;
  height: 38px !important;
  padding: 0 !important;
}

.sort-dir-btn {
  font-size: 11px;
  font-weight: bold;
  min-width: 66px;
  text-align: center;
  justify-content: center;
  border-color: rgba(255, 255, 255, 0.15) !important;
  color: var(--color-gold) !important;
  background: rgba(255, 255, 255, 0.02) !important;
}

.sort-dir-btn:hover {
  background: rgba(255, 255, 255, 0.08) !important;
}

.filter-management-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 16px 12px;
  gap: 12px;
}

.filter-management-row .team-filter-container {
  margin-bottom: 0 !important;
  padding: 0 !important;
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 4px !important;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.filter-management-row .team-filter-pill {
  font-size: 10px !important;
  padding: 4px 10px !important;
  border-radius: 10px !important;
}

.management-btns-group {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.management-btns-group .btn-icon-only {
  width: 30px !important;
  height: 30px !important;
  padding: 0 !important;
  border-radius: 6px !important;
}

.management-btns-group .btn-icon-only .btn-icon-img {
  width: 14px !important;
  height: 14px !important;
}
</style>
