// 血染鐘樓助手 TypeScript 型別定義

export type RoleType = 'Townsfolk' | 'Outsider' | 'Minion' | 'Demon' | 'Traveler' | 'Fabled' | 'Loric'

export const ROLE_TYPE_LABEL: Record<RoleType, string> = {
  Townsfolk: '鎮民',
  Outsider: '外來者',
  Minion: '爪牙',
  Demon: '惡魔',
  Traveler: '旅行者',
  Fabled: '傳奇',
  Loric: '奇遇',
}

export const ROLE_TYPE_COLOR: Record<RoleType, string> = {
  Townsfolk: '#0398E5',
  Outsider: '#056498',
  Minion: '#7e0303',
  Demon: '#cd0000',
  Traveler: '#b46baf',
  Fabled: '#dca938',
  Loric: '#3c9438',
}

export interface ReminderToken {
  id: string
  text: string
  source_role: string
  round: number
}

export interface ConflictRule {
  target?: string
  charB?: string
  desc?: string
}

export interface CharacterDef {
  id: string
  name: string
  name_en: string
  role_type: RoleType
  ability: string
  flavor?: string | null
  night_order_first?: number | null
  night_order_other?: number | null
  reminders: string[]
  remindersGlobal?: string[]
  setup: boolean
  image?: string | null
  first_night_reminder?: string | null
  other_night_reminder?: string | null
  conflicts?: ConflictRule[]
  class?: string | null
  is_custom?: boolean
  is_temp?: boolean
}

export interface Player {
  id: string
  name: string
  seat: number
  role: CharacterDef | null
  is_alive: boolean
  has_ghost_vote: boolean
  reminders: ReminderToken[]
  is_nominated: boolean
  can_nominate: boolean
  extra_nominations?: number
  extra_votes?: number
}

export interface Script {
  id: string
  name: string
  name_en?: string | null
  author?: string | null
  logo?: string | null
  characters: CharacterDef[]
  category?: string
  physical_image?: string | null
  physical_image_back?: string | null
}

export type GamePhase = 'Setup' | 'FirstNight' | 'Day' | 'Night'

export const PHASE_LABEL: Record<GamePhase, string> = {
  Setup: '準備',
  FirstNight: '首夜',
  Day: '白天',
  Night: '夜晚',
}

export interface Nomination {
  nominator_id: string
  nominee_id: string
  votes_for: string[]
  threshold: number
  executed: boolean
  round: number
  extra_votes?: number
}

export interface GameState {
  id: string
  script: Script
  players: Player[]
  phase: GamePhase
  round: number
  demon_bluffs: (CharacterDef | null)[]
  lunatic_bluffs: (CharacterDef | null)[]
  nominations: Nomination[]
  active_fabled: string[]
  created_at: string
  updated_at: string
}

// 計算工具
export function aliveCount(state: GameState): number {
  return state.players.filter(p => p.is_alive).length
}

export function deadCount(state: GameState): number {
  return state.players.filter(p => !p.is_alive).length
}

export function executionThreshold(state: GameState): number {
  return Math.ceil(aliveCount(state) / 2)
}

export function votesFor(nomination: Nomination): number {
  return nomination.votes_for.length
}
