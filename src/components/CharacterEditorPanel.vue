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

        <div class="header-actions">
          <button class="btn-primary add-btn" @click="openAdd">
            + 新增角色
          </button>
          <button class="btn-ghost" @click="resetToDefault" title="恢復成官方預設全庫">
             🔄 恢復預設
          </button>
        </div>

        <div class="char-list">
          <div 
            v-for="char in filteredRawCharacters" 
            :key="char.id" 
            class="char-item" 
            @click="openEdit(char)"
          >
            <div class="char-logo">
              <img v-if="char.image" :src="char.image" class="char-img" />
              <span v-else>❓</span>
            </div>
            <div class="char-info">
              <div class="char-name">
                <span :class="['type-dot', (char.team || char.role_type || '').toLowerCase()]"></span>
                {{ char.name || '未知' }}
              </div>
              <div class="char-sub">{{ char.id }}</div>
              <div v-if="char.conflicts && char.conflicts.length > 0" class="char-conflicts">
                <div v-for="(rule, idx) in char.conflicts" :key="idx" class="conflict-badge">
                  ⚔️ vs {{ getCharacterName(rule.target || rule.charB) }}
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
          <input class="form-input" v-model="formData.image" placeholder="https://..." />
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
import { ref, computed } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useScriptStore } from '../stores/scriptStore'

const uiStore = useUIStore()
const scriptStore = useScriptStore()

const mode = ref<'list' | 'form'>('list')
const searchQuery = ref('')
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
  conflicts: []
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
    conflicts: []
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
    conflicts: char.conflicts ? JSON.parse(JSON.stringify(char.conflicts)) : []
  }
  mode.value = 'form'
}

const isFormValid = computed(() => {
  return formData.value.id.trim() && formData.value.name.trim()
})

async function saveCharacter() {
  if (!isFormValid.value) return

  const newList = [...scriptStore.rawCharacterList]
  const newChar = {
    id: formData.value.id.trim(),
    name: formData.value.name.trim(),
    team: formData.value.team,
    ability: formData.value.ability,
    image: formData.value.image,
    ... (formData.value.firstNight ? { firstNight: Number(formData.value.firstNight) } : {}),
    ... (formData.value.otherNight ? { otherNight: Number(formData.value.otherNight) } : {}),
    ... (formData.value.conflicts && formData.value.conflicts.length > 0 ? { conflicts: formData.value.conflicts } : {})
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

async function resetToDefault() {
  if (!confirm('確定要將角色庫恢復成官方預設狀態嗎？這將會覆蓋您新增或修改過的所有角色且無法復原！')) {
    return
  }
  
  try {
    // 透過呼叫後端重建或重新存入默認 json
    // 我們可以從 tauri plugin-fs 直接把 default 的 static 列表蓋回去
    // 不過由於 scriptStore 目前沒有暴露重置方法，我們需要從內部發起
    await scriptStore.resetToDefault()
  } catch (e) {
    alert('恢復失敗：' + String(e))
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
  background: var(--color-bg-base);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 16px 10px;
  border-bottom: 1px solid rgba(201,168,76,0.1);
  flex-shrink: 0;
  background: var(--color-bg-elevated);
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
  padding: 16px;
}

.search-bar {
  position: relative;
  margin-bottom: 12px;
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
  margin-bottom: 16px;
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
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.char-item:hover {
  background: rgba(255,255,255,0.06);
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

.char-sub {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
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
  background: rgba(229, 115, 115, 0.1);
  border: 1px solid rgba(229, 115, 115, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  width: fit-content;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
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
</style>
