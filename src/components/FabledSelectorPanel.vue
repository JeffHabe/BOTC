<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="fabled-panel panel animate-slide-up">
      <div class="panel-header">
        <!-- <span class="panel-icon">🎭</span> -->
        <span class="stat-icon">
            <img src="/pic/mask.png" alt="有效票數" class="stat-img img-mask" />
            </span>
        <h2 class="panel-title">傳說角色設定</h2>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <div class="panel-body">
        <div class="role-grid" v-if="fabledCharacters.length > 0">
          <button 
            v-for="char in fabledCharacters" 
            :key="char.id" 
            class="role-item" 
            :class="[char.role_type.toLowerCase(), { 'is-selected': isFabledActive(char.id) }]"
            @click="toggleFabled(char.id)"
            @touchstart="handlePressStart(char)"
            @touchend="handlePressEnd"
            @mousedown="handlePressStart(char)"
            @mouseup="handlePressEnd"
          >
            <div class="role-icon">
              <img v-if="char.image" :src="char.image" :alt="char.name" />
              <span v-else class="emoji">🦄</span>
            </div>
            <div class="role-name">{{ char.name }}</div>
            <div class="role-check" v-if="isFabledActive(char.id)">✓</div>
          </button>
        </div>
        
        <div v-if="fabledCharacters.length === 0" class="empty-state">
          尚未在全域角色庫中找到傳說角色。
        </div>
      </div>
    </div>
    <!-- 角色詳情彈窗 -->
    <CharacterDetailOverlay 
      v-if="longPressChar" 
      :character="longPressChar" 
      @close="longPressChar = null" 
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { useScriptStore } from '../stores/scriptStore'
import type { CharacterDef } from '../types'
import CharacterDetailOverlay from './CharacterDetailOverlay.vue'

const uiStore = useUIStore()
const gameStore = useGameStore()
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
    if (longPressChar.value) {
      longPressChar.value = null
    } else {
      uiStore.closePanel()
    }
  }
}

// 從全庫中取得傳說與奇遇角色
const fabledCharacters = computed(() => {
  return scriptStore.masterScript.characters.filter(
    c => c.role_type === 'Fabled' || c.role_type === 'Loric'
  )
})

function isFabledActive(id: string) {
  return gameStore.activeFabled.includes(id)
}

function toggleFabled(id: string) {
  gameStore.toggleFabled(id)
}

// 顯示詳情邏輯
const longPressChar = ref<CharacterDef | null>(null)
let pressTimer: any = null

function handlePressStart(char: CharacterDef) {
  clearTimeout(pressTimer)
  pressTimer = setTimeout(() => {
    longPressChar.value = char
  }, 500)
}

function handlePressEnd() {
  clearTimeout(pressTimer)
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

.fabled-panel {
  width: 100%;
  max-width: 440px;
  max-height: 85vh;
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
  border-bottom: 1px solid rgba(201,168,76,0.1);
  flex-shrink: 0;
}

.panel-icon { font-size: 18px; }

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

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}


.role-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;
}

.role-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 10px 4px;
  gap: 6px;
  position: relative;
  transition: all 0.2s;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.role-item:active { transform: scale(0.92); background: rgba(255,255,255,0.08); }

.role-item.is-selected {
  border-color: var(--color-gold);
  background: rgba(201, 168, 76, 0.15);
}

.role-icon { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); border-radius: 50%; }
.role-icon img { width: 36px; height: 36px; object-fit: contain; }
.emoji { font-size: 24px; }

.role-name { font-size: 11px; font-weight: 600; text-align: center; color: var(--color-text-primary); }

.role-item.fabled { border-top: 3px solid #d4a840; }
.role-item.loric { border-top: 3px solid var(--color-loric, #ff8c00); }

.role-check {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--color-gold);
  color: black;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.empty-state {
  padding: 32px 16px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}

.stat-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.img-mask {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}
</style>
