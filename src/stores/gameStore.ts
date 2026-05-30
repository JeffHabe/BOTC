// 血染鐘樓助手 Pinia 遊戲狀態 Store
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { GameState, CharacterDef, Script, GamePhase } from '../types'
import { logger } from '../utils/logger'
import { aliveCount, deadCount, executionThreshold } from '../types'

export interface GameLogEntry {
  id: string
  timestamp: number
  day: number
  phase: GamePhase
  type: 'phase' | 'action' | 'death' | 'assignment' | 'note' | 'reminder'
  content: string
  details?: any
}

export const useGameStore = defineStore('game', () => {
  // 核心狀態
  const state = ref<GameState | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const logs = ref<GameLogEntry[]>([])
  const nightNotes = ref(localStorage.getItem('botc-night-notes') || '')
  const nightNotesFontSize = ref(Number(localStorage.getItem('botc-night-notes-font-size')) || 24)
  const nightNotesColor = ref(localStorage.getItem('botc-night-notes-color') || '#e5b54f')
  
  const defaultHintTemplates = [
    '該角色能力對你生效...',
    '這些角色不在場...',
    '你是...'
  ]
  const savedHintTemplates = localStorage.getItem('botc-hint-templates')
  const hintTemplates = ref<string[]>(savedHintTemplates ? JSON.parse(savedHintTemplates) : [...defaultHintTemplates])

  // 曾經上場過的角色 ID 歷史紀錄 (用於提示標記面板)
  const historicalRoleIds = ref<Set<string>>(new Set())

  // 計算屬性
  const players = computed(() => state.value?.players ?? [])
  const script = computed(() => state.value?.script ?? null)
  const phase = computed(() => state.value?.phase ?? 'Setup')
  const round = computed(() => state.value?.round ?? 0)
  const demonBluffs = computed(() => state.value?.demon_bluffs ?? [null, null, null])
  const lunaticBluffs = computed(() => state.value?.lunatic_bluffs ?? [null, null, null])
  const nominations = computed(() => state.value?.nominations ?? [])
  const activeFabled = computed(() => state.value?.active_fabled ?? [])

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

  // 場上角色的相對順序計算
  const relativeNightOrder = computed(() => {
    const inPlayRoles = players.value
      .map(p => p.role)
      .filter((r): r is CharacterDef => r !== null)

    // 取得不重複的角色清單（避免雙胞胎等特殊情況重複計算）
    const uniqueRoles = Array.from(new Map(inPlayRoles.map(r => [r.id, r])).values())

    // 計算首夜相對順序
    const firstOrder = uniqueRoles
      .filter(r => r.night_order_first != null)
      .sort((a, b) => (a.night_order_first ?? 0) - (b.night_order_first ?? 0))
    
    // 計算其他夜晚相對順序
    const otherOrder = uniqueRoles
      .filter(r => r.night_order_other != null)
      .sort((a, b) => (a.night_order_other ?? 0) - (b.night_order_other ?? 0))

    return {
      first: Object.fromEntries(firstOrder.map((r, i) => [r.id, i + 1])),
      other: Object.fromEntries(otherOrder.map((r, i) => [r.id, i + 1]))
    }
  })

  // 內部輔助函數
  async function callCommand<T = GameState>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
    loading.value = true
    error.value = null
    logger.debug(`呼叫 Tauri 指令 [${cmd}], 參數:`, args)
    try {
      const result = await invoke<T>(cmd, args)
      return result
    } catch (e) {
      error.value = String(e)
      logger.error(`[${cmd}] 呼叫失敗: ${e}`, { args })
      return null
    } finally {
      loading.value = false
    }
  }

  async function syncState(newState: GameState | null) {
    if (newState) {
      // 自動記錄所有曾上場過的角色 ID
      newState.players.forEach(p => {
        if (p.role) historicalRoleIds.value.add(p.role.id)
      })
      state.value = newState
      // 如果後端返回的狀態包含日誌，則同步它
      if ((newState as any).game_logs) {
        logs.value = (newState as any).game_logs
      }
    }
  }

  function addLog(type: GameLogEntry['type'], content: string, details?: any) {
    logs.value.push({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      day: round.value,
      phase: phase.value,
      type,
      content,
      details
    })
  }

  function updateScriptName(newName: string) {
    if (state.value && state.value.script) {
      const oldName = state.value.script.name
      state.value.script.name = newName
      addLog('note', `劇本更名：${oldName} -> ${newName}`)
      saveState()
    }
  }

  async function saveState() {
    if (state.value) {
      // 確保日誌也被包含在存檔中
      const fullState = { ...state.value, game_logs: logs.value }
      await callCommand('save_game_state', { state: fullState })
    }
  }

  async function loadState() {
    try {
      const gs = await callCommand<GameState>('load_game_state')
      if (gs) {
        await syncState(gs)
      }
    } catch (e) {
      if (e !== 'SAVENOTFOUND') {
        console.error('載入自動存檔失敗:', e)
      }
    }
  }

  // 自動存檔邏輯 (Debounced)
  let saveTimer: any = null
  watch([state, logs], () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveState()
    }, 1500) // 1.5 秒內無變動則存檔
  }, { deep: true })

  // 初始化時加載存檔
  loadState()

  async function newGame() {
    const currentScript = script.value // 備份劇本
    const gs = await callCommand<GameState>('new_game')
    if (gs) {
      historicalRoleIds.value.clear()
      state.value = gs
      logs.value = [] // 重置日誌
      addLog('action', '開始新遊戲')
      // 如果重置前有劇本，則還原它
      if (currentScript) {
        await setScript(currentScript)
      }
    }
  }

  async function resetPlayersState() {
    const currentScript = script.value // 備份劇本
    const gs = await callCommand<GameState>('reset_players_state')
    if (gs) {
      historicalRoleIds.value.clear()
      state.value = gs
      // 確保劇本被還原
      if (currentScript) {
        await setScript(currentScript)
      }
    }
  }

  async function setScript(script: Script) {
    // 兼容性處理：前端可能發送角色類型，Rust 後端要求全小寫
    const compatScript = JSON.parse(JSON.stringify(script)) as Script
    compatScript.characters.forEach(c => {
      c.role_type = c.role_type.toLowerCase() as any
    })

    historicalRoleIds.value.clear()

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

  async function toggleFabled(fabledId: string) {
    const gs = await callCommand<GameState>('toggle_fabled', { fabledId })
    await syncState(gs)
  }

  // 角色發派
  async function assignRole(playerId: string, role: CharacterDef | null) {
    const player = players.value.find(p => p.id === playerId)
    const oldRole = player?.role?.name || '無'
    const newRole = role?.name || '無'
    
    const gs = await callCommand<GameState>('assign_role', { playerId, role })
    if (gs) {
      if (role) historicalRoleIds.value.add(role.id)
      await syncState(gs)
      addLog('assignment', `玩家 ${player?.name} 角色變更: ${oldRole} -> ${newRole}`)
    }
  }

  async function setDemonBluff(index: number, role: CharacterDef | null) {
    const gs = await callCommand<GameState>('set_demon_bluff', { index, role })
    await syncState(gs)
  }

  async function setLunaticBluff(index: number, role: CharacterDef | null) {
    const gs = await callCommand<GameState>('set_lunatic_bluff', { index, role })
    await syncState(gs)
  }

  async function bulkAssignRoles(assignments: { player_id: string, role: CharacterDef | null }[], bluffs: (CharacterDef | null)[]) {
    const gs = await callCommand<GameState>('bulk_assign_roles', { assignments, bluffs })
    if (gs) {
      await syncState(gs)
      addLog('assignment', '執行批量角色指派')
    }
  }

  // 標記與提示
  async function addReminder(playerId: string, text: string, sourceRole: string) {
    const player = players.value.find(p => p.id === playerId)
    const roleName = player?.role?.name || '無角色'
    const gs = await callCommand<GameState>('add_reminder', { playerId, text, sourceRole })
    if (gs) {
      await syncState(gs)
      addLog('reminder', `在 ${player?.name} (${roleName}) 上新增標記: ${text} (${sourceRole})`)
    }
  }

  async function removeReminder(playerId: string, reminderId: string) {
    const player = players.value.find(p => p.id === playerId)
    const roleName = player?.role?.name || '無角色'
    const gs = await callCommand<GameState>('remove_reminder', { playerId, reminderId })
    if (gs) {
      await syncState(gs)
      addLog('reminder', `移除 ${player?.name} (${roleName}) 的標記`)
    }
  }

  async function updateReminder(playerId: string, reminderId: string, newText: string) {
    const player = players.value.find(p => p.id === playerId)
    const roleName = player?.role?.name || '無角色'
    const gs = await callCommand<GameState>('update_reminder', { playerId, reminderId, newText })
    if (gs) {
      await syncState(gs)
      addLog('reminder', `更新 ${player?.name} (${roleName}) 的標記為: ${newText}`)
    }
  }

  // 死亡與幽靈票
  async function killPlayer(playerId: string) {
    const player = players.value.find(p => p.id === playerId)
    const roleName = player?.role?.name || '無角色'
    const gs = await callCommand<GameState>('kill_player', { playerId })
    if (gs) {
      await syncState(gs)
      addLog('death', `玩家 ${player?.name} (${roleName}) 已死亡`)
    }
  }

  async function revivePlayer(playerId: string) {
    const player = players.value.find(p => p.id === playerId)
    const roleName = player?.role?.name || '無角色'
    const gs = await callCommand<GameState>('revive_player', { playerId })
    if (gs) {
      await syncState(gs)
      addLog('death', `玩家 ${player?.name} (${roleName}) 已復活`)
    }
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
    const oldPhase = phase.value
    const gs = await callCommand<GameState>('advance_phase')
    if (gs) {
      await syncState(gs)
      addLog('phase', `切換階段: ${oldPhase} -> ${gs.phase}`)
    }
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

  async function removeNomination(nominationIndex: number) {
    const gs = await callCommand<GameState>('remove_nomination', { nominationIndex })
    await syncState(gs)
  }

  // 數據匯入匯出
  async function exportState(): Promise<string | null> {
    const stateJson = await callCommand<string>('export_game_state')
    if (stateJson) {
      try {
        const fullState = JSON.parse(stateJson)
        // 注入對局日誌
        fullState.game_logs = logs.value
        return JSON.stringify(fullState, null, 2)
      } catch (e) {
        return stateJson
      }
    }
    return null
  }

  async function importState(jsonStr: string) {
    try {
      const data = JSON.parse(jsonStr)
      // 如果 JSON 中包含日誌，則恢復它
      if (data.game_logs) {
        logs.value = data.game_logs
      }
    } catch (e) {}
    
    const gs = await callCommand<GameState>('import_game_state', { jsonStr })
    await syncState(gs)
  }

  async function importCustomScript(jsonStr: string) {
    const gs = await callCommand<GameState>('import_custom_script', { jsonStr })
    await syncState(gs)
  }

  function setNightNotes(val: string) {
    nightNotes.value = val
    localStorage.setItem('botc-night-notes', val)
  }

  function setNightNotesFontSize(size: number) {
    nightNotesFontSize.value = size
    localStorage.setItem('botc-night-notes-font-size', size.toString())
  }

  function setNightNotesColor(color: string) {
    nightNotesColor.value = color
    localStorage.setItem('botc-night-notes-color', color)
  }

  function addHintTemplate(text: string) {
    hintTemplates.value.push(text)
    localStorage.setItem('botc-hint-templates', JSON.stringify(hintTemplates.value))
  }

  function removeHintTemplate(index: number) {
    hintTemplates.value.splice(index, 1)
    localStorage.setItem('botc-hint-templates', JSON.stringify(hintTemplates.value))
  }

  function resetHintTemplates() {
    hintTemplates.value = [...defaultHintTemplates]
    localStorage.setItem('botc-hint-templates', JSON.stringify(hintTemplates.value))
  }

  return {
    state, loading, error, historicalRoleIds,
    players, script, phase, round, demonBluffs, lunaticBluffs, nominations,
    alive, dead, threshold, isNight,
    townfolkCount, outsiderCount, minionCount, demonCount,
    firstNightOrder, otherNightOrder, activeFabled,
    loadState, newGame, resetPlayersState, setScript,
    addPlayer, setPlayerCount, removePlayer, renamePlayer, swapSeats, reorderPlayers,
    toggleFabled,
    assignRole, setDemonBluff, setLunaticBluff, bulkAssignRoles,
    addReminder, removeReminder, updateReminder,
    killPlayer, revivePlayer, toggleAlive, toggleGhostVote, toggleCanNominate, useGhostVote,
    advancePhase, revertPhase, setPhase,
    nominate, editNomination, vote, execute, undoExecution, removeNomination,
    exportState, importState, importCustomScript, updateScriptName,
    logs, addLog, relativeNightOrder,
    nightNotes, setNightNotes,
    nightNotesFontSize, setNightNotesFontSize,
    nightNotesColor, setNightNotesColor,
    hintTemplates, addHintTemplate, removeHintTemplate, resetHintTemplates
  }
})
