<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="editor-panel panel animate-slide-up">
      <div class="panel-header">
        <!-- <span class="panel-icon">📜</span> -->
        <span class="stat-icon">
          <img src="/pic/spellbook.png" alt="劇本管理" class="stat-img img-theater" />
        </span>
        <h2 class="panel-title">劇本管理系統</h2>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <!-- 分頁切換 Tabs -->
      <div class="panel-tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'create' }" @click="activeTab = 'create'">
          <template v-if="editingScriptId">
            <img src="/pic/edit.png" class="btn-icon-img" />編輯劇本
          </template>
          <template v-else>
            <img src="/pic/plus.png" class="btn-icon-img" />建立劇本
          </template>
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'categories' }" @click="activeTab = 'categories'">
          <img src="/pic/category.png" class="btn-icon-img" />劇本分類
        </button>
      </div>

      <div class="panel-body">
        <!-- 分頁 1: 建立劇本 -->
        <div v-if="activeTab === 'create'" class="tab-content create-tab">
          <!-- 劇本基本資料 -->
          <div class="form-section-container">
            <div class="form-section">
              <div class="form-group">
                <label class="form-label">劇本名稱</label>
                <input type="text" v-model="newScriptName" placeholder="例如：藍色眼淚、自訂新劇本..." class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">所屬分類</label>
                <select v-model="newScriptCategory" class="form-select">
                  <option v-for="cat in scriptStore.categories" :key="cat" :value="cat">
                    {{ cat }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">官方劇本</label>
                <button class="import-json-btn" @click="triggerJsonImport">
                  <img src="/pic/import.png" class="btn-icon-img" />匯入 JSON
                </button>
                <input type="file" ref="jsonFileInput" hidden accept=".json" @change="handleJsonFileChange" />
              </div>
            </div>
            
            <div class="form-image-row">
              <div class="form-section-image">
                <label class="form-label">實體劇本正面圖檔 </label>
                <div class="image-upload-wrapper">
                  <div v-if="newScriptPhysicalImage" class="image-preview-container">
                    <img :src="scriptStore.getScriptImageUrl(newScriptPhysicalImage) || undefined" class="physical-image-preview" />
                    <button class="remove-image-btn" @click="newScriptPhysicalImage = null" type="button">✕ 刪除圖檔</button>
                  </div>
                  <div v-else class="upload-placeholder" @click="triggerImageUpload">
                    <img src="/pic/upload.png" class="upload-icon-img" />
                    <span class="upload-text">上傳正面圖檔</span>
                    <input type="file" ref="imageFileInput" hidden accept="image/*" @change="handleImageFileChange" />
                  </div>
                </div>
              </div>
              
              <div class="form-section-image">
                <label class="form-label">實體劇本背面圖檔 </label>
                <div class="image-upload-wrapper">
                  <div v-if="newScriptPhysicalImageBack" class="image-preview-container">
                    <img :src="scriptStore.getScriptImageUrl(newScriptPhysicalImageBack) || undefined" class="physical-image-preview" />
                    <button class="remove-image-btn" @click="newScriptPhysicalImageBack = null" type="button">✕ 刪除圖檔</button>
                  </div>
                  <div v-else class="upload-placeholder" @click="triggerImageUploadBack">
                    <img src="/pic/upload.png" class="upload-icon-img" />
                    <span class="upload-text">上傳背面圖檔</span>
                    <input type="file" ref="imageFileInputBack" hidden accept="image/*" @change="handleImageFileChangeBack" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="divider" />

          <!-- 角色池搜尋與快捷工具列 -->
          <div class="toolbar-section">
            <div class="search-and-actions">
              <div class="search-box">
                <input 
                  type="text" 
                  v-model="characterSearch" 
                  placeholder="搜尋角色名稱/能力..." 
                  class="search-input" 
                  @keyup.enter="($event.target as HTMLInputElement).blur()"
                />
                <button v-if="characterSearch" class="clear-search-btn" @click="characterSearch = ''">
                  ✕
                </button>
              </div>
              <div class="batch-actions">
                <button class="action-btn-mini success" @click="selectAllFilteredRoles" title="全選當前篩選的角色">
                  <img src="/pic/vote-yes.png" class="btn-icon-img" />全選
                </button>
                <button class="action-btn-mini danger" @click="clearAllFilteredRoles" title="清空當前篩選的角色">
                  <img src="/pic/rubber.png" class="btn-icon-img" />清空
                </button>
              </div>
            </div>

            <!-- 劇本分類滾動列 (Scrollable Row) -->
            <div class="edition-scroll-wrapper">
              <div class="edition-filters-row">
                <button v-for="filter in editionFilters" :key="filter.key" class="filter-pill-new"
                  :class="{ active: selectedEdition === filter.key }" @click="selectedEdition = filter.key">
                  {{ filter.label }}
                </button>
              </div>
            </div>
          </div>

          <div class="selected-counter">
            已選擇 <span>{{ selectedRoleIds.length }}</span> 個角色
          </div>

          <!-- 一行排版的角色類型統計 (Pills) -->
          <div class="role-stats-row">
            <button v-for="stat in roleStats" :key="stat.key" class="stat-pill"
              :style="{ borderColor: stat.color + '33', color: stat.color }" @click="scrollToRoleGroup(stat.key)">
              {{ stat.label }} (池: {{ stat.selectedCount }}/{{ stat.totalCount }})
            </button>
          </div>

          <!-- 角色清單列表 (依類型分組展示) -->
          <div class="role-selection-area">
            <div v-for="group in filteredGroups" :key="group.key" class="role-group" :id="'editor-group-' + group.key">
              <div class="group-title" :style="{ color: group.color }">
                {{ group.label }} ({{group.list.filter(c => selectedRoleIds.includes(c.id)).length}}/{{
                  group.list.length }})
              </div>
              <div class="role-grid">
                <button v-for="char in group.list" :key="char.id" class="role-item"
                  :class="[char.role_type.toLowerCase(), { 'is-selected': selectedRoleIds.includes(char.id) }]"
                  @click="toggleRole(char.id)">
                  <div class="role-icon">
                    <img v-if="char.image" :src="char.image" :alt="char.name" />
                    <span v-else class="role-text-fallback">{{ char.name.charAt(0) }}</span>
                  </div>
                  <div class="role-name">{{ char.name }}</div>
                  <div class="role-check" v-if="selectedRoleIds.includes(char.id)">✓</div>
                </button>
              </div>
            </div>
          </div>

          <!-- 建立按鈕 -->
          <div class="form-actions" style="display: flex; gap: 8px;">
            <button 
              v-if="editingScriptId"
              class="btn-ghost cancel-edit-btn"
              style="flex: 1;"
              @click="cancelEditingScript"
            >
              <img src="/pic/close.png" class="btn-icon-img" />取消
            </button>
            <button 
              class="btn-primary create-btn" 
              style="flex: 2;"
              :disabled="!newScriptName.trim() || selectedRoleIds.length === 0"
              @click="editingScriptId ? handleUpdateScript() : handleCreateScript()"
            >
              <template v-if="editingScriptId">
                <img src="/pic/notes.png" class="btn-icon-img" />確認儲存變更
              </template>
              <template v-else>
                <img src="/pic/play.png" class="btn-icon-img" />確認建立劇本
              </template>
            </button>
          </div>
        </div>

        <!-- 分頁 2: 劇本分類 -->
        <div v-if="activeTab === 'categories'" class="tab-content categories-tab">
          <!-- 1. 自訂分類區塊 (支援拖曳與排序) -->
          <div class="section-title">自訂分類排序與管理</div>

          <div class="categories-list">
            <div v-for="(cat, index) in scriptStore.categories" :key="cat" class="category-item"
              :class="{ 'is-dragging': dragIndex === index }" draggable="true" @dragstart="onDragStart(index)"
              @dragover="onDragOver($event, index)" @drop="onDrop(index)" @dragend="dragIndex = null">
              <!-- 拖曳手柄 -->
              <span class="drag-handle" title="按住拖曳排序">☰</span>

              <!-- 更名輸入框 -->
              <input type="text" :value="cat"
                @change="handleRenameCategory(cat, ($event.target as HTMLInputElement).value)"
                class="category-name-input" title="修改名稱" />

              <!-- 排序與刪除控制 -->
              <div class="category-controls">
                <button class="arrow-btn" :disabled="index === 0" @click="moveCategory(index, -1)" title="上移">
                  ▲
                </button>
                <button class="arrow-btn" :disabled="index === scriptStore.categories.length - 1"
                  @click="moveCategory(index, 1)" title="下移">
                  ▼
                </button>
                <button class="delete-btn" :disabled="scriptStore.categories.length <= 1"
                  @click="handleDeleteCategory(cat)" title="刪除分類">
                  <img src="/pic/trash.png" class="btn-icon-img-no-margin" />
                </button>
              </div>
            </div>
          </div>

          <!-- 新增分類輸入區 -->
          <div class="add-category-box">
            <input type="text" v-model="newCategoryName" placeholder="新增自訂分類名稱..." class="add-input"
              @keyup.enter="handleCreateCategory" />
            <button class="btn-gold-outline add-btn" :disabled="!newCategoryName.trim()" @click="handleCreateCategory">
              <img src="/pic/plus.png" class="btn-icon-img" />新增
            </button>
          </div>

          <div class="divider" />

          <!-- 2. 劇本歸類管理區塊 -->
          <div class="section-title">劇本快速歸類</div>

          <div class="scripts-categorize-list">
            <div v-for="script in allEditableScripts" :key="script.id" class="script-cat-item">
              <div class="script-info">
                <img src="/pic/book.png" class="script-icon-img" />
                <div class="script-details">
                  <div class="script-name">{{ script.name }}</div>
                  <div class="script-meta">{{ script.characters.length }} 個角色 | {{ script.id.startsWith('custom_') ?
                    '自訂' : '大全' }}</div>
                </div>
              </div>

              <!-- 歸類與編輯 -->
              <div class="script-cat-actions">
                <select :value="script.category || '標準劇本'"
                  @change="handleAssignScriptCategory(script, ($event.target as HTMLSelectElement).value)"
                  class="script-cat-select">
                  <option v-for="cat in scriptStore.categories" :key="cat" :value="cat">
                    {{ cat }}
                  </option>
                </select>
                
                <button 
                  v-if="script.id !== 'all_character_sort'" 
                  class="btn-edit-script" 
                  @click="startEditingScript(script)"
                  title="編輯劇本角色"
                >
                  <img src="/pic/edit.png" class="btn-icon-img-no-margin" />
                </button>

                <button 
                  class="btn-export-script" 
                  @click="exportSingleScript(script)"
                  title="匯出劇本 JSON"
                >
                <img class="icon" src="/pic/export.png" />
                </button>
                
                <button 
                  v-if="script.id !== 'all_character_sort'" 
                  class="btn-delete-script" 
                  @click="handleDeleteScript(script)"
                  title="刪除劇本"
                >
                  <img src="/pic/trash.png" class="btn-icon-img-no-margin" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 儲存中提示視窗 (Overlay Modal) -->
    <div v-if="isSaving" class="saving-overlay">
      <div class="saving-modal">
        <div class="spinner"></div>
        <div class="saving-text">劇本儲存中，請稍候...</div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useScriptStore } from '../stores/scriptStore'
import type { Script, RoleType } from '../types'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readFile } from '@tauri-apps/plugin-fs'
import { simplifyToTraditional } from '../utils/chineseConverter'

const uiStore = useUIStore()
const scriptStore = useScriptStore()

const activeTab = ref<'create' | 'categories'>('create')

const isSaving = ref(false)

// 編輯與建立劇本相關狀態
const editingScriptId = ref<string | null>(null)
const newScriptName = ref('')
const newScriptCategory = ref('縫合劇本')
const selectedRoleIds = ref<string[]>([])
const characterSearch = ref('')
const selectedEdition = ref('All')
const newScriptPhysicalImage = ref<string | null>(null)
const newScriptPhysicalImageBack = ref<string | null>(null)

const jsonFileInput = ref<HTMLInputElement | null>(null)
const imageFileInput = ref<HTMLInputElement | null>(null)
const imageFileInputBack = ref<HTMLInputElement | null>(null)
async function triggerImageUpload() {
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent)
  if (isMobile) {
    imageFileInput.value?.click()
    return
  }

  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    })
    
    if (selected) {
      const filePath = selected as string
      const fileBytes = await readFile(filePath)
      const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
      const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`
      
      let binary = ''
      const len = fileBytes.byteLength
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(fileBytes[i])
      }
      newScriptPhysicalImage.value = `data:${mimeType};base64,${btoa(binary)}`
    }
  } catch (e) {
    console.warn('Tauri open dialog failed, falling back to browser picker', e)
    imageFileInput.value?.click()
  }
}

function handleImageFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    newScriptPhysicalImage.value = event.target?.result as string
  }
  reader.readAsDataURL(file)
}

async function triggerImageUploadBack() {
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent)
  if (isMobile) {
    imageFileInputBack.value?.click()
    return
  }

  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    })
    
    if (selected) {
      const filePath = selected as string
      const fileBytes = await readFile(filePath)
      const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
      const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`
      
      let binary = ''
      const len = fileBytes.byteLength
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(fileBytes[i])
      }
      newScriptPhysicalImageBack.value = `data:${mimeType};base64,${btoa(binary)}`
    }
  } catch (e) {
    console.warn('Tauri open dialog failed, falling back to browser picker', e)
    imageFileInputBack.value?.click()
  }
}

function handleImageFileChangeBack(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    newScriptPhysicalImageBack.value = event.target?.result as string
  }
  reader.readAsDataURL(file)
}

function triggerJsonImport() {
  jsonFileInput.value?.click()
}

async function handleJsonFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (event) => {
    try {
      const content = event.target?.result as string
      const data = JSON.parse(content)

      let importedScriptName = ''
      const importedRoleIds: string[] = []
      const items: any[] = []

      // 統一將資料收集進 items 陣列中處理
      if (Array.isArray(data)) {
        items.push(...data)
      } else if (data && typeof data === 'object') {
        if (data.name) importedScriptName = simplifyToTraditional(data.name)
        if (data.physical_image) {
          newScriptPhysicalImage.value = data.physical_image
        }
        if (data.physical_image_back) {
          newScriptPhysicalImageBack.value = data.physical_image_back
        }
        if (Array.isArray(data.characters)) {
          items.push(...data.characters)
        }
        if (Array.isArray(data.jinxes)) {
          items.push(...data.jinxes)
        }
      }

      // 💡 1. 優先解析劇本 meta 資料以取得繁體化劇本名稱
      const metaItem = items.find(item => item && (item.id === '_meta' || item.id === '_meta_new'))
      if (metaItem) {
        if (metaItem.name) {
          importedScriptName = simplifyToTraditional(metaItem.name)
        }
        if (metaItem.physical_image) {
          newScriptPhysicalImage.value = metaItem.physical_image
        }
        if (metaItem.physical_image_back) {
          newScriptPhysicalImageBack.value = metaItem.physical_image_back
        }
      }

      const currentList = [...scriptStore.rawCharacterList]
      let needSaveCharacters = false

      // 💡 2. 第一階段：處理所有普通角色
      const characterItems = items.filter(item => {
        if (!item) return false
        const id = typeof item === 'string' ? item : item.id
        if (!id || id === '_meta' || id === '_meta_new') return false
        const t = (item.team || '').toLowerCase()
        return !t.includes('jinx')
      })

      characterItems.forEach(item => {
        const id = typeof item === 'string' ? item : item.id
        let matchedChar = null

        // 優先以繁體名稱進行比對
        if (item && typeof item === 'object' && item.name) {
          const tradName = simplifyToTraditional(item.name)
          matchedChar = currentList.find(c => c.name === tradName)
        }

        // ID 模糊比對
        if (!matchedChar && id) {
          const cleanImportedId = id.replace(/[-_]/g, '').toLowerCase()
          matchedChar = currentList.find(
            c => c.id.replace(/[-_]/g, '').toLowerCase() === cleanImportedId
          )
        }

        if (matchedChar) {
          importedRoleIds.push(matchedChar.id)
        } else if (item && typeof item === 'object' && item.id) {
          // 找不到匹配角色，說明是未登錄的自創角色，自動將其新增為自定義角色
          const tradName = item.name ? simplifyToTraditional(item.name) : '未命名角色'
          const cleanId = item.id.replace('button', '') // 清理 button 後綴
          const roleTypeMap: Record<string, string> = {
            'townsfolk': 'Townsfolk',
            'outsider': 'Outsider',
            'minion': 'Minion',
            'demon': 'Demon',
            'traveler': 'Traveler',
            'fabled': 'Fabled'
          }
          const t = (item.team || '').toLowerCase()
          const mappedType = roleTypeMap[t] || 'Townsfolk'

          const newChar: any = {
            id: cleanId,
            name: tradName,
            name_en: item.name_eng || cleanId,
            role_type: mappedType,
            ability: item.ability ? simplifyToTraditional(item.ability) : '',
            firstNight: item.firstNight ? Math.floor(Number(item.firstNight)) : undefined,
            otherNight: item.otherNight ? Math.floor(Number(item.otherNight)) : undefined,
            reminders: (item.reminders || []).map((r: string) => simplifyToTraditional(r)),
            setup: item.setup || false,
            image: item.image ? item.image.replace(/\\/g, '') : null,
            firstNightReminder: item.firstNightReminder ? simplifyToTraditional(item.firstNightReminder) : undefined,
            otherNightReminder: item.otherNightReminder ? simplifyToTraditional(item.otherNightReminder) : undefined,
            conflicts: [],
            is_custom: true
          }

          currentList.push(newChar)
          importedRoleIds.push(newChar.id)
          needSaveCharacters = true
        }
      })

      // 💡 3. 第二階段：處理 Jinx 相克規則
      const jinxItems = items.filter(item => {
        if (!item || typeof item !== 'object') return false
        const t = (item.team || '').toLowerCase()
        return t.includes('jinx') && item.name && item.name.includes('&')
      })

      jinxItems.forEach(item => {
        const parts = item.name.split('&')
        if (parts.length === 2) {
          const nameA = simplifyToTraditional(parts[0].trim())
          const nameB = simplifyToTraditional(parts[1].trim())

          const charA = currentList.find(c => c.name === nameA)
          const charB = currentList.find(c => c.name === nameB)

          if (charA && charB) {
            const desc = item.ability ? simplifyToTraditional(item.ability) : ''

            // 雙向新增相克規則
            if (!charA.conflicts) charA.conflicts = []
            if (!charA.conflicts.some((c: any) => (c.target || c.charB) === charB.id)) {
              charA.conflicts.push({ target: charB.id, charB: charB.id, desc })
              needSaveCharacters = true
            }

            if (!charB.conflicts) charB.conflicts = []
            if (!charB.conflicts.some((c: any) => (c.target || c.charB) === charA.id)) {
              charB.conflicts.push({ target: charA.id, charB: charA.id, desc })
              needSaveCharacters = true
            }
          }
        }
      })

      // 💡 4. 若有新增角色或修改了 conflicts，進行儲存
      if (needSaveCharacters) {
        await scriptStore.saveCharacters(currentList)
      }

      if (importedRoleIds.length === 0) {
        uiStore.showAlert('格式錯誤', '未在 JSON 中解析到有效的角色 ID，請確認檔案格式是否正確。')
        return
      }

      if (importedScriptName) {
        newScriptName.value = importedScriptName
      } else {
        let fileName = file.name
        if (fileName.toLowerCase().endsWith('.json')) {
          fileName = fileName.substring(0, fileName.length - 5)
        }
        newScriptName.value = fileName
      }

      selectedRoleIds.value = importedRoleIds
      uiStore.showAlert('匯入成功', `成功載入劇本 JSON！已自動為您勾選 ${importedRoleIds.length} 個角色。`)
    } catch (err) {
      console.error(err)
      uiStore.showAlert('解析失敗', '解析 JSON 檔案失敗，請確保是合法的 JSON 格式。')
    } finally {
      if (jsonFileInput.value) {
        jsonFileInput.value.value = ''
      }
    }
  }
  reader.readAsText(file)
}

const editionFilters = [
  { key: 'All', label: '全部' },
  { key: 'Selected', label: '已勾選' },
  { key: 'tb', label: '暗流' },
  { key: 'bmr', label: '黯月' },
  { key: 'snv', label: '夢殞' },
  { key: 'lantern', label: '華燈' },
  { key: 'mountain', label: '山雨' },
  { key: 'experimental', label: '實驗' },
  { key: 'custom', label: '自創' }
]
//暗流
const TB_ROLES = new Set([
  'washerwoman', 'librarian', 'investigator', 'chef', 'empath', 'fortune_teller',
  'undertaker', 'monk', 'ravenkeeper', 'virgin', 'slayer', 'soldier', 'mayor',
  'butler', 'drunk', 'recluse', 'saint', 'poisoner', 'spy', 'scarlet_woman', 'baron', 'imp'
])
//黯月
const BMR_ROLES = new Set([
  'grandmother', 'sailor', 'chambermaid', 'exorcist', 'innkeeper', 'gambler',
  'gossip', 'courtier', 'professor', 'minstrel', 'tea_lady', 'pacifist', 'fool',
  'tinker', 'moonchild', 'goon', 'lunatic', 'godfather', 'devils_advocate',
  'assassin', 'mastermind', 'zombuul', 'pukka', 'shabaloth', 'po'
])
//夢殞
const SNV_ROLES = new Set([
  'clockmaker', 'dreamer', 'snake_charmer', 'mathematician', 'artist', 'sage',
  'mutant', 'juggler', 'oracle', 'savant', 'seamstress', 'philosopher',
  'flowergirl', 'town_crier', 'barber', 'klutz', 'sweetheart', 'evil_twin',
  'witch', 'cerenovus', 'pit-hag', 'fang_gu', 'no_dashii', 'vortox', 'vigormortis'
])
//華燈
const LANTERN_ROLES = new Set([
  'banxian', 'bianlianshi', 'dagengren', 'dianxiaoer', 'geling', 'heshang', 'jinyiwei',
  'langzhong', 'qintianjian', 'wudaozhe', 'xizi', 'xionghaizi', 'yinyangshi', 'nichen',
  'shaxing', 'shijie', 'shusheng', 'ganshiren', 'humeiniang', 'jinweijun', 'yangguren',
  'hundun', 'qiongqi', 'taotie', 'taowu'
])
//山雨
const MOUNTAIN_ROLES = new Set([
  'bingbi',                  // 秉筆 (bingbi)
  'beloved_concubine',       // 寵妃 (chongfei -> beloved_concubine)
  'taoist_priest',           // 道士 (daoshi -> taoist_priest)
  'necromancer',             // 方士 (fangshi -> necromancer)
  'feng_shui_diviner',       // 風水師 (fengshuishi -> feng_shui_diviner)
  'tanuki',                  // 狸貓 (limao -> tanuki)
  'qianke',                  // 掮客 (qianke)
  'dyehouse_owner',          // 染坊坊主 (ranfangfangzhu -> dyehouse_owner)
  'historian',               // 史官 (shiguan -> historian)
  'punisher',                // 提刑官 (tixingguan -> punisher)
  'xizi_2',                // 戲子 (xizi_new)
  'toxic',                   // 鴆 (toxic)
  'patrol',                  // 巡察 (xuncha -> patrol)
  'puppeteer',               // 偃師 (yanshi -> puppeteer)
  'postal_transmission',     // 驛使 (yishi -> postal_transmission)
  'yinluren',                // 引路人 (yinluren)
  'figurine_artisan',        // 俑匠 (yongjiang -> figurine_artisan)
  'prefectural_magistrate',  // 知府 (zhifu -> prefectural_magistrate)
  'Bartender',               // 酒保 (jiubao -> Bartender)
  'rulianshi',               // 入殮師 (rulianshi)
  'boy_attendant',           // 書童 (shutong -> boy_attendant)
  'gudiao',                  // 蠱雕 (gudiao)
  'disguise',                // 畫皮 (huapi -> disguise)
  'jinweijun2',              // 禁衛軍Ⅱ (jinweijun2)
  'meng_po',                 // 孟婆 (mengpo -> meng_po)
  'niangjiushi',             // 釀酒師 (niangjiushi)
  'tyrant',                  // 暴君 (baojun -> tyrant)
  'dianyuzhang',             // 典獄長 (dianyuzhang)
  'Ubume',                   // 姑獲鳥 (guhuoniao -> Ubume)
  'jianning',                // 奸佞 (jianning)
  'yamaraja'                 // 閻羅 (yanluo -> Yamaraja)
])
//實驗
const EXP_ROLES = new Set([
  'lycanthrope', 'banshee', 'choirboy', 'preacher', 'village_idiot', 'engineer', 'princess',
  'noble', 'king', 'general', 'alchemist', 'magician', 'farmer', 'high_priestess', 'knight',
  'balloonist', 'bounty_hunter', 'amnesiac', 'cannibal', 'steward', 'nightwatchman', 'atheist',
  'alsaahir', 'pixie', 'shugenja', 'huntsman', 'cult_leader', 'poppy_grower', 'fisherman',
  'acrobat', 'snitch', 'puzzlemaster', 'zealot', 'damsel', 'hatter', 'golem', 'ogre',
  'plague_doctor', 'heretic', 'hermit', 'politician', 'goblin', 'widow', 'organ_grinder',
  'psychopath', 'boffin', 'fearmonger', 'mezepheles', 'marionette', 'wraith', 'vizier',
  'wizard', 'xaan', 'harpy', 'boomdandy', 'summoner', 'ojo', 'riot', 'lord_of_typhon',
  'al-hadikhia', 'legion', 'kazali', 'leviathan', 'lleech', 'lil_monsta', 'yaggababble'
])

//自創角色 ID 計算屬性
// const customRoleIds = computed(() => {
//   const ids = new Set<string>([...CUSTOM_ROLES_PRESET])
//   scriptStore.customScripts.forEach(s => {
//     s.characters.forEach(c => ids.add(c.id))
//   })
//   return ids
// })

// 分類管理相關狀態
const newCategoryName = ref('')
const dragIndex = ref<number | null>(null)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  // 如果已經載入分類，將分類預設為第一個
  if (scriptStore.categories.length > 0) {
    newScriptCategory.value = scriptStore.categories[0]
  }
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

// 一行排版的角色類型統計 (Pills) 計算屬性
const roleStats = computed(() => {
  const masterList = scriptStore.masterScript.characters
  const edition = selectedEdition.value

  const types: { key: RoleType; label: string; color: string }[] = [
    { key: 'Townsfolk', label: '鎮民', color: 'var(--color-townsfolk)' },
    { key: 'Outsider', label: '外來者', color: 'var(--color-outsider)' },
    { key: 'Minion', label: '爪牙', color: 'var(--color-minion)' },
    { key: 'Demon', label: '惡魔', color: 'var(--color-demon)' }
  ]

  return types.map(t => {
    const selectedCount = selectedRoleIds.value.filter(id => {
      const char = masterList.find(c => c.id === id)
      return char && char.role_type === t.key
    }).length

    const totalCount = masterList.filter(c => {
      if (c.role_type !== t.key) return false

      let matchesEdition = true
      if (edition === 'Selected') {
        matchesEdition = selectedRoleIds.value.includes(c.id)
      } else if (edition === 'tb') {
        matchesEdition = TB_ROLES.has(c.id)
      } else if (edition === 'bmr') {
        matchesEdition = BMR_ROLES.has(c.id)
      } else if (edition === 'snv') {
        matchesEdition = SNV_ROLES.has(c.id)
      } else if (edition === 'lantern') {
        matchesEdition = LANTERN_ROLES.has(c.id)
      } else if (edition === 'mountain') {
        matchesEdition = MOUNTAIN_ROLES.has(c.id)
      } else if (edition === 'experimental') {
        matchesEdition = EXP_ROLES.has(c.id)
      } else if (edition === 'custom') {
        matchesEdition = !TB_ROLES.has(c.id) &&
          !BMR_ROLES.has(c.id) &&
          !SNV_ROLES.has(c.id) &&
          !LANTERN_ROLES.has(c.id) &&
          !MOUNTAIN_ROLES.has(c.id) &&
          !EXP_ROLES.has(c.id)
      }
      return matchesEdition
    }).length

    return {
      ...t,
      selectedCount,
      totalCount
    }
  })
})

function scrollToRoleGroup(key: string) {
  const el = document.getElementById('editor-group-' + key)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 取得所有可以被編輯或歸類的劇本 (包含核心大全與所有自訂劇本)
const allEditableScripts = computed(() => {
  return scriptStore.allScripts
})

// 點選角色 checkbox 切換
function toggleRole(id: string) {
  const idx = selectedRoleIds.value.indexOf(id)
  if (idx > -1) {
    selectedRoleIds.value.splice(idx, 1)
  } else {
    selectedRoleIds.value.push(id)
  }
}

// 快速全選當前過濾出來的所有角色
function selectAllFilteredRoles() {
  const currentFilteredIds = filteredGroups.value.flatMap(g => g.list.map(c => c.id))
  currentFilteredIds.forEach(id => {
    if (!selectedRoleIds.value.includes(id)) {
      selectedRoleIds.value.push(id)
    }
  })
}

// 快速清除當前過濾出來的所有角色
function clearAllFilteredRoles() {
  const currentFilteredIds = filteredGroups.value.flatMap(g => g.list.map(c => c.id))
  selectedRoleIds.value = selectedRoleIds.value.filter(id => !currentFilteredIds.includes(id))
}

// 篩選後的分組角色列表 (支援搜尋與版本過濾)
const filteredGroups = computed(() => {
  const search = characterSearch.value.trim().toLowerCase()
  const masterList = scriptStore.masterScript.characters
  const edition = selectedEdition.value

  const groupsConfig: { key: RoleType; label: string; color: string }[] = [
    { key: 'Townsfolk', label: '鎮民 (Townsfolk)', color: 'var(--color-townsfolk)' },
    { key: 'Outsider', label: '外來者 (Outsider)', color: 'var(--color-outsider)' },
    { key: 'Minion', label: '爪牙 (Minion)', color: 'var(--color-minion)' },
    { key: 'Demon', label: '惡魔 (Demon)', color: 'var(--color-demon)' },
    { key: 'Traveler', label: '旅行者 (Traveler)', color: 'var(--color-traveler)' },
    { key: 'Fabled', label: '傳奇 (Fabled)', color: '#dca938' },
    { key: 'Loric', label: '奇遇 (Loric)', color: '#3c9438' }
  ]

  return groupsConfig.map(group => {
    const list = masterList.filter(c => {
      const isCorrectType = c.role_type === group.key

      // 劇本版本過濾
      let matchesEdition = true
      if (edition === 'Selected') {
        matchesEdition = selectedRoleIds.value.includes(c.id)
      } else if (edition === 'tb') {
        matchesEdition = TB_ROLES.has(c.id)
      } else if (edition === 'bmr') {
        matchesEdition = BMR_ROLES.has(c.id)
      } else if (edition === 'snv') {
        matchesEdition = SNV_ROLES.has(c.id)
      } else if (edition === 'lantern') {
        matchesEdition = LANTERN_ROLES.has(c.id)
      } else if (edition === 'mountain') {
        matchesEdition = MOUNTAIN_ROLES.has(c.id)
      } else if (edition === 'experimental') {
        matchesEdition = EXP_ROLES.has(c.id)
      } else if (edition === 'custom') {
        // 不屬於 any 官方三大、國風劇本，且不屬於實驗劇本的角色
        matchesEdition = !TB_ROLES.has(c.id) &&
          !BMR_ROLES.has(c.id) &&
          !SNV_ROLES.has(c.id) &&
          !LANTERN_ROLES.has(c.id) &&
          !MOUNTAIN_ROLES.has(c.id) &&
          !EXP_ROLES.has(c.id)
      }

      const matchesSearch = !search ||
        c.name.toLowerCase().includes(search) ||
        c.name_en.toLowerCase().includes(search) ||
        c.ability.toLowerCase().includes(search)
      return isCorrectType && matchesEdition && matchesSearch
    })
    return {
      ...group,
      list
    }
  }).filter(group => group.list.length > 0)
})

// 建立劇本處理
async function handleCreateScript() {
  if (!newScriptName.value.trim()) return
  if (selectedRoleIds.value.length === 0) return

  // 取得完整角色物件
  const characters = scriptStore.masterScript.characters.filter(c =>
    selectedRoleIds.value.includes(c.id)
  )

  isSaving.value = true
  try {
    const newScript = await scriptStore.createCustomScript(
      newScriptName.value.trim(),
      characters,
      newScriptCategory.value,
      newScriptPhysicalImage.value,
      newScriptPhysicalImageBack.value
    )

    // 預設將當前載入劇本切換為這個新建立的劇本
    await scriptStore.selectScript(newScript)

    uiStore.showAlert('建立成功', `劇本「${newScriptName.value}」建立成功，並已為您切換至此劇本！`)

    // 重設狀態
    newScriptName.value = ''
    selectedRoleIds.value = []
    newScriptPhysicalImage.value = null
    newScriptPhysicalImageBack.value = null
    activeTab.value = 'categories' // 切換到管理分類查看
  } catch (err) {
    console.error('建立劇本失敗:', err)
    uiStore.showAlert('建立失敗', '建立劇本失敗，請確認資料是否正常。')
  } finally {
    isSaving.value = false
  }
}

function startEditingScript(script: Script) {
  editingScriptId.value = script.id
  newScriptName.value = script.name
  newScriptCategory.value = script.category || '標準劇本'
  newScriptPhysicalImage.value = script.physical_image || null
  newScriptPhysicalImageBack.value = script.physical_image_back || null
  selectedRoleIds.value = script.characters.map(c => c.id)
  activeTab.value = 'create'
}

function cancelEditingScript() {
  editingScriptId.value = null
  newScriptName.value = ''
  selectedRoleIds.value = []
  newScriptPhysicalImage.value = null
  newScriptPhysicalImageBack.value = null
  if (scriptStore.categories.length > 0) {
    newScriptCategory.value = scriptStore.categories[0]
  }
}

async function handleUpdateScript() {
  if (!editingScriptId.value || !newScriptName.value.trim() || selectedRoleIds.value.length === 0) return
  
  const characters = scriptStore.masterScript.characters.filter(c =>
    selectedRoleIds.value.includes(c.id)
  )
  
  isSaving.value = true
  try {
    const success = await scriptStore.updateCustomScript(
      editingScriptId.value,
      newScriptName.value.trim(),
      characters,
      newScriptCategory.value,
      newScriptPhysicalImage.value,
      newScriptPhysicalImageBack.value
    )
    
    if (success) {
      uiStore.showAlert('更新成功', `劇本「${newScriptName.value}」更新成功！`)
      cancelEditingScript()
      activeTab.value = 'categories'
    } else {
      uiStore.showAlert('更新失敗', '更新劇本失敗：找不到該劇本。')
    }
  } catch (err) {
    console.error('更新劇本失敗:', err)
    uiStore.showAlert('更新失敗', '更新劇本失敗，請確認資料是否正常。')
  } finally {
    isSaving.value = false
  }
}

function handleDeleteScript(script: Script) {
  uiStore.showConfirm(
    '刪除劇本',
    `確認要刪除自訂劇本「${script.name}」嗎？此操作無法復原。`,
    async () => {
      try {
        const success = await scriptStore.deleteCustomScript(script.id)
        if (success) {
          uiStore.showAlert('刪除成功', `劇本「${script.name}」已成功刪除！`)
          if (editingScriptId.value === script.id) {
            cancelEditingScript()
          }
        } else {
          uiStore.showAlert('刪除失敗', '刪除劇本失敗：找不到該劇本。')
        }
      } catch (err) {
        console.error('刪除劇本失敗:', err)
        uiStore.showAlert('刪除失敗', '刪除劇本失敗，請確認系統是否正常。')
      }
    },
    true
  )
}

async function exportSingleScript(script: Script) {
  const exportData = []
  const meta: any = {
    id: "_meta",
    name: script.name
  }
  if (script.author) meta.author = script.author
  if (script.logo) meta.logo = script.logo
  // 💡 匯出時一併帶上正面與背面實體大圖
  if (script.physical_image) meta.physical_image = script.physical_image
  if (script.physical_image_back) meta.physical_image_back = script.physical_image_back
  
  exportData.push(meta)

  script.characters.forEach(c => {
    exportData.push({
      id: c.id,
      name: c.name,
      name_en: c.name_en,
      ability: c.ability,
      team: c.role_type.toLowerCase(),
      firstNight: c.night_order_first,
      otherNight: c.night_order_other,
      reminders: c.reminders,
      image: c.image
    })
  })

  const json = JSON.stringify(exportData, null, 2)
  const fileName = `${script.name}.json`

  try {
    const filePath = await save({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      defaultPath: fileName
    })

    if (filePath) {
      await writeTextFile(filePath, json)
      uiStore.showAlert('匯出成功', `劇本「${script.name}」已成功匯出至：${filePath}`)
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

// 建立新類別
function handleCreateCategory() {
  const val = newCategoryName.value.trim()
  if (!val) return
  if (scriptStore.categories.includes(val)) {
    uiStore.showAlert('已存在', '該類別已經存在！')
    return
  }
  scriptStore.addCategory(val)
  newCategoryName.value = ''
}

// 刪除分類
function handleDeleteCategory(name: string) {
  if (scriptStore.categories.length <= 1) {
    uiStore.showAlert('無法刪除', '必須保留至少一個分類！')
    return
  }
  uiStore.showConfirm(
    '刪除類別',
    `確認要刪除類別「${name}」嗎？屬於該類別的劇本將被歸類到預設分類中。`,
    () => {
      scriptStore.deleteCategory(name)
    },
    true
  )
}

// 分類更名
function handleRenameCategory(oldName: string, newName: string) {
  const val = newName.trim()
  if (!val) return
  if (val === oldName) return
  if (scriptStore.categories.includes(val)) {
    uiStore.showAlert('名稱重複', '該名稱已存在！')
    return
  }
  scriptStore.updateCategory(oldName, val)
}

// 劇本指派分類
async function handleAssignScriptCategory(script: Script, category: string) {
  try {
    await scriptStore.renameScript(script.id, script.name, category)
  } catch (err) {
    console.error('歸類失敗:', err)
    uiStore.showAlert('歸類失敗', '劇本歸類失敗')
  }
}

// 原生 Drag and Drop 排序邏輯
function onDragStart(index: number) {
  dragIndex.value = index
}

function onDragOver(e: DragEvent, _index: number) {
  e.preventDefault()
}

function onDrop(index: number) {
  if (dragIndex.value !== null && dragIndex.value !== index) {
    const list = [...scriptStore.categories]
    const [dragged] = list.splice(dragIndex.value, 1)
    list.splice(index, 0, dragged)
    scriptStore.categories = list
    scriptStore.saveCategories()
  }
  dragIndex.value = null
}

// 輔助排序按鈕：上移或下移
function moveCategory(index: number, direction: number) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= scriptStore.categories.length) return

  const list = [...scriptStore.categories]
  const temp = list[index]
  list[index] = list[newIndex]
  list[newIndex] = temp

  scriptStore.categories = list
  scriptStore.saveCategories()
}

</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 150;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 0 8px;
}

.editor-panel {
  width: 100%;
  max-width: 440px;
  height: 95vh;
  /* 固定高度，防止分頁切換時面板高度抖動 */
  display: flex;
  flex-direction: column;
  border-radius: 20px 20px 12px 12px;
  overflow: hidden;
  background: var(--color-bg-surface);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(201, 168, 76, 0.1);
  flex-shrink: 0;
}

.panel-icon {
  font-size: 18px;
}

.panel-title {
  font-family: var(--font-title);
  font-size: 16px;
  color: var(--color-gold);
  flex: 1;
  margin: 0;
  line-height: 1.2;
}

.close-btn {
  color: var(--color-text-muted);
  font-size: 16px;
  background: none;
  padding: 4px 8px;
  border: none;
  cursor: pointer;
}

.panel-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  padding: 12px 6px;
  font-size: 13px;
  font-weight: bold;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tab-btn.active {
  color: var(--color-gold);
  background: rgba(255, 255, 255, 0.03);
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: var(--color-gold);
  border-radius: 2px;
}

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.tab-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
  margin: 8px 16px;
}

/* 建立劇本表單 */
.form-section {
  padding: 14px 16px 4px;
  display: flex;
  gap: 8px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 11px;
  font-weight: bold;
  color: var(--color-text-muted);
  letter-spacing: 0.5px;
}

.form-input,
.form-select {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 10px;
  color: var(--color-text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus {
  border-color: var(--color-gold);
}

/* 搜尋與快捷工具列 */
.toolbar-section {
  padding: 4px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-box {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 6px 32px 6px 12px;
  color: var(--color-text-primary);
  font-size: 12px;
  outline: none;
}

.search-input:focus {
  border-color: rgba(201, 168, 76, 0.5);
  background: rgba(255, 255, 255, 0.05);
}

.clear-search-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 11px;
}

.search-and-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.search-box {
  flex: 1;
}

.batch-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn-mini {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--color-text-primary);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 3px;
}

.action-btn-mini.success:active {
  background: rgba(40, 167, 69, 0.15);
  border-color: #28a745;
}

.action-btn-mini.danger:active {
  background: rgba(220, 53, 69, 0.15);
  border-color: #dc3545;
}

.edition-scroll-wrapper {
  width: auto;
  margin: 0 -16px;
  padding: 0 16px 6px;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(201, 168, 76, 0.3) transparent;
}

.edition-scroll-wrapper::-webkit-scrollbar {
  height: 4px;
  display: block;
}

.edition-scroll-wrapper::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 2px;
}

.edition-scroll-wrapper::-webkit-scrollbar-thumb {
  background: rgba(201, 168, 76, 0.3);
  border-radius: 2px;
  transition: background 0.2s;
}

.edition-scroll-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(201, 168, 76, 0.6);
}

.edition-filters-row {
  display: flex;
  gap: 6px;
  padding: 2px 0;
  min-width: max-content;
}

.filter-pill-new {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--color-text-muted);
  border-radius: 12px;
  padding: 4px 10px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-pill-new:hover {
  border-color: rgba(255, 255, 255, 0.15);
  color: var(--color-text-primary);
}

.filter-pill-new.active {
  background: rgba(201, 168, 76, 0.15);
  color: var(--color-gold);
  border-color: var(--color-gold);
}

.selected-counter {
  font-size: 12px;
  color: var(--color-text-muted);
  padding: 4px 16px;
  font-weight: 500;
}

.selected-counter span {
  color: var(--color-gold);
  font-weight: bold;
}

/* 角色池展示 */
.role-selection-area {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
  min-height: 0;
  /* 允許 flex 項目在彈性容器中正確收縮 */
}

.role-group {
  margin-top: 14px;
}

.group-title {
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding-left: 2px;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.role-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 4px;
  gap: 6px;
  position: relative;
  transition: all 0.2s;
  cursor: pointer;
}

.role-item:active {
  transform: scale(0.94);
}

.role-item.is-selected {
  border-color: var(--color-gold);
  background: rgba(201, 168, 76, 0.12);
}

.role-icon {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 50%;
}

.role-icon img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.emoji {
  font-size: 20px;
}

.role-name {
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.role-check {
  position: absolute;
  top: -3px;
  right: -3px;
  background: var(--color-gold);
  color: black;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.role-item.townsfolk {
  border-top: 3px solid var(--color-townsfolk);
}

.role-item.outsider {
  border-top: 3px solid var(--color-outsider);
}

.role-item.minion {
  border-top: 3px solid var(--color-minion);
}

.role-item.demon {
  border-top: 3px solid var(--color-demon);
}

.role-item.traveler {
  border-top: 3px solid var(--color-traveler);
}

.role-item.fabled {
  border-top: 3px solid #dca938;
}

.role-item.loric {
  border-top: 3px solid #3c9438;
}

.form-actions {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.create-btn {
  width: 100%;
  padding: 10px;
  font-weight: bold;
  border-radius: 10px;
}

/* 劇本分類管理 */
.section-title {
  padding: 12px 16px 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.categories-list {
  padding: 4px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 28vh;
  overflow-y: auto;
}

.category-item {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 6px 10px;
  gap: 10px;
  transition: all 0.2s;
}

.category-item.is-dragging {
  opacity: 0.5;
  border-style: dashed;
  border-color: var(--color-gold);
}

.drag-handle {
  cursor: grab;
  color: var(--color-text-muted);
  font-size: 16px;
  user-select: none;
}

.category-name-input {
  flex: 1;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 4px 6px;
  color: var(--color-text-primary);
  font-size: 13px;
  outline: none;
  font-weight: 600;
  transition: all 0.2s;
}

.category-name-input:focus {
  border-color: rgba(201, 168, 76, 0.3);
  background: rgba(0, 0, 0, 0.2);
}

.category-controls {
  display: flex;
  gap: 4px;
  align-items: center;
}

.arrow-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--color-text-muted);
  font-size: 9px;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.category-controls .delete-btn {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.2);
  color: #ff8a80;
  font-size: 12px;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-controls .delete-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 新增分類 */
.add-category-box {
  display: flex;
  padding: 10px 16px;
  gap: 10px;
}

.add-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 10px;
  color: var(--color-text-primary);
  font-size: 12px;
  outline: none;
}

.add-input:focus {
  border-color: var(--color-gold);
}

.add-btn {
  padding: 8px 16px;
  font-size: 12px;
  font-weight: bold;
}

/* 劇本列表歸類 */
.scripts-categorize-list {
  padding: 4px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 32vh;
  overflow-y: auto;
}

.script-cat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.script-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.script-icon {
  font-size: 18px;
}

.script-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.script-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.script-meta {
  font-size: 10px;
  color: var(--color-text-muted);
}

.script-cat-select {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 4px 8px;
  color: var(--color-text-primary);
  font-size: 12px;
  outline: none;
  width: 120px;
}

.script-cat-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-edit-script {
  background: rgba(201, 168, 76, 0.1);
  border: 1px solid rgba(201, 168, 76, 0.3);
  color: var(--color-gold);
  border-radius: 6px;
  padding: 4px 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 25.6px;
  width: 25.6px;
}

.btn-edit-script:hover {
  background: rgba(201, 168, 76, 0.25);
}

.btn-delete-script {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  color: #ff4d4f;
  border-radius: 6px;
  padding: 4px 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 25.6px;
  width: 25.6px;
}

.btn-delete-script:hover {
  background: rgba(220, 53, 69, 0.25);
}

.btn-export-script {
  background: rgba(40, 167, 69, 0.1);
  border: 1px solid rgba(40, 167, 69, 0.3);
  color: #28a745;
  border-radius: 6px;
  padding: 4px 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 25.6px;
  width: 25.6px;
}

.btn-export-script:hover {
  background: rgba(40, 167, 69, 0.25);
}

.btn-export-script img.icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
}

.cancel-edit-btn {
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  background: rgba(255, 255, 255, 0.05) !important;
  color: var(--color-text-muted) !important;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-edit-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

.import-json-btn {
  background: transparent;
  border: 1px solid var(--color-gold);
  color: var(--color-gold);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  outline: none;
  transition: all 0.2s;
  height: 35.6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.import-json-btn:hover {
  background: rgba(201, 168, 76, 0.1);
}

.import-json-btn:active {
  transform: scale(0.95);
}

/* 一行排版統計膠囊列 */
.role-stats-row {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  padding: 4px 16px 10px;
  flex-shrink: 0;
  width: 100%;
}

.stat-pill {
  flex: 1;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid;
  border-radius: 20px;
  padding: 5px 2px;
  font-size: 10.5px;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.stat-pill:hover {
  background: rgba(255, 255, 255, 0.05);
}

.stat-pill:active {
  transform: scale(0.95);
}

.stat-icon {
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 確保圖片容器內部完美水平置中 */
}

.stat-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  display: block;
}
.role-text-fallback {
  font-size: 20px;
  font-weight: 900;
  font-family: 'ChineseFont', var(--font-title), sans-serif;
  color: currentColor;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  user-select: none;
}
.role-item.townsfolk .role-text-fallback { color: var(--color-townsfolk); }
.role-item.outsider .role-text-fallback { color: var(--color-outsider); }
.role-item.minion .role-text-fallback { color: var(--color-minion); }
.role-item.demon .role-text-fallback { color: var(--color-demon); }
.role-item.traveler .role-text-fallback { color: var(--color-traveler); }
.role-item.fabled .role-text-fallback { color: #dca938; }
.role-item.loric .role-text-fallback { color: #3c9438; }

.btn-icon-img {
  width: 14px;
  height: 14px;
  object-fit: contain;
  vertical-align: middle;
  margin-right: 4px;
}
.btn-icon-img-no-margin {
  width: 14px;
  height: 14px;
  object-fit: contain;
  vertical-align: middle;
}
.tab-btn .btn-icon-img {
  width: 16px;
  height: 16px;
}
.upload-icon-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}
.script-icon-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  vertical-align: middle;
}

.saving-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.saving-modal {
  background: rgba(30, 30, 30, 0.85);
  border: 1px solid rgba(201, 168, 76, 0.25);
  border-radius: 16px;
  padding: 32px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(201, 168, 76, 0.1);
  border-top-color: var(--color-gold);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.saving-text {
  color: var(--color-gold);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
