// UI Store ：管理頁面面板、彈窗與點選菜單狀態
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Player } from '../types'

export type Panel =
  | 'none'
  | 'night-order'
  | 'character-sheet'
  | 'script-selector'
  | 'script-import'
  | 'voting'
  | 'settings'
  | 'new-game'
  | 'player-order'
  | 'role-assignment'

export const useUIStore = defineStore('ui', () => {
  // 面板控制
  const activePanel = ref<Panel>('none')

  function openPanel(panel: Panel) { activePanel.value = panel }
  function closePanel() { activePanel.value = 'none' }
  function togglePanel(panel: Panel) {
    activePanel.value = activePanel.value === panel ? 'none' : panel
  }

  // 玩家右鍵菜單 (Context Menu)
  const contextMenuPlayer = ref<Player | null>(null)
  const contextMenuPos = ref({ x: 0, y: 0 })

  function openContextMenu(player: Player, pos: { x: number; y: number }) {
    contextMenuPlayer.value = player
    contextMenuPos.value = pos
  }

  function closeContextMenu() {
    contextMenuPlayer.value = null
  }

  // 選中玩家 (用於底部面板)
  const selectedPlayerId = ref<string | null>(null)

  function selectPlayer(playerId: string | null) {
    selectedPlayerId.value = playerId
  }

  // 角色選擇器 (Role Picker)
  const rolePickerPlayer = ref<Player | null>(null)
  const rolePickerDemonBluffIndex = ref<number | null>(null)

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

  const isRolePickerOpen = ref(false)

  // 提示標記 (Reminder Picker)
  const reminderPickerPlayerId = ref<string | null>(null)

  function openReminderPicker(playerId: string) {
    reminderPickerPlayerId.value = playerId
  }

  function closeReminderPicker() {
    reminderPickerPlayerId.value = null
  }

  // 新增玩家對話框
  const addPlayerDialogOpen = ref(false)

  // 投票與提名操作
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

  // 重新命名對話框
  const renameDialogPlayer = ref<Player | null>(null)

  function openRenameDialog(player: Player) {
    renameDialogPlayer.value = player
    closeContextMenu()
  }

  function closeRenameDialog() {
    renameDialogPlayer.value = null
  }

  // 確認對話框 (Confirm Dialog)
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

  return {
    // 面板
    activePanel, openPanel, closePanel, togglePanel,
    // 右鍵菜單
    contextMenuPlayer, contextMenuPos, openContextMenu, closeContextMenu,
    // 選中玩家
    selectedPlayerId, selectPlayer,
    // 角色選擇
    rolePickerPlayer, rolePickerDemonBluffIndex, isRolePickerOpen,
    openRolePicker, openRolePickerForBluff, closeRolePicker,
    // 提示標記
    reminderPickerPlayerId, openReminderPicker, closeReminderPicker,
    // 新增玩家
    addPlayerDialogOpen,
    // 投票
    activeNominationIndex, nominationNominatorId, nominationNomineeId,
    openVotingDetail, closeVotingDetail, startNomination,
    // 改名
    renameDialogPlayer, openRenameDialog, closeRenameDialog,
    // 確認對話框
    confirmDialog, showConfirm, closeConfirm,
  }
})
