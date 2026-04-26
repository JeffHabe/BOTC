// 血染鐘樓助手 Pinia 遊戲狀態 Store
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { GameState, CharacterDef, Script, GamePhase } from '../types'
import { aliveCount, deadCount, executionThreshold } from '../types'

export const useGameStore = defineStore('game', () => {
  // 核心狀態
  const state = ref<GameState | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 計算屬性
  const players = computed(() => state.value?.players ?? [])
  const script = computed(() => state.value?.script ?? null)
  const phase = computed(() => state.value?.phase ?? 'Setup')
  const round = computed(() => state.value?.round ?? 0)
  const demonBluffs = computed(() => state.value?.demon_bluffs ?? [null, null, null])
  const nominations = computed(() => state.value?.nominations ?? [])

  const alive = computed(() => state.value ? aliveCount(state.value) : 0)
  const dead = computed(() => state.value ? deadCount(state.value) : 0)
  const threshold = computed(() => state.value ? executionThreshold(state.value) : 0)

  const isNight = computed(() =>
    phase.value === 'Night' || phase.value === 'FirstNight'
  )

  const townfolkCount = computed(() =>
    script.value?.characters.filter(c => c.role_type === 'Townsfolk').length ?? 0
  )
  const outsiderCount = computed(() =>
    script.value?.characters.filter(c => c.role_type === 'Outsider').length ?? 0
  )
  const minionCount = computed(() =>
    script.value?.characters.filter(c => c.role_type === 'Minion').length ?? 0
  )
  const demonCount = computed(() =>
    script.value?.characters.filter(c => c.role_type === 'Demon').length ?? 0
  )

  // 首夜順序
  const firstNightOrder = computed(() => {
    if (!script.value) return []
    return [...script.value.characters]
      .filter(c => c.night_order_first != null)
      .sort((a, b) => (a.night_order_first ?? 999) - (b.night_order_first ?? 999))
  })

  // 其他夜晚順序
  const otherNightOrder = computed(() => {
    if (!script.value) return []
    return [...script.value.characters]
      .filter(c => c.night_order_other != null)
      .sort((a, b) => (a.night_order_other ?? 999) - (b.night_order_other ?? 999))
  })

  // 內部輔助函數
  async function callCommand<T = GameState>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      const result = await invoke<T>(cmd, args)
      return result
    } catch (e) {
      error.value = String(e)
      console.error(`[${cmd}] 錯誤:`, e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function syncState(newState: GameState | null) {
    if (newState) state.value = newState
  }

  // 遊戲與初始化
  async function loadState() {
    const gs = await callCommand<GameState>('get_game_state')
    await syncState(gs)
  }

  async function newGame() {
    const gs = await callCommand<GameState>('new_game')
    await syncState(gs)
  }

  async function resetPlayersState() {
    const gs = await callCommand<GameState>('reset_players_state')
    await syncState(gs)
  }

  async function setScript(script: Script) {
    // 兼容性處理：前端可能發送角色類型，Rust 後端要求全小寫
    const compatScript = JSON.parse(JSON.stringify(script)) as Script
    compatScript.characters.forEach(c => {
      c.role_type = c.role_type.toLowerCase() as any
    })

    const gs = await callCommand<GameState>('set_script', { script: compatScript })
    await syncState(gs)
  }

  // 玩家管理
  async function addPlayer(name: string) {
    const gs = await callCommand<GameState>('add_player', { name })
    await syncState(gs)
  }

  async function setPlayerCount(count: number) {
    const gs = await callCommand<GameState>('set_player_count', { count })
    await syncState(gs)
  }

  async function removePlayer(playerId: string) {
    const gs = await callCommand<GameState>('remove_player', { playerId })
    await syncState(gs)
  }

  async function renamePlayer(playerId: string, newName: string) {
    const gs = await callCommand<GameState>('rename_player', { playerId, newName })
    await syncState(gs)
  }

  async function swapSeats(playerIdA: string, playerIdB: string) {
    const gs = await callCommand<GameState>('swap_seats', { playerIdA, playerIdB })
    await syncState(gs)
  }

  async function reorderPlayers(playerIds: string[]) {
    const gs = await callCommand<GameState>('reorder_players', { playerIds })
    await syncState(gs)
  }

  // 角色發派
  async function assignRole(playerId: string, role: CharacterDef | null) {
    const gs = await callCommand<GameState>('assign_role', { playerId, role })
    await syncState(gs)
  }

  async function setDemonBluff(index: number, role: CharacterDef | null) {
    const gs = await callCommand<GameState>('set_demon_bluff', { index, role })
    await syncState(gs)
  }

  async function bulkAssignRoles(assignments: { player_id: string, role: CharacterDef | null }[], bluffs: (CharacterDef | null)[]) {
    const gs = await callCommand<GameState>('bulk_assign_roles', { assignments, bluffs })
    await syncState(gs)
  }

  // 標記與提示
  async function addReminder(playerId: string, text: string, sourceRole: string) {
    const gs = await callCommand<GameState>('add_reminder', { playerId, text, sourceRole })
    await syncState(gs)
  }

  async function removeReminder(playerId: string, reminderId: string) {
    const gs = await callCommand<GameState>('remove_reminder', { playerId, reminderId })
    await syncState(gs)
  }

  async function updateReminder(playerId: string, reminderId: string, newText: string) {
    const gs = await callCommand<GameState>('update_reminder', { playerId, reminderId, newText })
    await syncState(gs)
  }

  // 死亡與幽靈票
  async function killPlayer(playerId: string) {
    const gs = await callCommand<GameState>('kill_player', { playerId })
    await syncState(gs)
  }

  async function revivePlayer(playerId: string) {
    const gs = await callCommand<GameState>('revive_player', { playerId })
    await syncState(gs)
  }

  async function toggleAlive(playerId: string) {
    const player = players.value.find(p => p.id === playerId)
    if (!player) return
    if (player.is_alive) {
      await killPlayer(playerId)
    } else {
      await revivePlayer(playerId)
    }
  }

  async function toggleGhostVote(playerId: string) {
    const player = players.value.find(p => p.id === playerId)
    if (!player) return
    const gs = await callCommand<GameState>('toggle_ghost_vote', { playerId })
    await syncState(gs)
  }

  async function toggleCanNominate(playerId: string) {
    const player = players.value.find(p => p.id === playerId)
    if (!player) return
    const gs = await callCommand<GameState>('toggle_can_nominate', { playerId })
    await syncState(gs)
  }

  async function useGhostVote(playerId: string) {
    const gs = await callCommand<GameState>('use_ghost_vote', { playerId })
    await syncState(gs)
  }

  // 遊戲階段轉換
  async function advancePhase() {
    const gs = await callCommand<GameState>('advance_phase')
    await syncState(gs)
  }

  async function revertPhase() {
    const gs = await callCommand<GameState>('revert_phase')
    await syncState(gs)
  }

  async function setPhase(phase: GamePhase) {
    const gs = await callCommand<GameState>('set_phase', { phase })
    await syncState(gs)
  }

  async function nominate(nominatorId: string, nomineeId: string) {
    const gs = await callCommand<GameState>('nominate', { nominatorId, nomineeId })
    await syncState(gs)
  }

  async function editNomination(nominationIndex: number, newNominatorId: string, newNomineeId: string) {
    const gs = await callCommand<GameState>('edit_nomination', { nominationIndex, newNominatorId, newNomineeId })
    await syncState(gs)
  }

  async function vote(nominationIndex: number, voterId: string) {
    const gs = await callCommand<GameState>('vote', { nominationIndex, voterId })
    await syncState(gs)
  }

  async function execute(nominationIndex: number) {
    const gs = await callCommand<GameState>('execute', { nominationIndex })
    await syncState(gs)
  }

  async function undoExecution(nominationIndex: number) {
    const gs = await callCommand<GameState>('undo_execution', { nominationIndex })
    await syncState(gs)
  }

  // 數據匯入匯出
  async function exportState(): Promise<string | null> {
    return await callCommand<string>('export_game_state')
  }

  async function importState(jsonStr: string) {
    const gs = await callCommand<GameState>('import_game_state', { jsonStr })
    await syncState(gs)
  }

  async function importCustomScript(jsonStr: string) {
    const gs = await callCommand<GameState>('import_custom_script', { jsonStr })
    await syncState(gs)
  }

  return {
    state, loading, error,
    players, script, phase, round, demonBluffs, nominations,
    alive, dead, threshold, isNight,
    townfolkCount, outsiderCount, minionCount, demonCount,
    firstNightOrder, otherNightOrder,
    loadState, newGame, resetPlayersState, setScript,
    addPlayer, setPlayerCount, removePlayer, renamePlayer, swapSeats, reorderPlayers,
    assignRole, setDemonBluff, bulkAssignRoles,
    addReminder, removeReminder, updateReminder,
    killPlayer, revivePlayer, toggleAlive, toggleGhostVote, toggleCanNominate, useGhostVote,
    advancePhase, revertPhase, setPhase,
    nominate, editNomination, vote, execute, undoExecution,
    exportState, importState, importCustomScript,
  }
})
