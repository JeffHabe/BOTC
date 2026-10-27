import test from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('all_character_sort.json 角色定義與 setup 屬性合規性驗證', () => {
  const jsonPath = path.resolve(__dirname, '../src-tauri/data/all_character_sort.json')
  const content = fs.readFileSync(jsonPath, 'utf8')
  const raw = JSON.parse(content)

  assert.ok(Array.isArray(raw), '角色資料庫必須為陣列')
  assert.ok(raw.length >= 300, `角色數量應大於 300，目前為 ${raw.length}`)

  // 1. 驗證 Constable (治安官) 的 setup 必須為嚴格布林值 true
  const constable = raw.find(r => r.id === 'Constable')
  assert.ok(constable, '找不到 Constable (治安官)')
  assert.strictEqual(constable.setup, true, 'Constable 的 setup 屬性必須為 boolean true')

  // 2. 驗證所有角色的 setup 欄位（若有定義）不可為整數或字串
  raw.forEach(c => {
    if (c.id === '_meta') return
    if (c.setup !== undefined) {
      assert.strictEqual(typeof c.setup, 'boolean', `角色 ${c.id} 的 setup 必須是 boolean，實際為 ${typeof c.setup}`)
    }
  })

  // 3. 模擬 parseRawArray 轉換，確保全角色產出的 Script 物件中所有角色 setup 皆為 boolean
  const chars = raw.filter(r => r.id !== '_meta').map(r => {
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
      role_type: mappedType,
      setup: Boolean(r.setup),
      reminders: Array.isArray(r.reminders) ? r.reminders : []
    }
  })

  assert.strictEqual(chars.length, raw.length - 1, '排除 _meta 後的角色總數應正確')
  chars.forEach(c => {
    assert.strictEqual(typeof c.setup, 'boolean', `轉換後角色 ${c.id} 的 setup 必須為 boolean`)
    assert.ok(Array.isArray(c.reminders), `角色 ${c.id} 的 reminders 必須為陣列`)
  })
})
