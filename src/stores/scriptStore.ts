// 劇本 Store ：管理角色資料庫與劇本載入
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CharacterDef, Script, RoleType } from '../types'
import { useGameStore } from './gameStore'
import { useUIStore } from './uiStore'

import allCharacterRaw from '../../src-tauri/data/all_character_sort.json'

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

    let classVal = r.class || null
    if (!classVal) {
      const found = allCharacterRaw.find((x: any) => x.id === r.id)
      if (found && found.class) {
        classVal = found.class
      }
    }

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
      remindersGlobal: r.remindersGlobal || [],
      setup: r.setup || false,
      image: r.image || null,
      first_night_reminder: r.firstNightReminder || null,
      other_night_reminder: r.otherNightReminder || null,
      conflicts: r.conflicts || [],
      class: classVal,
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
  const masterScript = ref<Script>(parseRawArray(allCharacterRaw, 'all_character_sort', '全角色大全'))
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
      // 1. 載入核心角色大全
      const dbExists = await exists('all_character_sort.json', { baseDir: BaseDirectory.AppData })
      if (!dbExists) {
        await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true })
        await writeTextFile('all_character_sort.json', JSON.stringify(allCharacterRaw, null, 2), { baseDir: BaseDirectory.AppData })
        rawCharacterList.value = [...allCharacterRaw]
      } else {
        const content = await readTextFile('all_character_sort.json', { baseDir: BaseDirectory.AppData })
        rawCharacterList.value = JSON.parse(content)
      }
      masterScript.value = parseRawArray(rawCharacterList.value, 'all_character_sort', '全角色大全')

      // 2. 載入自定義劇本清單
      const scriptsExists = await exists('custom_scripts.json', { baseDir: BaseDirectory.AppData })
      if (scriptsExists) {
        const content = await readTextFile('custom_scripts.json', { baseDir: BaseDirectory.AppData })
        customScripts.value = JSON.parse(content)
      }

      // 如果尚未裝載其他劇本，預設選擇大全
      if (!gameStore.script || gameStore.script.id === 'all_character_sort') {
        await gameStore.setScript(masterScript.value)
      }
    } catch (e) {
      console.error('載入資料失敗:', e)
    }
  }

  async function saveCustomScripts() {
    try {
      await writeTextFile('custom_scripts.json', JSON.stringify(customScripts.value, null, 2), { baseDir: BaseDirectory.AppData })
    } catch (e) {
      console.warn('儲存自定義劇本失敗:', e)
    }
  }

  async function renameScript(id: string, newName: string) {
    if (id === 'all_character_sort') {
      masterScript.value.name = newName
      const metaIndex = rawCharacterList.value.findIndex((r: any) => r.id === '_meta')
      if (metaIndex >= 0) {
        rawCharacterList.value[metaIndex].name = newName
      } else {
        rawCharacterList.value.unshift({ id: '_meta', name: newName })
      }
      await saveCharacters([...rawCharacterList.value])
      if (gameStore.script?.id === 'all_character_sort') {
        gameStore.script.name = newName
        await gameStore.setScript({ ...gameStore.script })
      }
      return true
    }

    const script = customScripts.value.find(s => s.id === id)
    if (script) {
      script.name = newName
      await saveCustomScripts()
      if (gameStore.script && gameStore.script.id === id) {
        // Trigger reactivity for game store
        gameStore.script.name = newName
        await gameStore.setScript({ ...gameStore.script })
      }
      return true
    }
    return false
  }

  async function deleteCustomScript(id: string) {
    if (id === 'all_character_sort') return false
    const idx = customScripts.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      customScripts.value.splice(idx, 1)
      await saveCustomScripts()
      if (gameStore.script?.id === id) {
        await selectScript(masterScript.value)
      }
      return true
    }
    return false
  }

  async function saveCharacters(newRawList: any[]) {
    try {
      await writeTextFile('all_character_sort.json', JSON.stringify(newRawList, null, 2), { baseDir: BaseDirectory.AppData })
    } catch (e) {
      console.warn('Failed to save characters to filesystem', e)
    }

    rawCharacterList.value = newRawList
    masterScript.value = parseRawArray(rawCharacterList.value, 'all_character_sort', '全角色大全')

    if (gameStore.script && gameStore.script.id === 'all_character_sort') {
      await gameStore.setScript(masterScript.value)
    }
  }

  async function resetToDefault() {
    try {
      await writeTextFile('all_character_sort.json', JSON.stringify(allCharacterRaw, null, 2), { baseDir: BaseDirectory.AppData })
      rawCharacterList.value = [...allCharacterRaw]
      masterScript.value = parseRawArray(rawCharacterList.value, 'all_character_sort', '全角色大全')

      if (gameStore.script && gameStore.script.id === 'all_character_sort') {
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

  async function importFromJson(jsonStr: string, defaultNameFromFile: string = '', skipPrompt: boolean = false) {
    try {
      const data = JSON.parse(jsonStr)

      // 情況 A：這是我們自己格式的「劇本包」(包含多個劇本)
      if (data && data.scripts && Array.isArray(data.scripts)) {
        // 過濾掉大全，將匯入的劇本合併進自定義清單
        const incoming = data.scripts.filter((s: any) => s.id !== 'all_character_sort')

        // 簡單去重：如果 ID 相同則覆蓋
        const existingMap = new Map(customScripts.value.map(s => [s.id, s]))
        incoming.forEach((s: any) => existingMap.set(s.id, s))
        customScripts.value = Array.from(existingMap.values())

        await saveCustomScripts()

        // 如果匯入包包含自定義角色庫，進行合併
        if (data.rawCharacters && Array.isArray(data.rawCharacters)) {
          const currentRaw = [...rawCharacterList.value]
          const rawMap = new Map(currentRaw.map(c => [c.id, c]))
          data.rawCharacters.forEach((c: any) => rawMap.set(c.id, c))
          await saveCharacters(Array.from(rawMap.values()))
        }

        // 如果匯入包包含自訂角色池配置(Pool Presets)，進行合併
        if (data.poolPresets && Array.isArray(data.poolPresets)) {
          const currentPresetsRaw = localStorage.getItem('botc-pool-presets')
          const currentPresets = currentPresetsRaw ? JSON.parse(currentPresetsRaw) : []
          const presetMap = new Map(currentPresets.map((p: any) => [p.id, p]))
          data.poolPresets.forEach((p: any) => presetMap.set(p.id, p))
          localStorage.setItem('botc-pool-presets', JSON.stringify(Array.from(presetMap.values())))
        }

        return true
      }

      // 情況 B：這是官方格式的「單一劇本 JSON」(通常是個陣列)
      if (Array.isArray(data)) {
        // 官方 JSON 通常只包含 { "id": "角色ID" }，我們需要從全庫(rawCharacterList)中把完整資料補齊
        const enrichedData = data.map((item: any) => {
          let id = typeof item === 'string' ? item : item.id
          if (!id) return item

          if (id === '_meta') return item

          // 如果只有 ID，沒有名稱或技能，就去全庫尋找
          if (typeof item === 'string' || (!item.name && !item.ability)) {
            const found = rawCharacterList.value.find(c => c.id === id)
            if (found) {
              return typeof item === 'string' ? found : { ...found, ...item }
            }
          }
          return item
        })

        const scriptId = 'custom_' + Date.now()
        // 嘗試從 _meta 取得名稱，若無則預設為傳入的檔名或「未具名劇本」
        const meta = enrichedData.find((item: any) => item.id === '_meta')
        const defaultName = meta && meta.name ? meta.name : (defaultNameFromFile || '未具名劇本')

        let scriptName = defaultName
        if (!skipPrompt) {
          const uiStore = useUIStore()
          const userInput = await uiStore.showPrompt('匯入劇本命名', '請為這個劇本命名：', defaultName)
          if (userInput === null) return false // 使用者取消
          scriptName = userInput.trim() || defaultName
        }

        const newScript = parseRawArray(enrichedData, scriptId, scriptName)

        // 加入自定義清單
        customScripts.value.push(newScript)
        await selectScript(newScript)
        await saveCustomScripts()
        return true
      }

      return false
    } catch (e) {
      console.error('匯入劇本失敗:', e)
      throw e
    }
  }

  async function exportAllScripts() {
    // 確保當前正在使用的劇本也被收錄進去 (如果是透過舊版方法載入且尚未在清單中的話)
    if (gameStore.script && gameStore.script.id !== 'all_character_sort') {
      const exists = customScripts.value.some(s => s.id === gameStore.script!.id)
      if (!exists) {
        customScripts.value.push(gameStore.script)
        await saveCustomScripts()
      }
    }

    const poolPresetsRaw = localStorage.getItem('botc-pool-presets')
    const poolPresets = poolPresetsRaw ? JSON.parse(poolPresetsRaw) : []

    // 準備要匯出的資料：包含大全和所有自定義劇本
    const data = {
      version: '1.1', // 升級版本號以標記支援更多資料
      timestamp: Date.now(),
      scripts: allScripts.value,
      rawCharacters: rawCharacterList.value,
      poolPresets: poolPresets
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
    renameScript,
    deleteCustomScript,
  }
})
