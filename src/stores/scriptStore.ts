// 劇本 Store ：管理角色資料庫與劇本載入
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CharacterDef, Script, RoleType } from '../types'
import { useGameStore } from './gameStore'
import { useUIStore } from './uiStore'

import allCharacterRaw from '../../src-tauri/data/all_character_sort.json'
import { simplifyToTraditional, normalizeName } from '../utils/chineseConverter'

import { BaseDirectory, exists, readTextFile, writeTextFile, mkdir } from '@tauri-apps/plugin-fs'
import { convertFileSrc } from '@tauri-apps/api/core'
import { appDataDir } from '@tauri-apps/api/path'

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
      image: r.image ? r.image.replace(/\\/g, '') : null,
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
    characters: chars,
    category: meta.category || '標準劇本',
    physical_image: meta.physical_image || null,
    physical_image_back: meta.physical_image_back || null
  }
}

export const useScriptStore = defineStore('script', () => {
  const gameStore = useGameStore()
  const searchQuery = ref('')
  const filterType = ref<RoleType | 'All'>('All')
  const customScripts = ref<Script[]>([])

  // 劇本類別狀態管理
  const categories = ref<string[]>([])

  function loadCategories() {
    try {
      const saved = localStorage.getItem('botc-script-categories')
      if (saved) {
        categories.value = JSON.parse(saved)
      } else {
        categories.value = ['官方劇本', '縫合劇本', '汀西維爾村']
        saveCategories()
      }
    } catch (e) {
      categories.value = ['官方劇本', '縫合劇本', '汀西維爾村']
    }
  }

  function saveCategories() {
    localStorage.setItem('botc-script-categories', JSON.stringify(categories.value))
  }

  function addCategory(name: string) {
    if (!name.trim()) return
    const trimmed = name.trim()
    if (!categories.value.includes(trimmed)) {
      categories.value.push(trimmed)
      saveCategories()
    }
  }

  async function deleteCategory(name: string) {
    const idx = categories.value.indexOf(name)
    if (idx !== -1) {
      categories.value.splice(idx, 1)
      saveCategories()

      const fallback = categories.value[0] || '縫合劇本'
      customScripts.value.forEach(s => {
        if (s.category === name) {
          s.category = fallback
        }
      })
      await saveCustomScripts()

      if (masterScript.value.category === name) {
        masterScript.value.category = fallback
        const metaIndex = rawCharacterList.value.findIndex((r: any) => r.id === '_meta')
        if (metaIndex >= 0) {
          rawCharacterList.value[metaIndex].category = fallback
        }
        await saveCharacters([...rawCharacterList.value])
      }
    }
  }

  async function updateCategory(oldName: string, newName: string) {
    const trimmedNew = newName.trim()
    if (!trimmedNew || oldName === trimmedNew) return
    const idx = categories.value.indexOf(oldName)
    if (idx !== -1) {
      if (categories.value.includes(trimmedNew)) {
        categories.value.splice(idx, 1)
      } else {
        categories.value[idx] = trimmedNew
      }
      saveCategories()

      customScripts.value.forEach(s => {
        if (s.category === oldName) {
          s.category = trimmedNew
        }
      })
      await saveCustomScripts()

      if (masterScript.value.category === oldName) {
        masterScript.value.category = trimmedNew
        const metaIndex = rawCharacterList.value.findIndex((r: any) => r.id === '_meta')
        if (metaIndex >= 0) {
          rawCharacterList.value[metaIndex].category = trimmedNew
        }
        await saveCharacters([...rawCharacterList.value])
      }
    }
  }

  const appDataDirPath = ref('')

  async function initAppDataPath() {
    try {
      const path = await appDataDir()
      appDataDirPath.value = path.replace(/\\/g, '/')
    } catch (e) {
      console.warn('無法獲取 appDataDir:', e)
    }
  }

  initAppDataPath()

  function getScriptImageUrl(path: string | null): string | null {
    if (!path) return null
    if (path.startsWith('data:image/') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
      return path
    }
    const cleanPath = path.replace(/\\/g, '/')
    if (!appDataDirPath.value) {
      return cleanPath
    }
    let fullPath = `${appDataDirPath.value}/${cleanPath}`
    const isWindows = typeof navigator !== 'undefined' && /windows/i.test(navigator.userAgent)
    if (isWindows) {
      fullPath = fullPath.replace(/\//g, '\\')
    }
    return convertFileSrc(fullPath)
  }

  async function createCustomScript(
    name: string,
    characters: CharacterDef[],
    category: string,
    physicalImage?: string | null,
    physicalImageBack?: string | null,
    logo?: string | null
  ) {
    const scriptId = 'custom_' + Date.now()

    const newScript: Script = {
      id: scriptId,
      name: name.trim(),
      characters,
      category: category || categories.value[0] || '縫合劇本',
      physical_image: physicalImage || null,
      physical_image_back: physicalImageBack || null,
      logo: logo || null
    }
    customScripts.value.push(newScript)
    await saveCustomScripts()
    return newScript
  }

  async function updateCustomScript(
    id: string,
    name: string,
    characters: CharacterDef[],
    category: string,
    physicalImage?: string | null,
    physicalImageBack?: string | null,
    logo?: string | null
  ) {
    const script = customScripts.value.find(s => s.id === id)
    if (script) {
      script.name = name.trim()
      script.characters = characters
      script.category = category || categories.value[0] || '縫合劇本'
      script.physical_image = physicalImage || null
      script.physical_image_back = physicalImageBack || null
      script.logo = logo || null
      await saveCustomScripts()

      if (gameStore.script && gameStore.script.id === id) {
        gameStore.script.name = name.trim()
        gameStore.script.characters = characters
        gameStore.script.category = category
        gameStore.script.physical_image = physicalImage || null
        gameStore.script.physical_image_back = physicalImageBack || null
        gameStore.script.logo = logo || null
        await gameStore.setScript({ ...gameStore.script })
      }
      return true
    }
    return false
  }


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

    // 當篩選分類為 'All' 時，依據 鎮民 -> 外來者 -> 爪牙 -> 惡魔 的順序進行排序
    if (filterType.value === 'All') {
      const typeOrder: Record<string, number> = {
        Townsfolk: 1,
        Outsider: 2,
        Minion: 3,
        Demon: 4,
        Traveler: 5,
        Fabled: 6
      }
      chars = [...chars].sort((a, b) => {
        const orderA = typeOrder[a.role_type] ?? 99
        const orderB = typeOrder[b.role_type] ?? 99
        return orderA - orderB
      })
    }

    return chars
  })

  async function loadCharacters() {
    try {
      // 載入類別
      loadCategories()
      // 1. 載入核心角色大全
      const dbExists = await exists('all_character_sort.json', { baseDir: BaseDirectory.AppData })
      if (!dbExists) {
        await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true })
        await writeTextFile('all_character_sort.json', JSON.stringify(allCharacterRaw, null, 2), { baseDir: BaseDirectory.AppData })
        rawCharacterList.value = [...allCharacterRaw]
      } else {
        const content = await readTextFile('all_character_sort.json', { baseDir: BaseDirectory.AppData })
        const localList = JSON.parse(content) as any[]

        // 建立新封裝官方角色的 Map，方便快速查找
        const rawMap = new Map(allCharacterRaw.map(c => [c.id, c]))

        // 遍歷本機目前的角色清單
        const mergedList = localList.map(localChar => {
          // 如果 localChar 是官方角色（出現在新官方 Map 中）
          if (rawMap.has(localChar.id)) {
            const updated = rawMap.get(localChar.id)
            rawMap.delete(localChar.id) // 標記已更新處理，將其移出 Map
            return updated // 使用新包裡的最新官方資料覆蓋它（實現更新）
          }
          // 如果是說書人自己手動新增的角色（不在官方 Map 中），原封不動保留
          return localChar
        })

        // 若新版本的官方資料中新增了全新角色（Map 中剩餘的角色），將其追加至尾端
        for (const newChar of rawMap.values()) {
          mergedList.push(newChar)
        }

        // 對合併後的角色清單進行繁體化清洗，消除任何歷史簡體字殘留
        const cleanedMergedList = mergedList.map(c => {
          if (!c) return c
          const copy = { ...c }
          if (copy.name) copy.name = simplifyToTraditional(copy.name)
          if (copy.ability) copy.ability = simplifyToTraditional(copy.ability)
          if (copy.firstNightReminder) copy.firstNightReminder = simplifyToTraditional(copy.firstNightReminder)
          if (copy.otherNightReminder) copy.otherNightReminder = simplifyToTraditional(copy.otherNightReminder)
          if (Array.isArray(copy.reminders)) {
            copy.reminders = copy.reminders.map((r: string) => simplifyToTraditional(r))
          }
          return copy
        })

        // 將合併後的安全清單寫回本機
        await writeTextFile('all_character_sort.json', JSON.stringify(cleanedMergedList, null, 2), { baseDir: BaseDirectory.AppData })
        rawCharacterList.value = cleanedMergedList
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

  async function renameScript(id: string, newName: string, category?: string) {
    if (id === 'all_character_sort') {
      masterScript.value.name = newName
      if (category) masterScript.value.category = category
      const metaIndex = rawCharacterList.value.findIndex((r: any) => r.id === '_meta')
      if (metaIndex >= 0) {
        rawCharacterList.value[metaIndex].name = newName
        if (category) rawCharacterList.value[metaIndex].category = category
      } else {
        rawCharacterList.value.unshift({ id: '_meta', name: newName, category })
      }
      await saveCharacters([...rawCharacterList.value])
      if (gameStore.script?.id === 'all_character_sort') {
        gameStore.script.name = newName
        if (category) gameStore.script.category = category
        await gameStore.setScript({ ...gameStore.script })
      }
      return true
    }

    const script = customScripts.value.find(s => s.id === id)
    if (script) {
      script.name = newName
      if (category) script.category = category
      await saveCustomScripts()
      if (gameStore.script && gameStore.script.id === id) {
        // Trigger reactivity for game store
        gameStore.script.name = newName
        gameStore.script.category = category
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
    // 儲存前對所有角色的字串欄位進行繁體化清洗
    const processedList = newRawList.map(c => {
      if (!c) return c
      const copy = { ...c }
      if (copy.name) copy.name = simplifyToTraditional(copy.name)
      if (copy.ability) copy.ability = simplifyToTraditional(copy.ability)
      if (copy.firstNightReminder) copy.firstNightReminder = simplifyToTraditional(copy.firstNightReminder)
      if (copy.otherNightReminder) copy.otherNightReminder = simplifyToTraditional(copy.otherNightReminder)
      if (Array.isArray(copy.reminders)) {
        copy.reminders = copy.reminders.map((r: string) => simplifyToTraditional(r))
      }
      return copy
    })

    try {
      await writeTextFile('all_character_sort.json', JSON.stringify(processedList, null, 2), { baseDir: BaseDirectory.AppData })
    } catch (e) {
      console.warn('Failed to save characters to filesystem', e)
    }

    rawCharacterList.value = processedList
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
    // 垃圾回收：自動清理未在當前新劇本中被使用的暫存角色
    const activeRoleIds = new Set(script.characters.map(c => c.id))
    let tempCharsRemoved = false

    const filteredCharacters = rawCharacterList.value.filter(c => {
      if (c.is_temp) {
        if (!activeRoleIds.has(c.id)) {
          tempCharsRemoved = true
          return false
        }
      }
      return true
    })

    if (tempCharsRemoved) {
      await saveCharacters(filteredCharacters)
    }

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
          let name = (item && typeof item === 'object') ? item.name : ''
          if (!id && !name) return item

          if (id === '_meta') return item

          let found = null

          // 💡 1. 優先使用規格化後的中文名稱進行去重匹配
          if (name) {
            const cleanImportName = normalizeName(name)
            if (cleanImportName) {
              found = rawCharacterList.value.find(c => normalizeName(c.name) === cleanImportName)
            }
          }

          // 💡 2. 若中文名稱找不到，再使用 ID 進行匹配
          if (!found && id) {
            const cleanId = id.replace(/[-_]/g, '').toLowerCase()
            found = rawCharacterList.value.find(
              c => c.id.replace(/[-_]/g, '').toLowerCase() === cleanId
            )
          }

          if (found) {
            // 💡 3. 自動將劇本中的 ID 映射為系統已有的 ID，並補齊其他屬性，防止引入重複角色
            return typeof item === 'string' ? found : { ...found, ...item, id: found.id }
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

  // 重新排列當前劇本角色順序並持久化
  async function reorderCurrentScriptCharacters(newCharacters: CharacterDef[]) {
    const currentId = gameStore.script?.id
    if (!currentId) return
    const gs = gameStore.state

    // 1. 立即重新指派整個 script 物件引用，確保 Vue 響應式 computed 正確觸發更新
    if (gs && gs.script) {
      gs.script = {
        ...gs.script,
        characters: newCharacters
      }
    }
    if (currentId === 'all_character_sort') {
      masterScript.value = {
        ...masterScript.value,
        characters: newCharacters
      }
    } else {
      const script = customScripts.value.find(s => s.id === currentId)
      if (script) {
        script.characters = newCharacters
      }
    }

    // 2. 非同步持久化寫檔
    if (currentId === 'all_character_sort') {
      const meta = rawCharacterList.value.filter((r: any) => r.id === '_meta')
      const ordered = newCharacters.map(c =>
        rawCharacterList.value.find((r: any) => r.id === c.id) || c
      )
      const newRaw = [...meta, ...ordered]
      rawCharacterList.value = newRaw
      try {
        await writeTextFile('all_character_sort.json', JSON.stringify(newRaw, null, 2), { baseDir: BaseDirectory.AppData })
      } catch (e) {
        console.warn('儲存角色順序失敗', e)
      }
    } else {
      try {
        await saveCustomScripts()
      } catch (e) {
        console.warn('儲存自定義劇本失敗', e)
      }
    }

    // 3. 同步至後端 Rust 狀態
    if (gs?.script) {
      try {
        await gameStore.setScript({ ...gs.script, characters: newCharacters })
      } catch (e) {
        console.warn('同步後端腳本失敗', e)
      }
    }
  }

  async function updateScriptNightOrder(scriptId: string, tab: 'first' | 'other', orderedCharIds: string[]) {
    const s = customScripts.value.find(sc => sc.id === scriptId) || (masterScript.value.id === scriptId ? masterScript.value : null)
    if (!s) return

    if (tab === 'first') {
      s.custom_first_night_order = orderedCharIds
    } else {
      s.custom_other_night_order = orderedCharIds
    }

    if (scriptId === masterScript.value.id) {
      const metaIndex = rawCharacterList.value.findIndex((r: any) => r.id === '_meta')
      if (metaIndex >= 0) {
        if (tab === 'first') rawCharacterList.value[metaIndex].custom_first_night_order = orderedCharIds
        else rawCharacterList.value[metaIndex].custom_other_night_order = orderedCharIds
      } else {
        const metaObj: any = { id: '_meta', name: masterScript.value.name }
        if (tab === 'first') metaObj.custom_first_night_order = orderedCharIds
        else metaObj.custom_other_night_order = orderedCharIds
        rawCharacterList.value.unshift(metaObj)
      }
      try {
        await writeTextFile('all_character_sort.json', JSON.stringify(rawCharacterList.value, null, 2), { baseDir: BaseDirectory.AppData })
      } catch (e) {
        console.warn('Failed to save characters to filesystem', e)
      }
    } else {
      await saveCustomScripts()
    }

    if (gameStore.script && gameStore.script.id === scriptId) {
      if (tab === 'first') gameStore.script.custom_first_night_order = [...orderedCharIds]
      else gameStore.script.custom_other_night_order = [...orderedCharIds]
    }
    if (gameStore.state?.script && gameStore.state.script.id === scriptId) {
      if (tab === 'first') gameStore.state.script.custom_first_night_order = [...orderedCharIds]
      else gameStore.state.script.custom_other_night_order = [...orderedCharIds]
    }
  }

  async function resetScriptNightOrder(scriptId: string, tab: 'first' | 'other') {
    const s = customScripts.value.find(sc => sc.id === scriptId) || (masterScript.value.id === scriptId ? masterScript.value : null)
    if (!s) return

    if (tab === 'first') {
      delete s.custom_first_night_order
    } else {
      delete s.custom_other_night_order
    }

    if (scriptId === masterScript.value.id) {
      const metaIndex = rawCharacterList.value.findIndex((r: any) => r.id === '_meta')
      if (metaIndex >= 0) {
        if (tab === 'first') delete rawCharacterList.value[metaIndex].custom_first_night_order
        else delete rawCharacterList.value[metaIndex].custom_other_night_order
      }
      try {
        await writeTextFile('all_character_sort.json', JSON.stringify(rawCharacterList.value, null, 2), { baseDir: BaseDirectory.AppData })
      } catch (e) {
        console.warn('Failed to save characters to filesystem', e)
      }
    } else {
      await saveCustomScripts()
    }

    if (gameStore.script && gameStore.script.id === scriptId) {
      if (tab === 'first') delete gameStore.script.custom_first_night_order
      else delete gameStore.script.custom_other_night_order
    }
    if (gameStore.state?.script && gameStore.state.script.id === scriptId) {
      if (tab === 'first') delete gameStore.state.script.custom_first_night_order
      else delete gameStore.state.script.custom_other_night_order
    }
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
    categories,
    saveCategories,
    saveCustomScripts,
    addCategory,
    deleteCategory,
    updateCategory,
    createCustomScript,
    updateCustomScript,
    reorderCurrentScriptCharacters,
    updateScriptNightOrder,
    resetScriptNightOrder,
    getScriptImageUrl,
  }
})
