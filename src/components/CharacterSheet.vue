<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="character-sheet-panel panel animate-slide-up">
      <div class="panel-header">
        <span class="panel-icon">📜</span>
        <h2 class="panel-title">角色清單</h2>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <!-- 搜索與篩選 -->
      <div class="search-bar">
        <input 
          v-model="scriptStore.searchQuery" 
          placeholder="搜索角色名稱或能力..." 
          class="search-input"
          @keyup.enter="($event.target as HTMLInputElement).blur()"
        />
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
        <div class="filter-row">
          <div class="filter-tabs">
            <button 
              v-for="type in filterOptions" 
              :key="type.value"
              class="filter-tag"
              :class="{ active: scriptStore.filterType === type.value }"
              @click="scriptStore.filterType = type.value"
            >
              {{ type.label }}
            </button>
          </div>
          <button 
            class="pool-toggle-btn" 
            :class="{ 'is-active': showAllRoles }" 
            @click="showAllRoles = !showAllRoles"
            title="切換顯示全部劇本或僅限本局角色池"
          >
            {{ showAllRoles ? '☑️ 全部劇本' : '◻️ 僅限池內' }}
          </button>
        </div>
      </div>

      <!-- 角色列表 -->
      <div class="character-list">
        <div v-if="characters.length === 0" class="empty-state">
          未找到符合條目的角色
        </div>

        <div 
          v-for="char in characters" 
          :key="char.id" 
          class="character-card"
          :class="char.role_type.toLowerCase()"
        >
          <div class="card-header">
            <div class="char-icon">
              <img v-if="char.image" :src="char.image" :alt="char.name" />
              <span v-else class="role-text-fallback">{{ char.name.charAt(0) }}</span>
            </div>
            <div class="char-meta">
              <div class="char-name-row">
                <span class="char-name">{{ char.name }}</span>
                <span class="char-name-en">{{ char.name_en }}</span>
              </div>
              <div class="char-type">{{ getRoleLabel(char.role_type) }}</div>
            </div>
            <div v-if="char.setup" class="setup-badge" title="此角色涉及設置修改">⚙️ 設置</div>
          </div>
          <div class="card-body">
            <p class="char-ability">{{ char.ability }}</p>
            <div v-if="char.conflicts && char.conflicts.length > 0" class="char-conflicts">
              <div v-for="(rule, idx) in char.conflicts" :key="idx" class="conflict-item">
                <div class="conflict-badge">⚔️ vs {{ getCharacterName(rule.target || rule.charB) }}</div>
                <div v-if="rule.desc" class="conflict-desc">{{ rule.desc }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useScriptStore } from '../stores/scriptStore'
import { ROLE_TYPE_LABEL, type RoleType } from '../types'

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
    uiStore.closePanel()
  }
}

const showAllRoles = ref(false)
const selectedClass = ref('')

const characters = computed(() => {
  let all = scriptStore.filteredCharacters
  
  if (selectedClass.value) {
    all = all.filter(c => {
      let cClass = c.class
      if (!cClass) {
        const rawChar = scriptStore.rawCharacterList.find(rc => rc.id === c.id)
        cClass = rawChar?.class || ''
      }
      return cClass === selectedClass.value
    })
  }

  if (showAllRoles.value) return all
  
  const excluded = new Set(uiStore.excludedPoolIds)
  return all.filter(c => !excluded.has(c.id))
})

const filterOptions: { label: string, value: RoleType | 'All' }[] = [
  { label: '全部', value: 'All' },
  { label: '鎮民', value: 'Townsfolk' },
  { label: '外來者', value: 'Outsider' },
  { label: '爪牙', value: 'Minion' },
  { label: '惡魔', value: 'Demon' },
  { label: '旅行者', value: 'Traveler' },
]

function getRoleLabel(type: RoleType) {
  return ROLE_TYPE_LABEL[type] || type
}


function getCharacterName(id?: string) {
  if (!id) return '未知'
  const char = scriptStore.rawCharacterList.find(c => c.id === id)
  return char ? char.name : id
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

.character-sheet-panel {
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
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

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--color-text-muted);
}

.search-bar {
  padding: 12px 16px;
  background: rgba(0,0,0,0.1);
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(201,168,76,0.2);
  border-radius: 10px;
  color: white;
  margin-bottom: 8px;
  outline: none;
}

.class-filter-container {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 12px;
  scrollbar-width: none;
}

.class-filter-container::-webkit-scrollbar {
  display: none;
}

.class-filter-pill {
  white-space: nowrap;
  padding: 3px 10px;
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

.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.filter-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  flex: 1;
}

.pool-toggle-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.2);
  color: var(--color-text-muted);
  border-radius: 14px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  flex-shrink: 0;
}

.pool-toggle-btn.is-active {
  background: rgba(201,168,76,0.15);
  border-color: var(--color-gold);
  color: var(--color-gold);
}

.filter-tag {
  white-space: nowrap;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 11px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--color-text-muted);
  cursor: pointer;
}

.filter-tag.active {
  background: var(--color-gold-muted);
  color: black;
  border-color: var(--color-gold);
}

.character-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.character-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  border-left-width: 4px;
}

.character-card.townsfolk { border-left-color: var(--color-townsfolk); }
.character-card.outsider  { border-left-color: var(--color-outsider); }
.character-card.minion    { border-left-color: var(--color-minion); }
.character-card.demon     { border-left-color: var(--color-demon); }
.character-card.traveler  { border-left-color: var(--color-traveler); }

.card-header {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  align-items: center;
}

.char-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.char-icon img { width: 32px; height: 32px; object-fit: contain; }
.emoji { font-size: 20px; }

.char-meta { flex: 1; }
.char-name-row { display: flex; align-items: baseline; gap: 8px; }
.char-name { font-weight: 700; font-size: 15px; color: white; }
.char-name-en { font-size: 10px; color: var(--color-text-muted); }
.char-type { font-size: 11px; margin-top: 2px; }

.setup-badge {
  font-size: 10px;
  color: var(--color-gold-bright);
  background: rgba(201,168,76,0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.card-body {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.char-conflicts {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.conflict-item {
  background: rgba(229, 115, 115, 0.05);
  border: 1px solid rgba(229, 115, 115, 0.15);
  border-radius: 8px;
  padding: 6px 10px;
}

.conflict-badge {
  font-size: 11px;
  color: #e57373;
  font-weight: 700;
  margin-bottom: 2px;
}

.conflict-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.4;
  font-style: italic;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--color-text-muted);
  font-style: italic;
}
.role-text-fallback {
  font-size: 20px;
  font-weight: 900;
  font-family: 'ChineseFont', var(--font-title), sans-serif;
  color: currentColor;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  user-select: none;
}
.character-card.townsfolk .role-text-fallback { color: var(--color-townsfolk); }
.character-card.outsider .role-text-fallback { color: var(--color-outsider); }
.character-card.minion .role-text-fallback { color: var(--color-minion); }
.character-card.demon .role-text-fallback { color: var(--color-demon); }
.character-card.traveler .role-text-fallback { color: var(--color-traveler); }
</style>
