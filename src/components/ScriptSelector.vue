<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="script-panel panel animate-slide-up">
      <div class="panel-header">
        <span class="panel-icon">📖</span>
        <h2 class="panel-title">選擇劇本</h2>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <!-- 官方劇本 -->
      <div class="section-title">官方劇本</div>
      <div class="script-list">
        <button
          v-for="script in officialScripts"
          :key="script.id"
          class="script-item"
          :class="{ 'script-active': currentId === script.id }"
          @click="selectScript(script)"
        >
          <div class="script-logo">{{ scriptEmoji(script.id) }}</div>
          <div class="script-info">
            <div class="script-name">{{ script.name }}</div>
            <div class="script-sub">{{ script.name_en }}</div>
          </div>
          <div v-if="currentId === script.id" class="script-check">✓</div>
        </button>
      </div>
      <div v-if="gameStore.error" style="color: red; padding: 12px; font-size: 14px; text-align: center;">
        {{ gameStore.error }}
      </div>

      <div class="divider" />

      <!-- 自定義劇本 -->
      <div class="section-title">自定義劇本</div>
      <button class="import-btn" @click="handleImport">
        <span class="import-icon">📁</span>
        <div>
          <div class="import-title">匯入劇本 JSON</div>
          <div class="import-sub">支援官方劇本工具導出的格式</div>
        </div>
        <span class="arrow">›</span>
      </button>

      <!-- 自定義劇本列表 -->
      <div class="custom-list" v-if="customScripts.length > 0">
        <button
          v-for="script in customScripts"
          :key="script.id"
          class="script-item"
          :class="{ 'script-active': currentId === script.id }"
          @click="selectScript(script)"
        >
          <div class="script-logo">📄</div>
          <div class="script-info">
            <div class="script-name">{{ script.name }}</div>
            <div class="script-sub">{{ script.characters.length }} 個角色</div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { useUIStore } from '../stores/uiStore'
import { useGameStore } from '../stores/gameStore'
import { useScriptStore, OFFICIAL_SCRIPTS } from '../stores/scriptStore'
import type { Script } from '../types'

const uiStore = useUIStore()
const gameStore = useGameStore()
const scriptStore = useScriptStore()

const officialScripts = OFFICIAL_SCRIPTS
const customScripts = computed(() => scriptStore.customScripts)
const currentId = computed(() => gameStore.script?.id)

async function selectScript(script: Script) {
  await scriptStore.selectScript(script)
  if (!gameStore.error) {
    uiStore.closePanel()
  }
}

async function handleImport() {
  try {
    const file = await openDialog({
      multiple: false,
      filters: [{
        name: 'JSON 劇本',
        extensions: ['json']
      }]
    })
    
    if (file) {
      const filePath = typeof file === 'string' ? file : (file as any).path
      const content = await readTextFile(filePath)
      await gameStore.importCustomScript(content)
      if (!gameStore.error) {
        uiStore.closePanel()
      }
    }
  } catch (e) {
    console.error(e)
    gameStore.error = '無法匯入檔案: ' + String(e)
  }
}

function scriptEmoji(id: string) {
  const map: Record<string, string> = {
    trouble_brewing: '🍺',
    bad_moon_rising: '🌙',
    sects_and_violets: '🌸',
  }
  return map[id] ?? '📚'
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

.script-panel {
  width: 100%;
  max-width: 440px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px 20px 12px 12px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 16px 10px;
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
}

.section-title {
  padding: 10px 16px 4px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.script-list, .custom-list {
  display: flex;
  flex-direction: column;
}

.script-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: none;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background var(--transition-fast);
}

.script-item:active { background: rgba(255,255,255,0.05); }

.script-active {
  background: rgba(201,168,76,0.08) !important;
}

.script-logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--color-bg-elevated);
  border: 1px solid rgba(201,168,76,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.script-info { flex: 1; }

.script-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.script-sub {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.script-check {
  font-size: 16px;
  color: var(--color-gold);
  font-weight: 700;
}

.import-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(201,168,76,0.05);
  border: 1px dashed rgba(201,168,76,0.3);
  border-radius: 10px;
  margin: 4px 12px;
  text-align: left;
  transition: all var(--transition-fast);
}

.import-btn:active {
  background: rgba(201,168,76,0.1);
}

.import-icon { font-size: 22px; flex-shrink: 0; }

.import-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-gold);
}

.import-sub {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.arrow {
  font-size: 20px;
  color: var(--color-gold-muted);
  margin-left: auto;
}
</style>
