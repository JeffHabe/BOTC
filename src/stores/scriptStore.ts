// 劇本 Store ：管理角色資料庫與劇本載入
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CharacterDef, Script, RoleType } from '../types'
import { useGameStore } from './gameStore'

import troubleBrewing from '../../src-tauri/data/trouble_brewing.json'
import allCharacterRaw from '../../src-tauri/data/all_character.json'

function parseRawArray(raw: any[], id: string, defaultName: string): Script {
  const meta = raw.find((r: any) => r.id === '_meta') || {}
  const chars = raw.filter((r: any) => r.id !== '_meta').map((r: any) => {
    let t = (r.team || r.role_type || '').toLowerCase()
    let mappedType = 'Townsfolk'
    if (t === 'outsider') mappedType = 'Outsider'
    if (t === 'minion') mappedType = 'Minion'
    if (t === 'demon') mappedType = 'Demon'
    if (t === 'traveler') mappedType = 'Traveler'
    if (t === 'fabled') mappedType = 'Fabled'

    return {
      id: r.id,
      name: r.name || '未知',
      name_en: r.name_en || r.id,
      role_type: mappedType as RoleType,
      ability: r.ability || '',
      flavor: r.flavor || null,
      night_order_first: r.firstNight ? Math.floor(r.firstNight) : null,
      night_order_other: r.otherNight ? Math.floor(r.otherNight) : null,
      reminders: r.reminders || [],
      setup: r.setup || false,
      image: r.image || null,
      first_night_reminder: r.firstNightReminder || null,
      other_night_reminder: r.otherNightReminder || null,
    }
  })

  return {
    id,
    name: meta.name || defaultName,
    name_en: meta.name_en || id,
    author: meta.author || '',
    logo: meta.logo || null,
    characters: chars
  }
}

export const OFFICIAL_SCRIPTS: Script[] = [
  parseRawArray(allCharacterRaw, 'all_character', '全角色大全'),
  {
    id: 'trouble_brewing',
    name: '暗湧 (Trouble Brewing)',
    name_en: 'Trouble Brewing',
    author: 'The Pandemonium Institute',
    logo: null,
    characters: troubleBrewing as CharacterDef[],
  },
]

export const useScriptStore = defineStore('script', () => {
  const gameStore = useGameStore()
  const searchQuery = ref('')
  const filterType = ref<RoleType | 'All'>('All')
  const customScripts = ref<Script[]>([])

  const allScripts = computed<Script[]>(() => [
    ...OFFICIAL_SCRIPTS,
    ...customScripts.value,
  ])

  const currentScript = computed(() => gameStore.script)

  const filteredCharacters = computed<CharacterDef[]>(() => {
    if (!currentScript.value) return []
    let chars = currentScript.value.characters
    if (filterType.value !== 'All') {
      chars = chars.filter(c => c.role_type === filterType.value)
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      chars = chars.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.name_en.toLowerCase().includes(q) ||
        c.ability.toLowerCase().includes(q)
      )
    }
    return chars
  })

  async function selectScript(script: Script) {
    await gameStore.setScript(script)
  }

  async function importFromJson(jsonStr: string) {
    await gameStore.importCustomScript(jsonStr)
  }

  return {
    searchQuery,
    filterType,
    allScripts,
    currentScript,
    filteredCharacters,
    customScripts,
    selectScript,
    importFromJson,
  }
})
