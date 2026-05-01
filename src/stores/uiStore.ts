// UI Store ：管理頁面面板、彈窗與點選菜單狀態
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Player } from '../types'

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

export type ReminderLayout = 'arc' | 'grid' | 'stack' | 'inner'

export const useUIStore = defineStore('ui', () => {
  // --- 面板控制 ---
  const activePanel = ref<Panel>('none')

  function openPanel(panel: Panel) { activePanel.value = panel }
  function closePanel() { activePanel.value = 'none' }
  function togglePanel(panel: Panel) {
    activePanel.value = activePanel.value === panel ? 'none' : panel
  }

  // --- 提示標記佈局方案 ---
  const reminderLayout = ref<ReminderLayout>(
    (localStorage.getItem('botc-reminder-layout') as ReminderLayout) || 'arc'
  )

  function setReminderLayout(layout: ReminderLayout) {
    reminderLayout.value = layout
    localStorage.setItem('botc-reminder-layout', layout)
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
  const isRolePickerOpen = ref(false)

  function openRolePicker(player: Player) {
    rolePickerPlayer.value = player
    rolePickerDemonBluffIndex.value = null
  }

  function openRolePickerForBluff(index: number) {
    rolePickerPlayer.value = null
    rolePickerDemonBluffIndex.value = index
  }

  function closeRolePicker() {
    rolePickerPlayer.value = null
    rolePickerDemonBluffIndex.value = null
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
  const isSingleRoleShowcase = ref(false)

  // --- 角色池與劇本預設標籤 ---
  const activePoolPresetId = ref(localStorage.getItem('botc-pool-id') || '')
  const activePoolPresetName = ref(localStorage.getItem('botc-pool-name') || '')
  
  let initialExcluded: string[] = []
  try {
    const saved = localStorage.getItem('botc-pool-excluded')
    if (saved) initialExcluded = JSON.parse(saved)
  } catch (e) {}
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

  // --- 倒數計時器 (Timer) ---
  const timerRemaining = ref(0) // 剩餘秒數
  const timerTotal = ref(300) // 預設 5 分鐘
  const isTimerRunning = ref(false)
  const isTimerExpanded = ref(false)
  const timerTargetTimestamp = ref<number | null>(null) // 結束的時間戳記
  let timerInterval: number | null = null

  // --- 縮放控制 (Zoom Control) ---
  const grimoireScale = ref(Number(localStorage.getItem('botc-grimoire-scale')) || 1.0)
  
  function setGrimoireScale(scale: number) {
    const clamped = Math.min(Math.max(scale, 0.5), 2.0)
    grimoireScale.value = clamped
    localStorage.setItem('botc-grimoire-scale', String(clamped))
  }

  function zoomIn() { setGrimoireScale(grimoireScale.value + 0.1) }
  function zoomOut() { setGrimoireScale(grimoireScale.value - 0.1) }
  function resetZoom() { 
    setGrimoireScale(1.0) 
    resetPan()
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
      
      // 核心改進：記錄結束的時間點，防止鎖屏暫停
      timerTargetTimestamp.value = Date.now() + (timerRemaining.value * 1000)

      timerInterval = window.setInterval(() => {
        if (timerTargetTimestamp.value) {
          const now = Date.now()
          const diff = Math.ceil((timerTargetTimestamp.value - now) / 1000)
          
          if (diff > 0) {
            timerRemaining.value = diff
          } else {
            timerRemaining.value = 0
            pauseTimer()
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
      timerRemaining.value = Math.max(0, diff)
      if (diff <= 0) pauseTimer()
    }
  }

  function addTimerSeconds(seconds: number) {
    timerTotal.value = Math.max(0, timerTotal.value + seconds)
    // 如果計時器未啟動或已歸零，則同步更新剩餘時間
    if (!isTimerRunning.value) {
      timerRemaining.value = timerTotal.value
    } else {
      timerRemaining.value = Math.max(0, timerRemaining.value + seconds)
    }
  }

  return {
    // 面板
    activePanel, openPanel, closePanel, togglePanel,
    // 佈局
    reminderLayout, setReminderLayout, cycleReminderLayout,
    isBluffsExpanded, isBluffsShowcase, isSingleRoleShowcase,
    // 右鍵菜單
    contextMenuPlayer, contextMenuPos, openContextMenu, closeContextMenu,
    // 玩家選中
    selectedPlayerId, selectPlayer,
    // 角色選擇
    rolePickerPlayer, rolePickerDemonBluffIndex, isRolePickerOpen,
    openRolePicker, openRolePickerForBluff, closeRolePicker,
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
    // 計時器
    timerRemaining, timerTotal, isTimerRunning, isTimerExpanded, timerTargetTimestamp,
    startTimer, pauseTimer, resetTimer, addTimerSeconds, calibrateTimer,
    // 縮放與平移控制
    grimoireScale, setGrimoireScale, zoomIn, zoomOut, resetZoom,
    grimoireTranslateX, grimoireTranslateY, setGrimoireTranslate, resetPan
  }
})
