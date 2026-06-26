<template>
  <div class="overlay" @click.self="uiStore.closePanel()">
    <div class="settings-panel panel animate-slide-up">
      <div class="panel-header">
        <span class="panel-icon"><img src="/pic/gear.png" class="panel-header-icon" /></span>
        <h2 class="panel-title">設置選項</h2>
        <button class="close-btn" @click="uiStore.closePanel()">✕</button>
      </div>

      <div class="settings-content">
        <!-- 存活與票數統計 -->
        <div class="section-title">存活與票數統計</div>
        <div class="stats-cards-grid">
          <div class="stat-card" title="剩餘提名權">
            <!-- <span class="stat-card-icon">🙋</span> -->
            <span class="stat-icon">
              <img src="/pic/nomination.png" alt="提名權" class="stat-img img-nomination" />
            </span>
            <span class="stat-card-val">{{ nominationsRemaining }}</span>
            <span class="stat-card-label">剩餘提名</span>
          </div>
          <div class="stat-card" title="處決門檻">
            <!-- <span class="stat-card-icon">⚔️</span> -->
            <span class="stat-icon">
              <img src="/pic/suicide.png" alt="處決門檻" class="stat-img img-guillotine" />
            </span>
            <span class="stat-card-val">{{ gameStore.threshold }}</span>
            <span class="stat-card-label">處決門檻</span>
          </div>
          <div class="stat-card" title="有效票數">
            <!-- <span class="stat-icon">🗳️</span> -->
            <span class="stat-icon">
              <img src="/pic/vote-yes.png" alt="有效票數" class="stat-img img-vote-yes" />
            </span>
            <span class="stat-card-val">{{ totalVotes }}</span>
            <span class="stat-card-label">有效票數</span>
          </div>
          <div class="stat-card" title="存活人數">
            <!-- <span class="stat-card-icon">❤️</span> -->
            <span class="stat-icon">
              <img src="/pic/heart.png" alt="有效票數" class="stat-img img-heart" />
            </span>
            <span class="stat-card-val">{{ gameStore.alive }}</span>
            <span class="stat-card-label">存活人數</span>
          </div>
        </div>

        <div class="divider" />

        <!-- 遊戲控制 -->

        <div class="section-title">遊戲控制</div>
        <div class="settings-grid">
          <button v-if="gameStore.phase === 'FirstNight'" class="grid-item" @click="openAssignment">
            <!-- <span class="grid-icon">🎭</span> -->
            <span class="stat-icon">
              <img src="/pic/theater.png" alt="開局" class="stat-img img-theater" />
            </span>
            <span class="grid-label">開局</span>
          </button>

          <button class="grid-item" @click="openScriptEditor">
            <!-- <span class="grid-icon">📜</span> -->
            <span class="stat-icon">
              <img src="/pic/spellbook.png" alt="劇本管理" class="stat-img img-theater" />
            </span>
            <span class="grid-label">劇本管理</span>
          </button>

          <button class="grid-item" @click="openVoting">
            <span class="grid-icon"><img src="/pic/vote.png" class="grid-img" /></span>
            <span class="grid-label">投票面板</span>
          </button>

          <button class="grid-item" @click="openFabled">
            <div class="grid-double-icon">
              <img src="/pic/Fabled_new.png" alt="傳說" class="double-img fabled-img" />
              <img src="/pic/Loric.png" alt="奇遇" class="double-img lorica-img" />
            </div>
            <span class="grid-label">傳說奇遇</span>
          </button>

          <button class="grid-item" @click="openNightOrder">
            <span class="grid-icon"><img src="/pic/day-and-night.png" class="grid-img" /></span>
            <span class="grid-label">夜晚順序</span>
          </button>

          <button class="grid-item" @click="openGameLog">
            <span class="grid-icon"><img src="/pic/history.png" class="grid-img" /></span>
            <span class="grid-label">對局記錄</span>
          </button>

          <button class="grid-item" @click="openCharSheet">
            <span class="grid-icon"><img src="/pic/skin.png" class="grid-img" /></span>
            <span class="grid-label">角色清單</span>
          </button>

          <button class="grid-item" @click="openPlayerOrder">
            <span class="grid-icon"><img src="/pic/throne.png" class="grid-img" /></span>
            <span class="grid-label">座位編排</span>
          </button>

          <button class="grid-item" @click="openCharacterEditor">
            <span class="grid-icon"><img src="/pic/anonymous.png" class="grid-img" /></span>
            <span class="grid-label">自訂庫</span>
          </button>


          <!-- 階段推進功能目前暫時移除 -->
          <!-- 
          <button class="grid-item primary" @click="advance">
            <span class="grid-icon">⌛</span>
            <span class="grid-label">階段推進</span>
          </button> -->
        </div>

        <div class="divider" />

        <!-- 資料管理 -->
        <div class="section-title">資料管理</div>
        <div class="settings-grid cols-2">

          <button class="grid-item" @click="importGame">
            <span class="grid-icon"><img src="/pic/downloading.png" class="grid-img" /></span>
            <span class="grid-label">匯入遊戲</span>
          </button>
          <button class="grid-item" @click="exportGame">
            <span class="grid-icon"><img src="/pic/upload.png" class="grid-img" /></span>
            <span class="grid-label">匯出遊戲</span>
          </button>

          <button class="grid-item" @click="importScripts">
            <span class="grid-icon"><img src="/pic/import.png" class="grid-img" /></span>
            <span class="grid-label">匯入劇本</span>
          </button>

           <button class="grid-item" @click="exportAllScripts">
            <span class="grid-icon"><img src="/pic/export.png" class="grid-img" /></span>
            <span class="grid-label">匯出劇本</span>
          </button>

        </div>

        <div class="divider" />

        <!-- 介面設置 (暫時隱藏，預設為內圈向心) -->

        <div class="section-title">提示標記佈局 (Reminder Layout)</div>
        <div class="layout-selector-grid cols-2">
          <button v-for="mode in layouts" :key="mode.id" class="layout-option"
            :class="{ active: uiStore.reminderLayout === mode.id }" @click="uiStore.setReminderLayout(mode.id as any)">
            <span class="opt-icon">
              <img v-if="mode.icon.startsWith('/')" :src="mode.icon" :alt="mode.label" class="opt-img" />
              <template v-else>{{ mode.icon }}</template>
            </span>

            <span class="opt-label">{{ mode.label }}</span>

            <div v-if="uiStore.reminderLayout === mode.id" class="active-check">✓</div>
          </button>
        </div>

        <!-- 提示標記收納上限計數器 -->
        <div class="section-title">提示標記收納上限</div>
        <div class="threshold-slider-box">
          <div class="threshold-counter">
            <button class="counter-btn" type="button" :disabled="uiStore.reminderCollapseThreshold <= 1"
              @click="uiStore.setReminderCollapseThreshold(uiStore.reminderCollapseThreshold - 1)">
              －
            </button>
            <span class="counter-value">{{ uiStore.reminderCollapseThreshold }}</span>
            <button class="counter-btn" type="button" :disabled="uiStore.reminderCollapseThreshold >= 8"
              @click="uiStore.setReminderCollapseThreshold(uiStore.reminderCollapseThreshold + 1)">
              ＋
            </button>
          </div>
          <div class="slider-labels text-center">
            <span class="threshold-tip">當玩家提示標記多於此數量時，自動摺疊為鎖頭</span>
          </div>
        </div>

        <div class="divider" />


        <!-- 自定義背景 -->
        <div class="section-title">自定義佈景</div>
        <div class="background-settings-grid">
          <div class="bg-setting-item">
            <div class="bg-preview"
              :style="uiStore.customDayBackground ? { backgroundImage: `url(${uiStore.customDayBackground})` } : {}">
              <div v-if="!uiStore.customDayBackground" class="bg-placeholder">預設白天</div>
              <div class="bg-overlay">
                <button class="bg-btn" @click="triggerFile('day')">匯入圖檔</button>
                <button v-if="uiStore.customDayBackground" class="bg-btn reset"
                  @click="uiStore.setDayBackground(null)">重置</button>
              </div>
            </div>
            <div class="bg-name">白天背景</div>
          </div>
          <div class="bg-setting-item">
            <div class="bg-preview"
              :style="uiStore.customNightBackground ? { backgroundImage: `url(${uiStore.customNightBackground})` } : {}">
              <div v-if="!uiStore.customNightBackground" class="bg-placeholder night">預設夜晚</div>
              <div class="bg-overlay">
                <button class="bg-btn" @click="triggerFile('night')">匯入圖檔</button>
                <button v-if="uiStore.customNightBackground" class="bg-btn reset"
                  @click="uiStore.setNightBackground(null)">重置</button>
              </div>
            </div>
            <div class="bg-name">夜晚背景</div>
          </div>
        </div>
        <input type="file" ref="fileInput" hidden accept="image/*" @change="handleFileChange" />

        <div class="divider" />

        <!-- 魔典排列圖形 (已移至頂部工具列) -->

        <div class="section-title">魔典排列圖形 (Grimoire Shape)</div>
        <div class="layout-selector-grid cols-3">
          <button v-for="shape in shapes" :key="shape.id" class="layout-option"
            :class="{ active: uiStore.grimoireShape === shape.id }" @click="uiStore.setGrimoireShape(shape.id as any)">
            <img class="opt-icon" :src="shape.icon" />
            <span class="opt-label">{{ shape.label }}</span>
            <div v-if="uiStore.grimoireShape === shape.id" class="active-check">✓</div>
          </button>
        </div>

        <div class="section-title">魔典縮放 (Inverted Zoom)</div>
        <div class="zoom-slider-box">
          <input type="range" min="0.5" max="2.0" step="0.05" :value="uiStore.grimoireScale"
            @input="e => uiStore.setGrimoireScale(parseFloat((e.target as HTMLInputElement).value))"
            class="settings-slider" />
          <div class="slider-labels">
            <span>調整玩家令片顯示大小</span>
            <span class="scale-val">{{ Math.round(uiStore.grimoireScale * 100) }}%</span>
          </div>
        </div>

        <div class="divider" />

        <!-- 計時器設置 -->
        <div class="section-title">計時器設置</div>
        <div class="layout-selector-grid cols-2">
          <button class="layout-option" :class="{ active: uiStore.isTimerSoundEnabled }"
            @click="uiStore.setTimerSoundEnabled(!uiStore.isTimerSoundEnabled)">
            <span class="opt-icon">🔔</span>
            <span class="opt-label">到點鐘聲</span>
            <div v-if="uiStore.isTimerSoundEnabled" class="active-check">✓</div>
          </button>
          <button class="layout-option" :class="{ active: uiStore.isTimerNotificationEnabled }"
            @click="uiStore.setTimerNotificationEnabled(!uiStore.isTimerNotificationEnabled)">
            <span class="opt-icon">🖥️</span>
            <span class="opt-label">桌面通知</span>
            <div v-if="uiStore.isTimerNotificationEnabled" class="active-check">✓</div>
          </button>
        </div>

        <div class="divider" />

        <!-- 自訂角色技能音效 -->
        <div class="section-title">自訂角色技能音效</div>
        <div class="sound-manager-box">
          <!-- 隱藏主介面技能音效按鈕選項 -->
          <div class="sound-toggle-row" @click="uiStore.setCustomSoundButtonHidden(!uiStore.isCustomSoundButtonHidden)">
            <input 
              type="checkbox" 
              :checked="uiStore.isCustomSoundButtonHidden" 
              @click.stop
              @change="uiStore.setCustomSoundButtonHidden(($event.target as HTMLInputElement).checked)"
              class="sound-toggle-checkbox"
            />
            <span class="sound-toggle-label">🔒 隱藏主畫面技能音效按鈕</span>
          </div>

          <button class="import-sound-btn" @click="triggerSoundUpload">
            ➕ 匯入角色技能音效
          </button>
          <input type="file" ref="soundFileInput" hidden accept="audio/*" @change="handleSoundFileChange" />

          <!-- 自訂音效清單 -->
          <div v-if="uiStore.customSounds.length === 0" class="no-sounds-tip">
            暫無自訂技能音效，請點擊上方按鈕匯入
          </div>
          <div v-else class="sounds-list">
            <div v-for="sound in uiStore.customSounds" :key="sound.id" class="sound-item"
              :class="{ 'is-pinned': uiStore.pinnedSoundId === sound.id }">
              <div class="sound-info">
                <span class="sound-pin-indicator" v-if="uiStore.pinnedSoundId === sound.id">📌</span>
                <span class="sound-name">{{ sound.name }}</span>
                <span class="sound-tag" v-if="uiStore.pinnedSoundId === sound.id">主要播放</span>
              </div>
              <div class="sound-actions">
                <!-- 釘選按鈕 -->
                <button class="action-btn pin-btn" :class="{ active: uiStore.pinnedSoundId === sound.id }"
                  title="釘選為主要播放音效" @click="uiStore.pinSound(sound.id)">
                  📌
                </button>
                <!-- 播放/停止按鈕 -->
                <button class="action-btn play-btn"
                  :class="{ 'is-playing': uiStore.isCustomSoundPlaying && uiStore.playingCustomSoundId === sound.id }"
                  @click="togglePlaySound(sound.id)">
                  {{ uiStore.isCustomSoundPlaying && uiStore.playingCustomSoundId === sound.id ? '⏹️' : '▶️' }}
                </button>
                <!-- 刪除按鈕 -->
                <button v-if="!sound.id.startsWith('default-')" class="action-btn delete-btn"
                  @click="deleteCustomSound(sound.id, sound.name)">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="divider" />

        <!-- 危險區域 -->
        <div class="section-title danger-section">危險區域</div>
        <div class="settings-grid">
          <button class="grid-item warning" @click="resetStates">
            <span class="grid-icon"><img src="/pic/reset.png" class="grid-img" /></span>
            <span class="grid-label">重置狀態</span>
          </button>

          <button class="grid-item danger" @click="resetGame">
            <span class="grid-icon"><img src="/pic/close.png" class="grid-img" /></span>
            <span class="grid-label">重置遊戲</span>
          </button>
        </div>

        <div class="divider" />

        <!-- 軟體使用授權 -->
        <div class="section-title">軟體使用授權</div>
        <div class="license-settings-box">
          <div class="license-info-row">
            <span class="info-label">裝置識別碼：</span>
            <div class="device-id-wrapper">
              <span class="device-id-text" :title="licenseDeviceId">{{ licenseDeviceId || '載入中...' }}</span>
              <button class="copy-btn-small" @click="copyLicenseDeviceId">複製</button>
            </div>
          </div>
          <div class="license-info-row">
            <span class="info-label">授權截止：</span>
            <span class="info-value" :class="{ 'text-gold': licenseRemainingDays !== null && licenseRemainingDays >= 0, 'text-danger': licenseRemainingDays !== null && licenseRemainingDays < 0 }">
              {{ licenseExpiryDate || '未載入' }} ({{ remainingText }})
            </span>
          </div>
          
          <div class="license-action-form">
            <div class="form-row-compact">
              <input v-model="licenseInputKey" type="text" class="license-input-compact" placeholder="請貼上 24 位授權金鑰" />
              <button class="license-btn-compact" :disabled="isActivatingLicense" @click="handleActivateLicense">
                {{ isActivatingLicense ? '啟用中' : '啟用' }}
              </button>
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
import { useGameStore } from '../stores/gameStore'
import { useScriptStore } from '../stores/scriptStore'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile, readFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'

const uiStore = useUIStore()
const gameStore = useGameStore()
const scriptStore = useScriptStore()

const nominationsRemaining = computed(() => {
  return gameStore.players.filter(p => p.can_nominate).length
})

const totalVotes = computed(() => {
  return gameStore.players.filter(p => p.is_alive || (!p.is_alive && p.has_ghost_vote)).length
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  loadLicenseStatus()
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

const fileInput = ref<HTMLInputElement | null>(null)
const uploadTarget = ref<'day' | 'night'>('day')

// 自訂音效管理
const soundFileInput = ref<HTMLInputElement | null>(null)

function triggerSoundUpload() {
  if (!uiStore.licenseIsActivated) {
    uiStore.showAlert(
      '功能已鎖定',
      `匯入角色技能音效功能需要啟用正式授權金鑰。\n\n試用期內僅開放播放內建預設音效，不支援自訂音效上傳。\n\n您的裝置識別碼：\n${licenseDeviceId.value}\n(可前往下方複製此識別碼並發送給管理員)`
    )
    return
  }
  soundFileInput.value?.click()
}

async function handleSoundFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const defaultName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
  const name = await uiStore.showPrompt('匯入技能音效', '請輸入此角色發動技能音效的名稱（例如：守鴉人）：', defaultName)

  if (name === null) {
    if (soundFileInput.value) soundFileInput.value.value = ''
    return
  }

  const finalName = name.trim() || defaultName

  try {
    const buffer = await file.arrayBuffer()
    await uiStore.addCustomSound(finalName, buffer)
    uiStore.showAlert('匯入成功', `音效「${finalName}」匯入成功！`)
  } catch (err) {
    console.error('音效匯入失敗:', err)
    uiStore.showAlert('匯入失敗', '音效匯入失敗，請確認檔案格式是否正確。')
  }

  if (soundFileInput.value) soundFileInput.value.value = ''
}

function togglePlaySound(id: string) {
  if (uiStore.isCustomSoundPlaying && uiStore.playingCustomSoundId === id) {
    uiStore.stopSpecificSound()
  } else {
    uiStore.playSpecificSound(id)
  }
}

function deleteCustomSound(id: string, name: string) {
  uiStore.showConfirm(
    '刪除自訂音效',
    `確認要刪除自訂音效「${name}」嗎？此操作無法恢復。`,
    () => {
      uiStore.removeCustomSound(id)
    },
    true
  )
}

async function triggerFile(target: 'day' | 'night') {
  uploadTarget.value = target

  // 行動端 (Android/iOS) 必須在使用者點擊的同步調用棧中觸發 input.click()，否則會被 WebView 安全政策攔截
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent)
  if (isMobile) {
    fileInput.value?.click()
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
      const rawSrc = `data:${mimeType};base64,${btoa(binary)}`
      
      try {
        const optimizedSrc = await processImage(rawSrc)
        if (uploadTarget.value === 'day') uiStore.setDayBackground(optimizedSrc)
        else uiStore.setNightBackground(optimizedSrc)
      } catch (err) {
        console.error('圖片優化失敗:', err)
        if (uploadTarget.value === 'day') uiStore.setDayBackground(rawSrc)
        else uiStore.setNightBackground(rawSrc)
      }
    }
  } catch (e) {
    console.warn('Tauri open failed, falling back to browser upload', e)
    fileInput.value?.click()
  }
}

function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (event) => {
    const rawSrc = event.target?.result as string
    try {
      const optimizedSrc = await processImage(rawSrc)
      if (uploadTarget.value === 'day') uiStore.setDayBackground(optimizedSrc)
      else uiStore.setNightBackground(optimizedSrc)
    } catch (err) {
      console.error('圖片優化失敗:', err)
      // 如果優化失敗，則退回到原始圖片
      if (uploadTarget.value === 'day') uiStore.setDayBackground(rawSrc)
      else uiStore.setNightBackground(rawSrc)
    }
  }
  reader.readAsDataURL(file)

  if (fileInput.value) fileInput.value.value = ''
}

/**
 * 圖片優化處理：縮放並壓縮
 */
async function processImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height
      const MAX_SIZE = 2000 // 最大邊長

      // 計算縮放比例
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width
          width = MAX_SIZE
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height
          height = MAX_SIZE
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject('無法獲取 Canvas Context')

      // 繪製並優化
      ctx.drawImage(img, 0, 0, width, height)

      // 輸出為 JPEG, 品質設為 0.8 (檔案大小與清晰度的平衡點)
      const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.8)
      resolve(optimizedDataUrl)
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

const shapes = [
  { id: 'circle', label: '經典正圓', icon: '/pic/circle.png' },
  { id: 'oval', label: '優雅橢圓', icon: '/pic/oval.png' },
  { id: 'rect', label: '工整矩形', icon: '/pic/rectangle.png' },
]

const layouts = [
  { id: 'inner', label: '向心排列', icon: '/pic/arrows-circle (1).png' },
  { id: 'arc', label: '環繞排列', icon: '/pic/street-view.png' },
]

function openNightOrder() {
  uiStore.openPanel('night-order')
}

function openGameLog() {
  uiStore.openPanel('game-log')
}

function openCharSheet() {
  uiStore.openPanel('character-sheet')
}

function openVoting() {
  uiStore.openPanel('voting')
}

function openPlayerOrder() {
  uiStore.openPanel('player-order')
}

function openAssignment() {
  uiStore.openPanel('role-assignment')
}

function openCharacterEditor() {
  uiStore.openPanel('character-editor')
}

function openScriptEditor() {
  uiStore.openPanel('script-editor')
}

function openFabled() {
  uiStore.openPanel('fabled-selector')
}

async function importGame() {
  try {
    // 嘗試使用 Tauri 原生對話框
    const selected = await open({
      multiple: false,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (selected) {
      const content = await readTextFile(selected as string)
      await gameStore.importState(content)
      uiStore.showAlert('還原成功', '遊戲狀態已成功還原')
      uiStore.closePanel()
    }
  } catch (e) {
    //  fallback: 使用瀏覽器文件選擇器
    console.warn('Tauri open failed, falling back to browser input', e)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = async (e) => {
          const content = e.target?.result as string
          await gameStore.importState(content)
          uiStore.showAlert('還原成功', '遊戲狀態已成功還原')
          uiStore.closePanel()
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }
}

async function exportGame() {
  const json = await gameStore.exportState()
  if (!json) return

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const timeStr = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0')
  const fileName = `botc-game-${dateStr}-${timeStr}.json`

  try {
    // 嘗試使用 Tauri 原生對話框 (適用於 Android/Desktop)
    const filePath = await save({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      defaultPath: fileName
    })

    if (filePath) {
      await writeTextFile(filePath, json)
      uiStore.showAlert('匯出成功', '已成功匯出至：' + filePath)
    }
  } catch (e) {
    // 如果不在 Tauri 環境或發生錯誤，退回到網頁下載方式
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

async function importScripts() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const content = e.target?.result as string
        let fileName = file.name
        try {
          fileName = decodeURIComponent(fileName)
        } catch (_) { }
        if (fileName.toLowerCase().endsWith('.json')) {
          fileName = fileName.substring(0, fileName.length - 5)
        }
        const success = await scriptStore.importFromJson(content, fileName)
        if (success) {
          uiStore.showAlert('匯入成功', '劇本資料已成功匯入')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

async function exportAllScripts() {
  const json = await scriptStore.exportAllScripts()
  if (!json) return

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const fileName = `botc-scripts-${dateStr}.json`

  try {
    const filePath = await save({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      defaultPath: fileName
    })

    if (filePath) {
      await writeTextFile(filePath, json)
      uiStore.showAlert('匯出成功', '所有劇本已成功匯出至：' + filePath)
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

function resetStates() {
  uiStore.showConfirm(
    '重置狀態',
    '確認要清空所有已指派的角色、死亡狀態與階段嗎？此操作將保留玩家名單。',
    async () => {
      await gameStore.resetPlayersState()
      uiStore.closePanel()
    },
    true
  )
}

function resetGame() {
  uiStore.showConfirm(
    '重置遊戲',
    '確認要清除所有玩家數據並重新開始嗎？此操作不可恢復。',
    async () => {
      await gameStore.newGame()
      uiStore.closePanel()
    },
    true
  )
}

// 授權管理狀態與邏輯
const licenseDeviceId = ref('')
const licenseExpiryDate = ref('')
const licenseRemainingDays = ref<number | null>(null)
const licenseIsActivated = ref(false)
const licenseInputKey = ref('')
const isActivatingLicense = ref(false)

const remainingText = computed(() => {
  if (licenseRemainingDays.value === null) return '未載入'
  if (licenseRemainingDays.value < 0) return '已過期'
  if (!licenseIsActivated.value) {
    return `試用期剩餘 ${licenseRemainingDays.value} 天`
  }
  return `正式版剩餘 ${licenseRemainingDays.value} 天`
})

async function loadLicenseStatus() {
  try {
    const res = await invoke<any>('check_license')
    if (res.status === 'Valid') {
      licenseRemainingDays.value = res.data.remaining_days
      licenseExpiryDate.value = res.data.expiry_date
      licenseDeviceId.value = res.data.device_id
      licenseIsActivated.value = res.data.is_activated
    } else if (res.status === 'Expired') {
      licenseRemainingDays.value = -1
      licenseExpiryDate.value = res.data.expiry_date
      licenseDeviceId.value = res.data.device_id
      licenseIsActivated.value = res.data.is_activated
    } else if (res.status === 'TimeTampered') {
      licenseRemainingDays.value = -1
      licenseDeviceId.value = res.data.device_id
      licenseExpiryDate.value = '時間異常'
      licenseIsActivated.value = false
    }
  } catch (err) {
    console.error('Failed to load license status:', err)
  }
}

async function copyLicenseDeviceId() {
  try {
    await navigator.clipboard.writeText(licenseDeviceId.value)
    alert('裝置識別碼已複製到剪貼簿！')
  } catch (err) {
    console.error(err)
  }
}

async function handleActivateLicense() {
  const key = licenseInputKey.value.trim()
  if (!key) {
    alert('請輸入授權金鑰！')
    return
  }
  
  isActivatingLicense.value = true
  try {
    const res = await invoke<any>('activate_license', { key })
    if (res.status === 'Valid') {
      licenseRemainingDays.value = res.data.remaining_days
      licenseExpiryDate.value = res.data.expiry_date
      licenseDeviceId.value = res.data.device_id
      licenseInputKey.value = ''
      alert('授權啟用成功！歡迎使用魔典。')
      window.location.reload()
    } else {
      alert('啟用失敗，請確認金鑰是否正確。')
    }
  } catch (err: any) {
    alert(err.toString())
  } finally {
    isActivatingLicense.value = false
  }
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

.settings-panel {
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
}

.close-btn {
  color: var(--color-text-muted);
  font-size: 16px;
  background: none;
  padding: 4px 8px;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.section-title {
  padding: 10px 16px 4px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.danger-section {
  color: rgba(224, 32, 32, 0.6);
}

.settings-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 16px;
  background: none;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background var(--transition-fast);
}

.settings-item:active {
  background: rgba(255, 255, 255, 0.05);
}

.settings-item-warning .settings-label {
  color: var(--color-gold-bright, #e8a040);
}

.settings-item-danger .settings-label {
  color: var(--color-red-bright);
}

.settings-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.settings-info {
  flex: 1;
}

.settings-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.settings-sub {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.settings-arrow {
  font-size: 20px;
  color: var(--color-text-muted);
}

.divider {
  height: 1px;
  background: rgba(201, 168, 76, 0.1);
  margin: 8px 16px;
}

/* 佈局選擇器樣式 (優化為緊湊模式) */
.layout-selector-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 6px 16px 12px;
}

.layout-selector-grid.cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

.layout-selector-grid.cols-4 {
  grid-template-columns: repeat(4, 1fr);
}

.layout-option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  transition: all 0.2s ease;
  cursor: pointer;
  color: var(--color-text-muted);
}

.layout-option:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(201, 168, 76, 0.3);
}

.layout-option.active {
  background: rgba(201, 168, 76, 0.1);
  border-color: var(--color-gold);
  color: var(--color-gold-bright);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.opt-icon {
  font-size: 18px;
}

.opt-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0px;
  white-space: nowrap;
}

.active-check {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 12px;
  color: var(--color-gold);
  font-weight: bold;
}

/* 格子佈局樣式 */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 8px 16px;
}

.settings-grid.cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.layout-selector-grid {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.layout-selector-grid.cols-4 {
  grid-template-columns: repeat(4, 1fr);
}

.layout-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.layout-option.active {
  background: rgba(201, 168, 76, 0.15);
  border-color: var(--color-gold);
}

.layout-option .opt-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  object-fit: contain;
}

.opt-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  display: block;
}

.layout-option .opt-label {
  font-size: 10px;
  color: var(--color-text-secondary);
}

.layout-option.active .opt-label {
  color: var(--color-gold);
}

.active-check {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 10px;
  color: var(--color-gold);
}

.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: all 0.2s;
  cursor: pointer;
}

/* 確保所有按鈕的圖示區域高度完全一致，從而讓下方的文字標題在同一條水平線上絕對對齊！ */
.grid-item>*:first-child {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.grid-item:active {
  background: rgba(201, 168, 76, 0.1);
  border-color: var(--color-gold-muted);
  transform: scale(0.95);
}

.grid-item.primary {
  background: rgba(201, 168, 76, 0.1);
  border-color: rgba(201, 168, 76, 0.3);
}

.grid-item.primary .grid-label {
  color: var(--color-gold);
}

.grid-icon {
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grid-icon .grid-img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.panel-header-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  vertical-align: middle;
}

.grid-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: center;
}

.grid-item.warning {
  background: rgba(224, 160, 32, 0.1);
  border-color: rgba(224, 160, 32, 0.3);
}

.grid-item.warning .grid-label {
  color: #e8a040;
}

.grid-item.danger {
  background: rgba(224, 32, 32, 0.1);
  border-color: rgba(224, 32, 32, 0.3);
}

.grid-item.danger .grid-label {
  color: var(--color-red-bright);
}

/* 自定義背景樣式 */
.background-settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 8px 16px;
}

.bg-setting-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bg-preview {
  aspect-ratio: 16/9;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-placeholder {
  font-size: 11px;
  color: var(--color-text-muted);
  opacity: 0.5;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.bg-preview:hover .bg-overlay,
.bg-preview:active .bg-overlay {
  opacity: 1;
}

.bg-btn {
  background: var(--color-gold-dark);
  color: #fff;
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
}

.bg-btn.reset {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.bg-name {
  font-size: 11px;
  text-align: center;
  color: var(--color-text-muted);
}

.zoom-slider-box {
  background: rgba(0, 0, 0, 0.2);
  padding: 16px;
  border-radius: 16px;
  margin-bottom: 12px;
}

.settings-slider {
  width: 100%;
  height: 6px;
  background: #333;
  border-radius: 3px;
  outline: none;
  appearance: none;
  margin-bottom: 12px;
}

.settings-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  background: var(--color-gold);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(201, 168, 76, 0.4);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--color-text-muted);
}

.scale-val {
  color: var(--color-gold-bright);
  font-weight: 800;
  font-family: monospace;
}

/* 存活與票數統計面板樣式 */
.stats-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 8px 16px 12px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 10px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.stat-card:hover {
  background: rgba(201, 168, 76, 0.05);
  border-color: rgba(201, 168, 76, 0.35);
  transform: translateY(-2px);
  box-shadow:
    0 6px 15px rgba(0, 0, 0, 0.25),
    0 0 10px rgba(201, 168, 76, 0.1) inset;
}

.stat-card-icon {
  font-size: 16px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.stat-card-val {
  font-size: 16px;
  font-weight: 900;
  color: var(--color-gold-bright, #e5b54f);
  text-shadow: 0 0 8px rgba(229, 181, 79, 0.25);
  font-family: var(--font-title), serif;
}

.stat-card-label {
  font-size: 9px;
  color: var(--color-text-muted);
  font-weight: 600;
  letter-spacing: 0.5px;
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

/* 獨立微調各個狀態圖示 */
.img-nomination {
  /* 提名權圖示微調 */
  transform: translate(0px, 0px);
}

.img-guillotine {
  /* 斷頭台處決門檻圖示微調 */
  transform: translate(0px, 0px);
}

.img-vote-yes {
  /* 投票打勾圖示：因右側綠色勾勾突出，視覺重心偏左，微調向右偏移以達到視覺居中 */
  transform: translate(3px, 0px);
}

.img-heart {
  /* 投票打勾圖示：因右側綠色勾勾突出，視覺重心偏左，微調向右偏移以達到視覺居中 */
  transform: translate(0px, 0px);
}

.img-theater {
  width: 30px;
  height: 30px;
  /* 確保圖片容器內部完美水平置中 */
  transform: translate(3px, 0px);
}


/* 雙圖示卡片堆疊扇形展開效果 (傳說奇遇) */
.grid-double-icon {
  position: relative;
  width: 54px;
  height: 48px;
  /* 👈 高度同步調整為 48px，使所有圖示佔位一致 */
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 2px;
}

.grid-double-icon .double-img {
  width: 80px;
  height: 80px;
  object-fit: contain;
  position: absolute;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 「傳說」圖示 (偏左下，底層) */
.grid-double-icon .fabled-img {
  left: -40px;
  z-index: 1;
  transform: scale(0.95) rotate(-10deg);
}

/* 「奇遇」圖示 (偏右上，頂層) */
.grid-double-icon .lorica-img {
  right: -40px;
  z-index: 0;
  transform: scale(1.1) rotate(6deg);
}

/* 當說書人懸停或點擊按鈕時，產生極具動態感的扇形散開特效 */
.grid-item:hover .grid-double-icon .fabled-img {
  transform: scale(1.0) translate(-6px, -1px) rotate(-18deg);
}

.grid-item:hover .grid-double-icon .lorica-img {
  transform: scale(1.15) translate(6px, 1px) rotate(14deg);
}

.grid-item:active .grid-double-icon .fabled-img {
  transform: scale(0.88) translate(-3px, 0px) rotate(-5deg);
}

.grid-item:active .grid-double-icon .lorica-img {
  transform: scale(1.05) translate(3px, 0px) rotate(3deg);
}

/* 提示標記收納上限樣式 */
.threshold-slider-box {
  padding: 8px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.threshold-counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 6px 16px;
  border-radius: 20px;
  max-width: 180px;
  margin: 0 auto;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.counter-btn {
  background: rgba(201, 168, 76, 0.08);
  border: 1px solid rgba(201, 168, 76, 0.25);
  color: var(--color-gold-bright);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
}

.counter-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--color-text-muted);
}

.counter-btn:not(:disabled):hover {
  background: rgba(201, 168, 76, 0.22);
  border-color: var(--color-gold-bright);
  transform: scale(1.08);
}

.counter-btn:not(:disabled):active {
  transform: scale(0.92);
}

.counter-value {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-gold-bright);
  min-width: 16px;
  text-align: center;
  text-shadow: 0 0 8px rgba(232, 160, 64, 0.3);
}

.text-center {
  text-align: center;
}

.threshold-tip {
  font-size: 10px;
  color: var(--color-text-muted);
  opacity: 0.85;
}

/* 自訂音效管理樣式 */
.sound-manager-box {
  padding: 8px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-sound-btn {
  width: 100%;
  background: rgba(201, 168, 76, 0.15);
  border: 1px dashed var(--color-gold);
  color: var(--color-gold-bright);
  border-radius: 10px;
  padding: 10px 0;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.import-sound-btn:hover {
  background: rgba(201, 168, 76, 0.25);
  box-shadow: 0 4px 12px rgba(201, 168, 76, 0.15);
}

.no-sounds-tip {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-muted);
  padding: 16px 0;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.sounds-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;
}

.sound-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 10px 12px;
  transition: all 0.2s ease;
}

.sound-item:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(201, 168, 76, 0.2);
}

.sound-item.is-pinned {
  background: rgba(201, 168, 76, 0.08);
  border-color: rgba(201, 168, 76, 0.4);
}

.sound-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.sound-pin-indicator {
  font-size: 12px;
}

.sound-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sound-tag {
  font-size: 9px;
  background: rgba(201, 168, 76, 0.25);
  color: var(--color-gold-bright);
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 700;
  border: 1px solid rgba(201, 168, 76, 0.3);
  margin-left: 6px;
}

.sound-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ccc;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  padding: 0;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
}

.action-btn.pin-btn.active {
  background: rgba(201, 168, 76, 0.2);
  border-color: var(--color-gold);
  color: var(--color-gold-bright);
}

.action-btn.play-btn.is-playing {
  background: rgba(231, 76, 60, 0.2);
  border-color: rgba(231, 76, 60, 0.5);
  color: #ff6b6b;
}

.action-btn.delete-btn:hover {
  background: rgba(231, 76, 60, 0.15);
  border-color: rgba(231, 76, 60, 0.3);
  color: #ff6b6b;
}

/* 軟體授權管理樣式 */
.license-settings-box {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.license-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
}

.info-label {
  color: #8c92a4;
}

.device-id-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 70%;
}

.device-id-text {
  font-family: monospace;
  color: #c9a84c;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.copy-btn-small {
  background: rgba(201, 168, 76, 0.15);
  border: 1px solid rgba(201, 168, 76, 0.3);
  color: #fce8b2;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn-small:hover {
  background: rgba(201, 168, 76, 0.25);
  border-color: #c9a84c;
}

.text-gold {
  color: #c9a84c;
  font-weight: 600;
}

.text-danger {
  color: #ff6b6b;
  font-weight: 600;
}

.license-action-form {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 12px;
  margin-top: 12px;
}

.form-row-compact {
  display: flex;
  gap: 8px;
  width: 100%;
}

.license-input-compact {
  flex: 1;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 8px 12px;
  color: white;
  font-size: 13px;
  outline: none;
}

.license-input-compact:focus {
  border-color: rgba(201, 168, 76, 0.4);
}

.license-btn-compact {
  background: linear-gradient(135deg, #a88530 0%, #856520 100%);
  border: 1px solid #c9a84c;
  color: white;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.license-btn-compact:hover {
  opacity: 0.9;
}

.license-btn-compact:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sound-toggle-row {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s, border-color 0.2s;
}

.sound-toggle-row:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(201, 168, 76, 0.2);
}

.sound-toggle-checkbox {
  margin: 0 10px 0 0;
  cursor: pointer;
  accent-color: #c9a84c;
  width: 15px;
  height: 15px;
}

.sound-toggle-label {
  font-size: 13px;
  color: #e0e0e0;
  cursor: pointer;
  letter-spacing: 0.5px;
}
</style>
