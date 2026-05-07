<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="fabled-panel panel animate-slide-up">
      <div class="panel-header">
        <span class="panel-icon">🎭</span>
        <h2 class="panel-title">傳說角色設定</h2>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <div class="panel-body">
        <div class="fabled-list">
          <div 
            v-for="char in fabledCharacters" 
            :key="char.id" 
            class="fabled-item" 
            :class="{ active: isFabledActive(char.id) }"
            @click="toggleFabled(char.id)"
          >
            <div class="char-logo">
              <img v-if="char.image" :src="char.image" class="char-img" />
              <span v-else>❓</span>
            </div>
            <div class="char-info">
              <div class="char-name">
                {{ char.name }}
              </div>
              <div class="char-ability">{{ char.ability }}</div>
            </div>
            
            <button class="view-btn" @click.stop="showDetails(char)" title="檢視詳細內容">
              <span class="icon">ℹ️</span>
            </button>
            
            <div class="toggle-btn">
              <div class="toggle-track" :class="{ 'track-active': isFabledActive(char.id) }">
                <div class="toggle-thumb" :class="{ 'thumb-active': isFabledActive(char.id) }"></div>
              </div>
            </div>
          </div>
          
          <div v-if="fabledCharacters.length === 0" class="empty-state">
            尚未在全域角色庫中找到傳說角色。
          </div>
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
import { computed, ref } from 'vue'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { useScriptStore } from '../stores/scriptStore'
import type { CharacterDef } from '../types'
import CharacterDetailOverlay from './CharacterDetailOverlay.vue'

const uiStore = useUIStore()
const gameStore = useGameStore()
const scriptStore = useScriptStore()

// 從全庫中取得傳說角色
const fabledCharacters = computed(() => {
  return scriptStore.masterScript.characters.filter(
    c => c.role_type === 'Fabled'
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

function showDetails(char: any) {
  longPressChar.value = char as CharacterDef
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

.fabled-list {
  display: flex;
  flex-direction: column;
}

.fabled-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: none;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.fabled-item:active {
  background: rgba(255,255,255,0.05);
}

.fabled-item.active {
  background: rgba(212, 168, 64, 0.05); /* 金色微亮背景 */
}

.char-logo {
  width: 44px;
  height: 44px;
  border-radius: 50%; /* 傳說角色通常圓形 */
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.fabled-item.active .char-logo {
  border-color: #d4a840;
}

.char-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.char-info { flex: 1; overflow: hidden; }

.char-name {
  font-size: 15px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.fabled-item.active .char-name {
  color: #d4a840;
}

.char-ability {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.view-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-muted);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  margin-right: 4px;
}

.view-btn:active {
  background: rgba(255, 255, 255, 0.15);
  transform: scale(0.95);
}

.icon {
  font-size: 14px;
}

/* 簡單的 Toggle Switch 樣式 */
.toggle-btn {
  flex-shrink: 0;
}

.toggle-track {
  width: 40px;
  height: 22px;
  background: rgba(255,255,255,0.2);
  border-radius: 11px;
  position: relative;
  transition: background 0.3s;
}

.toggle-track.track-active {
  background: #d4a840;
}

.toggle-thumb {
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.toggle-thumb.thumb-active {
  transform: translateX(18px);
}

.empty-state {
  padding: 32px 16px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}
</style>
