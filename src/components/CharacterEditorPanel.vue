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

        <!-- 分類篩選標籤 -->
        <div class="class-filter-container">
          <button 
            v-for="cls in ['首夜', '每夜', '每夜*', '限一次', '特殊', '勝敗']" 
            :key="cls"
            class="class-filter-pill"
            :class="{ active: selectedClass === cls }"
            @click="selectedClass = selectedClass === cls ? '' : cls"
          >
            {{ cls }}
          </button>
        </div>

        <div class="header-actions">
          <button class="btn-primary add-btn" @click="openAdd">
            + 新增角色
          </button>
          <button class="btn-ghost" @click="exportLibrary" title="匯出當前角色庫備份">
            📥
          </button>
          <button class="btn-ghost" @click="importLibrary" title="從備份檔案匯入角色庫">
             📤 
          </button>
          <button class="btn-ghost" @click="resetToDefault" title="恢復成官方預設全庫">
             🔄 
          </button>
        </div>

        <div class="char-list">
          <div 
            v-for="char in filteredRawCharacters" 
            :key="char.id" 
            class="char-item" 
            @click="openEdit(char)"
          >
            <div class="char-logo" :class="(char.team || char.role_type || '').toLowerCase()">
              <img v-if="char.image" :src="char.image" class="char-img" />
              <span v-else class="char-text-fallback">{{ char.name.charAt(0) }}</span>
            </div>
            <div class="char-info">
              <div class="char-name">
                <span :class="['type-dot', (char.team || char.role_type || '').toLowerCase()]"></span>
                {{ char.name || '未知' }}
                <span v-if="char.is_custom" class="custom-badge" title="這是自定義或已修改的角色">🛠️ 自定義</span>
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
const selectedClass = ref('')
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
  if (selectedClass.value) {
    list = list.filter(c => {
      let cClass = c.class
      if (!cClass) {
        const rawChar = scriptStore.rawCharacterList.find(rc => rc.id === c.id)
        cClass = rawChar?.class || ''
      }
      return cClass === selectedClass.value
    })
  }
  return list
})

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

async function saveCharacter() {
  if (!isFormValid.value) return

  const newList = [...scriptStore.rawCharacterList]
  // 準備要儲存的資料，確保所有編輯過的欄位都能正確覆蓋
  const newChar: any = {
    id: formData.value.id.trim(),
    name: formData.value.name.trim(),
    team: formData.value.team,
    ability: formData.value.ability,
    image: formData.value.image,
    // 如果為空則設為 undefined，合併時會覆蓋舊值並在序列化時移除
    firstNight: formData.value.firstNight ? Number(formData.value.firstNight) : undefined,
    otherNight: formData.value.otherNight ? Number(formData.value.otherNight) : undefined,
    // 過濾掉沒有選擇對象的無效規則，並確保空陣列也能正確覆蓋舊規則
    conflicts: (formData.value.conflicts || []).filter((r: any) => r.target),
    reminders: (formData.value.reminders || []).map((r: string) => r.trim()).filter((r: string) => r),
    // 標記為自定義/已修改
    is_custom: true
  }

  if (editingId.value) {
    const idx = newList.findIndex(c => c.id === editingId.value)
    if (idx > -1) {
      newList[idx] = { ...newList[idx], ...newChar }
    }
  } else {
    // 檢查 ID
    if (newList.some(c => c.id === newChar.id)) {
      alert('該 ID 已存在，請更換一個。')
      return
    }
    newList.push(newChar)
  }

  await scriptStore.saveCharacters(newList)
  mode.value = 'list'
}

async function deleteCharacter() {
  if (!editingId.value) return
  if (!confirm('確定要刪除這個角色嗎？')) return

  const newList = scriptStore.rawCharacterList.filter(c => c.id !== editingId.value)
  await scriptStore.saveCharacters(newList)
  mode.value = 'list'
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
    alert('圖片太大了 (超過 2MB)，請壓縮後再上傳。')
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
  if (!confirm('確定要將角色庫恢復成官方預設狀態嗎？這將會覆蓋您新增或修改過的所有角色且無法復原！建議先執行「匯出備份」。')) {
    return
  }
  
  try {
    await scriptStore.resetToDefault()
  } catch (e) {
    alert('恢復失敗：' + String(e))
  }
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
      alert('角色庫已成功匯出至：' + filePath)
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
      alert('匯入失敗：檔案格式不正確（必須是 JSON 陣列）')
      return
    }

    if (confirm(`確定要匯入此備份嗎？若偵測到重複的「自定義角色」將會自動重新命名以保護現有資料。檔案內含 ${importedList.length} 個角色。`)) {
      const currentList = [...scriptStore.rawCharacterList]
      
      importedList.forEach((newChar: any) => {
        const existingIdx = currentList.findIndex(c => c.id === newChar.id)
        const existing = existingIdx > -1 ? currentList[existingIdx] : null

        if (existing && existing.is_custom) {
          // 衝突處理：現有角色是自定義的，將新匯入的角色重新命名
          let counter = 1
          let newId = `${newChar.id}_${counter}`
          while (currentList.some(c => c.id === newId)) {
            counter++
            newId = `${newChar.id}_${counter}`
          }
          
          const renamedChar = {
            ...newChar,
            id: newId,
            name: `${newChar.name}_${counter}`
          }
          currentList.push(renamedChar)
        } else if (existing) {
          // 覆蓋非自定義的角色（官方預設版）
          currentList[existingIdx] = newChar
        } else {
          // 無衝突，直接新增
          currentList.push(newChar)
        }
      })

      await scriptStore.saveCharacters(currentList)
      alert('✅ 角色庫已成功匯入（衝突角色已自動重新命名）！')
    }
  } catch (e) {
    console.error('Import failed', e)
    alert('❌ 匯入失敗：' + String(e))
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
  gap: 8px;
  margin: 0 16px 16px;
}

.add-btn {
  flex: 1;
  padding: 12px;
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
</style>
