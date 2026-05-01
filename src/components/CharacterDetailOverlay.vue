<template>
  <div v-if="character" class="detail-overlay" @click="$emit('close')" @contextmenu.prevent>
    <div class="detail-card animate-scale-up" @click.stop>
      <div class="detail-header" :class="character.role_type.toLowerCase()">
        <div class="header-main">
          <div class="char-icon-container">
            <img v-if="character.image" :src="character.image" class="detail-img" />
            <span v-else class="detail-emoji">{{ emoji }}</span>
          </div>
          <div class="detail-title">
            <h3>{{ character.name }}</h3>
            <div class="detail-meta">
              <span class="detail-type">{{ typeLabel }}</span>
              <span v-if="character.name_en" class="detail-en">{{ character.name_en }}</span>
            </div>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="detail-body">
        <div class="ability-section">
          <div class="section-label">角色能力</div>
          <p class="detail-ability">{{ character.ability }}</p>
        </div>
        
        <div v-if="character.conflicts && character.conflicts.length > 0" class="detail-conflicts">
          <div class="section-label">相克規則 (Jinxes)</div>
          <div v-for="(rule, idx) in character.conflicts" :key="idx" class="conflict-item">
            <div class="conflict-title">⚔️ vs {{ getCharacterName(rule.target || rule.charB) }}</div>
            <div v-if="rule.desc" class="conflict-desc">{{ rule.desc }}</div>
          </div>
        </div>

        <div v-if="character.setup" class="setup-notice">
          ⚙️ 此角色涉及特殊的遊戲設置。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CharacterDef } from '../types'
import { ROLE_TYPE_LABEL } from '../types'
import { useScriptStore } from '../stores/scriptStore'

const props = defineProps<{
  character: CharacterDef | null
}>()

const emit = defineEmits(['close'])

const scriptStore = useScriptStore()

const typeLabel = computed(() => {
  if (!props.character) return ''
  return ROLE_TYPE_LABEL[props.character.role_type] || props.character.role_type
})

const emoji = computed(() => {
  if (!props.character) return '❓'
  const map: Record<string, string> = {
    Townsfolk: '🏘️', Outsider: '🧪', Minion: '🔱', Demon: '😈', Traveler: '🧳', Fabled: '📖'
  }
  return map[props.character.role_type] || '❓'
})

function getCharacterName(id?: string) {
  if (!id) return '未知'
  const char = scriptStore.rawCharacterList.find(c => c.id === id)
  return char ? char.name : id
}
</script>

<style scoped>
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.detail-card {
  width: 100%;
  max-width: 360px;
  background: #1a1b23;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-header {
  padding: 24px 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  position: relative;
  background: linear-gradient(to bottom right, rgba(255,255,255,0.1), transparent);
}

.header-main {
  display: flex;
  gap: 16px;
  align-items: center;
}

.char-icon-container {
  width: 60px;
  height: 60px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.detail-emoji {
  font-size: 32px;
}

.detail-title h3 {
  margin: 0;
  font-size: 20px;
  color: white;
  font-family: var(--font-title);
}

.detail-meta {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-top: 4px;
}

.detail-type {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.9;
}

.detail-en {
  font-size: 11px;
  opacity: 0.5;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
}

/* 陣營顏色 */
.detail-header.townsfolk { background-color: rgba(52, 152, 219, 0.3); }
.detail-header.outsider { background-color: rgba(46, 204, 113, 0.3); }
.detail-header.minion { background-color: rgba(231, 76, 60, 0.3); }
.detail-header.demon { background-color: rgba(155, 89, 182, 0.3); }

.detail-body {
  padding: 20px;
}

.section-label {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.ability-section {
  margin-bottom: 20px;
}

.detail-ability {
  font-size: 15px;
  line-height: 1.6;
  color: #eee;
  margin: 0;
}

.detail-conflicts {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.conflict-item {
  background: rgba(229, 115, 115, 0.08);
  border: 1px solid rgba(229, 115, 115, 0.15);
  border-radius: 10px;
  padding: 8px 12px;
  margin-bottom: 8px;
}

.conflict-title {
  font-size: 12px;
  color: #e57373;
  font-weight: 700;
  margin-bottom: 4px;
}

.conflict-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.4;
  font-style: italic;
}

.setup-notice {
  margin-top: 20px;
  font-size: 11px;
  color: var(--color-gold-muted);
  background: rgba(201, 168, 76, 0.1);
  padding: 6px 12px;
  border-radius: 6px;
  text-align: center;
}

.animate-scale-up {
  animation: scaleUp 0.2s cubic-bezier(0.17, 0.67, 0.83, 0.67);
}

@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
