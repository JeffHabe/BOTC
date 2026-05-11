// 劇本 Store ：管理角色資料庫與劇本載入
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CharacterDef, Script, RoleType } from '../types'
import { useGameStore } from './gameStore'

import allCharacterRaw from '../../src-tauri/data/all_character.json'

import { BaseDirectory, exists, readTextFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs'

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
    if (t === 'loric') mappedType = 'Loric'

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
      conflicts: r.conflicts || [],
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

export const useScriptStore = defineStore('script', () => {
  const gameStore = useGameStore()
  const searchQuery = ref('')
  const filterType = ref<RoleType | 'All'>('All')
  const customScripts = ref<Script[]>([])
  
  // 核心角色大全配置 (具有響應式)
  const masterScript = ref<Script>(parseRawArray(allCharacterRaw, 'all_character', '全角色大全'))
  // 保存原始的 JSON 節點，便於寫回
  const rawCharacterList = ref<any[]>([...allCharacterRaw])

  const allScripts = computed<Script[]>(() => [
    masterScript.value,
    ...customScripts.value,
  ])

  const currentScript = computed(() => gameStore.script)

  const filteredCharacters = computed<CharacterDef[]>(() => {
    if (!currentScript.value) return []
    
    // 預設從當前腳本撈取
    let chars = currentScript.value.characters
    
    // 如果篩選條件是旅行者，因為旅行者通常不寫在特定腳本中（可加入任何腳本），
    // 所以我們直接從「全角色大全 (masterScript)」中提取所有旅行者。
    if (filterType.value === 'Traveler') {
      chars = masterScript.value.characters.filter(c => c.role_type === 'Traveler')
    } else if (filterType.value !== 'All') {
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

  async function loadCharacters() {
    try {
      const dbExists = await exists('all_character.json', { baseDir: BaseDirectory.AppData })
      if (!dbExists) {
        // 第一期：把包裝內的靜態檔案自動寫入使用者的 AppData
        await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true })
        await writeTextFile('all_character.json', JSON.stringify(allCharacterRaw, null, 2), { baseDir: BaseDirectory.AppData })
        rawCharacterList.value = [...allCharacterRaw]
      } else {
        const content = await readTextFile('all_character.json', { baseDir: BaseDirectory.AppData })
        const parsed = JSON.parse(content)
        rawCharacterList.value = parsed
      }
      masterScript.value = parseRawArray(rawCharacterList.value, 'all_character', '全角色大全')

      // 如果尚未裝載其他劇本，且遊戲中選擇的是大全，則同步至 gameStore
      if (!gameStore.script || gameStore.script.id === 'all_character') {
         await gameStore.setScript(masterScript.value)
      }
    } catch (e) {
      console.error('Failed to load custom all_character.json, falling back to default', e)
    }
  }

  async function saveCharacters(newRawList: any[]) {
    try {
      await writeTextFile('all_character.json', JSON.stringify(newRawList, null, 2), { baseDir: BaseDirectory.AppData })
    } catch (e) {
      console.warn('Failed to save characters to filesystem (maybe running in browser), saving to memory only', e)
    }
    
    rawCharacterList.value = newRawList
    masterScript.value = parseRawArray(rawCharacterList.value, 'all_character', '全角色大全')
    
    // 更新場上已載入的劇本
    if (gameStore.script && gameStore.script.id === 'all_character') {
      await gameStore.setScript(masterScript.value)
    }
  }

  async function resetToDefault() {
    try {
      await writeTextFile('all_character.json', JSON.stringify(allCharacterRaw, null, 2), { baseDir: BaseDirectory.AppData })
      rawCharacterList.value = [...allCharacterRaw]
      masterScript.value = parseRawArray(rawCharacterList.value, 'all_character', '全角色大全')
      
      if (gameStore.script && gameStore.script.id === 'all_character') {
        await gameStore.setScript(masterScript.value)
      }
    } catch (e) {
      console.error('Failed to reset characters', e)
      throw e
    }
  }

  async function selectScript(script: Script) {
    await gameStore.setScript(script)
  }

  async function importFromJson(jsonStr: string) {
    await gameStore.importCustomScript(jsonStr)
  }

  async function exportAllScripts() {
    // 準備要匯出的資料：包含大全和所有自定義劇本
    const data = {
      version: '1.0',
      timestamp: Date.now(),
      scripts: allScripts.value
    }
    return JSON.stringify(data, null, 2)
  }

  return {
    searchQuery,
    filterType,
    allScripts,
    currentScript,
    filteredCharacters,
    customScripts,
    rawCharacterList,
    masterScript,
    loadCharacters,
    saveCharacters,
    resetToDefault,
    selectScript,
    importFromJson,
    exportAllScripts,
  }
})
