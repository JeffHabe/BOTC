// UI Store ：管理頁面面板、彈窗與點選菜單狀態
import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import type { Player } from '../types'
import { playClocktowerBell, unlockAudio } from '../utils/audio'
import { invoke } from '@tauri-apps/api/core'

export type Panel =
  | 'none'
  | 'night-order'
  | 'character-sheet'
  | 'character-editor'
  | 'script-import'
  | 'voting'
  | 'settings'
  | 'new-game'
  | 'player-order'
  | 'role-assignment'
  | 'game-log'
  | 'fabled-selector'
  | 'whiteboard'

export type ReminderLayout = 'arc' | 'grid' | 'stack' | 'inner'
export type GrimoireShape = 'circle' | 'oval' | 'rect'

export const useUIStore = defineStore('ui', () => {
  // --- 面板控制 ---
  const activePanel = ref<Panel>('none')
  // 記錄夜晚行動順序的捲動位置
  const nightOrderScrollPos = ref(0)

  function openPanel(panel: Panel) { activePanel.value = panel }
  function closePanel() { activePanel.value = 'none' }
  function togglePanel(panel: Panel) {
    activePanel.value = activePanel.value === panel ? 'none' : panel
  }
  function setNightOrderScroll(pos: number) {
    nightOrderScrollPos.value = pos
  }

  // --- 提示標記佈局方案 ---
  const reminderLayout = ref<ReminderLayout>(
    (localStorage.getItem('botc-reminder-layout') as ReminderLayout) || 'inner'
  )

  const grimoireShape = ref<GrimoireShape>(
    (localStorage.getItem('botc-grimoire-shape') as GrimoireShape) || 'oval'
  )

  const grimoireScale = ref(
    parseFloat(localStorage.getItem('botc-grimoire-scale') || '1.0')
  )

  const viewScale = ref(1.0) // 雙指縮放使用的視角縮放
  const zoomOrigin = ref('center 55%') // 縮放中心點

  function setReminderLayout(layout: ReminderLayout) {
    reminderLayout.value = layout
    localStorage.setItem('botc-reminder-layout', layout)
  }

  function setGrimoireShape(shape: GrimoireShape) {
    grimoireShape.value = shape
    localStorage.setItem('botc-grimoire-shape', shape)
  }

  function setGrimoireScale(scale: number) {
    grimoireScale.value = Math.min(Math.max(scale, 0.5), 2.5) // 限制範圍
    localStorage.setItem('botc-grimoire-scale', grimoireScale.value.toString())
  }

  function zoomIn() { setGrimoireScale(grimoireScale.value + 0.1) }
  function zoomOut() { setGrimoireScale(grimoireScale.value - 0.1) }
  function resetZoom() { 
    setGrimoireScale(1.0) 
    viewScale.value = 1.0 // 重置視角
    resetPan()
  }

  function setViewScale(scale: number) {
    viewScale.value = Math.min(Math.max(scale, 0.5), 3.0)
  }

  function setZoomOrigin(origin: string) {
    zoomOrigin.value = origin
  }

  function cycleGrimoireShape() {
    const shapes: GrimoireShape[] = ['circle', 'oval', 'rect']
    const currentIndex = shapes.indexOf(grimoireShape.value)
    const nextIndex = (currentIndex + 1) % shapes.length
    setGrimoireShape(shapes[nextIndex])
  }

  function cycleReminderLayout() {
    const layouts: ReminderLayout[] = ['arc', 'grid', 'stack', 'inner']
    const idx = layouts.indexOf(reminderLayout.value)
    const nextIdx = (idx + 1) % layouts.length
    setReminderLayout(layouts[nextIdx])
  }

  // --- 玩家右鍵菜單 (Context Menu) ---
  const contextMenuPlayer = ref<Player | null>(null)
  const contextMenuPos = ref({ x: 0, y: 0 })

  function openContextMenu(player: Player, pos: { x: number; y: number }) {
    contextMenuPlayer.value = player
    contextMenuPos.value = pos
  }

  function closeContextMenu() {
    contextMenuPlayer.value = null
  }

  // --- 選中玩家 (用於底部面板) ---
  const selectedPlayerId = ref<string | null>(null)

  function selectPlayer(playerId: string | null) {
    selectedPlayerId.value = playerId
  }

  // --- 角色選擇器 (Role Picker) ---
  const rolePickerPlayer = ref<Player | null>(null)
  const rolePickerDemonBluffIndex = ref<number | null>(null)
  const rolePickerLunaticBluffIndex = ref<number | null>(null)
  const isRolePickerOpen = computed(() => 
    rolePickerPlayer.value !== null || 
    rolePickerDemonBluffIndex.value !== null ||
    rolePickerLunaticBluffIndex.value !== null
  )

  function openRolePicker(player: Player) {
    rolePickerPlayer.value = player
    rolePickerDemonBluffIndex.value = null
    rolePickerLunaticBluffIndex.value = null
  }

  function openRolePickerForBluff(index: number) {
    rolePickerPlayer.value = null
    rolePickerDemonBluffIndex.value = index
    rolePickerLunaticBluffIndex.value = null
  }

  function openRolePickerForLunaticBluff(index: number) {
    rolePickerPlayer.value = null
    rolePickerDemonBluffIndex.value = null
    rolePickerLunaticBluffIndex.value = index
  }

  function closeRolePicker() {
    rolePickerPlayer.value = null
    rolePickerDemonBluffIndex.value = null
    rolePickerLunaticBluffIndex.value = null
  }

  // --- 提示標記選擇器 (Reminder Picker) ---
  const reminderPickerPlayerId = ref<string | null>(null)

  function openReminderPicker(playerId: string) {
    reminderPickerPlayerId.value = playerId
  }

  function closeReminderPicker() {
    reminderPickerPlayerId.value = null
  }

  // --- 彈窗狀態 ---
  const addPlayerDialogOpen = ref(false)
  const renameDialogPlayer = ref<Player | null>(null)

  function openRenameDialog(player: Player) {
    renameDialogPlayer.value = player
    closeContextMenu()
  }

  function closeRenameDialog() {
    renameDialogPlayer.value = null
  }

  // --- 投票與提名操作 ---
  const activeNominationIndex = ref<number | null>(null)
  const nominationNominatorId = ref('')
  const nominationNomineeId = ref('')

  function openVotingDetail(index: number) {
    activeNominationIndex.value = index
  }

  function closeVotingDetail() {
    activeNominationIndex.value = null
  }

  function startNomination(nominatorId: string, nomineeId: string) {
    nominationNominatorId.value = nominatorId
    nominationNomineeId.value = nomineeId
    activePanel.value = 'voting'
  }

  // --- 確認對話框 (Confirm Dialog) ---
  const confirmDialog = ref<{
    title: string
    message: string
    onConfirm: () => void
    danger?: boolean
  } | null>(null)

  function showConfirm(title: string, message: string, onConfirm: () => void, danger = false) {
    confirmDialog.value = { title, message, onConfirm, danger }
  }

  function closeConfirm() {
    confirmDialog.value = null
  }

  const isBluffsExpanded = ref(false)
  const isBluffsShowcase = ref(false)
  const activeBluffTab = ref<'demon' | 'lunatic'>('demon')
  const isSingleRoleShowcase = ref(false)

  // --- 角色池與劇本預設標籤 ---
  const activePoolPresetId = ref(localStorage.getItem('botc-pool-id') || '')
  const activePoolPresetName = ref(localStorage.getItem('botc-pool-name') || '')

  let initialExcluded: string[] = []
  try {
    const saved = localStorage.getItem('botc-pool-excluded')
    if (saved) initialExcluded = JSON.parse(saved)
  } catch (e) { }
  const excludedPoolIds = ref<string[]>(initialExcluded)

  watch(activePoolPresetId, (val) => {
    if (val) localStorage.setItem('botc-pool-id', val)
    else localStorage.removeItem('botc-pool-id')
  })

  watch(activePoolPresetName, (val) => {
    if (val) localStorage.setItem('botc-pool-name', val)
    else localStorage.removeItem('botc-pool-name')
  })

  watch(excludedPoolIds, (val) => {
    localStorage.setItem('botc-pool-excluded', JSON.stringify(val))
  }, { deep: true })

  // --- 隱私模式 (隱藏所有角色) ---
  const isRolesHidden = ref(false)
  function toggleRolesHidden() {
    isRolesHidden.value = !isRolesHidden.value
  }

  // --- 排列模式 (Arrange Mode) ---
  const isArrangingPlayers = ref(false)
  function toggleArrangingPlayers() {
    isArrangingPlayers.value = !isArrangingPlayers.value
  }

  // --- 側邊工具列 (Side Toolbar) ---
  const isSideToolbarExpanded = ref(false)

  // --- 計時器 (Timer) ---
  const timerRemaining = ref(0) // 剩餘秒數
  const timerTotal = ref(0) // 預設 0 分鐘
  const isTimerRunning = ref(false)
  const isTimerExpanded = ref(false)
  const timerTargetTimestamp = ref<number | null>(null) // 結束的時間戳記
  let timerInterval: number | null = null

  const isTimerSoundEnabled = ref(localStorage.getItem('botc-timer-sound') !== 'false')
  const isTimerNotificationEnabled = ref(localStorage.getItem('botc-timer-notification') !== 'false')

  function setTimerSoundEnabled(enabled: boolean) {
    isTimerSoundEnabled.value = enabled
    localStorage.setItem('botc-timer-sound', String(enabled))
  }

  function setTimerNotificationEnabled(enabled: boolean) {
    isTimerNotificationEnabled.value = enabled
    localStorage.setItem('botc-timer-notification', String(enabled))
  }

  // --- 縮放控制 (Zoom Control) ---

  // --- 自定義背景圖 ---
  const customDayBackground = ref<string | null>(localStorage.getItem('botc-custom-day-bg'))
  const customNightBackground = ref<string | null>(localStorage.getItem('botc-custom-night-bg'))

  function setDayBackground(src: string | null) {
    customDayBackground.value = src
    if (src) localStorage.setItem('botc-custom-day-bg', src)
    else localStorage.removeItem('botc-custom-day-bg')
  }

  function setNightBackground(src: string | null) {
    customNightBackground.value = src
    if (src) localStorage.setItem('botc-custom-night-bg', src)
    else localStorage.removeItem('botc-custom-night-bg')
  }


  // --- 平移控制 (Pan Control) ---
  const grimoireTranslateX = ref(0)
  const grimoireTranslateY = ref(0)

  function setGrimoireTranslate(x: number, y: number) {
    grimoireTranslateX.value = x
    grimoireTranslateY.value = y
  }

  function resetPan() {
    grimoireTranslateX.value = 0
    grimoireTranslateY.value = 0
  }

  function startTimer() {
    if (timerRemaining.value <= 0) return
    if (!isTimerRunning.value) {
      isTimerRunning.value = true

      // 用戶點擊「開始」時，立即解鎖音訊權限
      unlockAudio()

      // 針對 Android 背景優化：在後端啟動計時通知
      if (isTimerNotificationEnabled.value) {
        invoke('start_background_timer', { seconds: timerRemaining.value })
      }

      // 核心改進：記錄結束的時間點，防止鎖屏暫停
      timerTargetTimestamp.value = Date.now() + (timerRemaining.value * 1000)

      timerInterval = window.setInterval(() => {
        if (timerTargetTimestamp.value) {
          const now = Date.now()
          const diff = Math.ceil((timerTargetTimestamp.value - now) / 1000)

          if (diff > 0) {
            timerRemaining.value = diff
          } else {
            // 防止重音：使用全域 window 鎖定
            if (!(window as any)._botc_bell_playing) {
              (window as any)._botc_bell_playing = true;
              
              // 計時結束：自動執行重置
              resetTimer()
              
              // 觸發提醒：鐘聲立刻響
              if (isTimerSoundEnabled.value) {
                playClocktowerBell()
              }

              // 移除重複的前端通知，交給後端 start_background_timer 處理即可

              // 3 秒後解除全域鎖
              setTimeout(() => { (window as any)._botc_bell_playing = false; }, 3000);
            }
          }
        }
      }, 1000)
    }
  }

  function pauseTimer() {
    isTimerRunning.value = false
    timerTargetTimestamp.value = null
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  function resetTimer() {
    pauseTimer()
    timerRemaining.value = 0
    timerTotal.value = 0
    timerTargetTimestamp.value = null
  }

  /**
   * 當 App 從背景回到前景時校準時間
   */
  function calibrateTimer() {
    if (isTimerRunning.value && timerTargetTimestamp.value) {
      const now = Date.now()
      const diff = Math.ceil((timerTargetTimestamp.value - now) / 1000)
      if (diff <= 0) {
        // 防止重音：使用全域 window 鎖定
        if (!(window as any)._botc_bell_playing) {
          (window as any)._botc_bell_playing = true;

          // 背景恢復時發現已到點：自動執行重置
          resetTimer()
          
          // 補發提醒
          if (isTimerSoundEnabled.value) {
            playClocktowerBell()
          }

          // 移除重複的前端通知，交給後端處理

          // 3 秒後解除全域鎖
          setTimeout(() => { (window as any)._botc_bell_playing = false; }, 3000);
        }
      } else {
        timerRemaining.value = diff
      }
    }
  }

  function addTimerSeconds(seconds: number) {
    // 如果計時器已經歸零且未在執行，視為新的一輪，重置總量
    if (timerRemaining.value === 0 && !isTimerRunning.value) {
      timerTotal.value = 0
    }
    
    timerTotal.value = Math.max(0, timerTotal.value + seconds)
    // 如果計時器未啟動，則同步更新剩餘時間
    if (!isTimerRunning.value) {
      timerRemaining.value = timerTotal.value
    } else {
      timerRemaining.value = Math.max(0, timerRemaining.value + seconds)
    }
  }

  // --- 手機端邊緣滑動返回 (History API) 與全域 Esc 攔截 ---
  const isAnyOverlayOpen = computed(() => {
    return activePanel.value !== 'none' ||
      addPlayerDialogOpen.value ||
      renameDialogPlayer.value !== null ||
      confirmDialog.value !== null ||
      isRolePickerOpen.value ||
      reminderPickerPlayerId.value !== null ||
      isBluffsShowcase.value ||
      isSingleRoleShowcase.value ||
      isArrangingPlayers.value ||
      selectedPlayerId.value !== null
  })

  let isHistoryPushed = false
  let isProgrammaticBack = false

  watch(isAnyOverlayOpen, (isOpen) => {
    if (isOpen && !isHistoryPushed) {
      // 當開啟任一彈出層且尚未寫入歷史紀錄時，推入一筆虛擬 state 攔截手機端邊緣滑動返回
      window.history.pushState({ botcOverlay: true }, '')
      isHistoryPushed = true
    } else if (!isOpen && isHistoryPushed) {
      // 當所有彈出層均已透過按鈕或程式碼手動關閉，需自動出棧剛才推入的 state
      isHistoryPushed = false
      isProgrammaticBack = true
      window.history.back()
    }
  })

  // 監聽 popstate (使用者觸發手機邊緣向內滑動返回或瀏覽器上一頁)
  window.addEventListener('popstate', () => {
    if (isProgrammaticBack) {
      // 若是程式碼自動清理 stack 觸發的 popstate，不做任何處理
      isProgrammaticBack = false
      return
    }

    if (isHistoryPushed) {
      isHistoryPushed = false
      // 阻止預設行為並模擬發送實體 Escape 按鍵事件，交給對應開啟中元件的 handleKeydown 處理收合
      window.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'Escape', 
        code: 'Escape', 
        bubbles: true,
        cancelable: true 
      }))

      // 由於 topmost 元件可能僅關閉了其內部的二級說明窗 (如 longPressChar) 或仍有下層彈窗處於開啟狀態，
      // 延遲檢查若仍有彈出層處於開啟狀態，則再次寫入保護性 history state
      setTimeout(() => {
        if (isAnyOverlayOpen.value && !isHistoryPushed) {
          window.history.pushState({ botcOverlay: true }, '')
          isHistoryPushed = true
        }
      }, 60)
    }
  })

  // 針對沒有專屬元件監聽 Escape 的特殊展示層，提供全域 Escape 支援
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (isBluffsShowcase.value) {
        e.stopImmediatePropagation()
        isBluffsShowcase.value = false
      } else if (isSingleRoleShowcase.value) {
        e.stopImmediatePropagation()
        isSingleRoleShowcase.value = false
      } else if (isArrangingPlayers.value) {
        e.stopImmediatePropagation()
        isArrangingPlayers.value = false
      }
    }
  })

  return {
    // 面板
    activePanel, openPanel, closePanel, togglePanel,
    // 佈局
    reminderLayout, setReminderLayout, cycleReminderLayout,
    grimoireShape, setGrimoireShape, cycleGrimoireShape,
    isBluffsExpanded, isBluffsShowcase, isSingleRoleShowcase, activeBluffTab,
    // 右鍵菜單
    contextMenuPlayer, contextMenuPos, openContextMenu, closeContextMenu,
    // 玩家選中
    selectedPlayerId, selectPlayer,
    // 角色選擇
    rolePickerPlayer, rolePickerDemonBluffIndex, rolePickerLunaticBluffIndex, isRolePickerOpen,
    openRolePicker, openRolePickerForBluff, openRolePickerForLunaticBluff, closeRolePicker,
    // 提示標記
    reminderPickerPlayerId, openReminderPicker, closeReminderPicker,
    // 彈窗
    addPlayerDialogOpen, renameDialogPlayer, openRenameDialog, closeRenameDialog,
    // 投票
    activeNominationIndex, nominationNominatorId, nominationNomineeId,
    openVotingDetail, closeVotingDetail, startNomination,
    // 確認框
    confirmDialog, showConfirm, closeConfirm,
    // 角色池
    activePoolPresetId, activePoolPresetName, excludedPoolIds,
    // 隱私模式
    isRolesHidden, toggleRolesHidden,
    // 排列模式
    isArrangingPlayers, toggleArrangingPlayers,
    // 計時器
    timerRemaining, timerTotal, isTimerRunning, isTimerExpanded, timerTargetTimestamp,
    isTimerSoundEnabled, isTimerNotificationEnabled,
    setTimerSoundEnabled, setTimerNotificationEnabled,
    startTimer, pauseTimer, resetTimer, addTimerSeconds, calibrateTimer,
    // 縮放與平移控制
    grimoireScale, setGrimoireScale, zoomIn, zoomOut, resetZoom,
    viewScale, setViewScale, zoomOrigin, setZoomOrigin,
    grimoireTranslateX, grimoireTranslateY, setGrimoireTranslate, resetPan,
    // 背景圖片
    customDayBackground, customNightBackground, setDayBackground, setNightBackground,
    // 側邊工具列
    isSideToolbarExpanded,
    // 夜晚捲動位置
    nightOrderScrollPos, setNightOrderScroll
  }
})
