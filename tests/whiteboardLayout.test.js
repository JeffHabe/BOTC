import test from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('白板排版與提示卡完整展示驗證 (Whiteboard.vue)', () => {
  const whiteboardPath = path.resolve(__dirname, '../src/components/Whiteboard.vue')
  assert.ok(fs.existsSync(whiteboardPath), 'Whiteboard.vue 檔案必須存在')
  const content = fs.readFileSync(whiteboardPath, 'utf8')

  // 1. 提示卡換行容器 (hint-cards-wrap)
  assert.ok(content.includes('hint-cards-wrap'), '提示卡容器必須採用 hint-cards-wrap 結構')
  assert.ok(content.includes('flex-wrap: wrap'), '提示卡必須設定 flex-wrap: wrap 以自動換行完全呈現，避免左右拖拉')

  // 2. 輸入框自適應高度
  assert.ok(content.includes('whiteboard-input'), '必須包含 whiteboard-input 輸入框')
  assert.ok(content.includes('flex: 1 1 0%') || content.includes('flex: 1'), '輸入框必須具備彈性伸展填滿 (flex: 1) 特性')
  assert.ok(content.includes('overflow-y: auto'), '輸入框內容超出時必須具備內部垂直捲動功能')

  // 3. 面板高度根據螢幕尺寸調節
  assert.ok(content.includes('whiteboard-panel'), '必須包含 whiteboard-panel 面板')
  assert.ok(content.includes('height: min(') || content.includes('vh'), '面板高度必須依據視窗尺寸 (vh / min) 自適應')

  // 4. 固定元素 flex-shrink 確保不壓縮
  assert.ok(content.includes('hint-cards-section') && content.includes('flex-shrink: 0'), '提示卡區域必須防止被無故壓縮 (flex-shrink: 0)')
  assert.ok(content.includes('whiteboard-footer') && content.includes('flex-shrink: 0'), '底部工具列必須保持貼底且不被壓縮')
})

test('提示卡資料範本與管理方法驗證 (gameStore.ts)', () => {
  const storePath = path.resolve(__dirname, '../src/stores/gameStore.ts')
  assert.ok(fs.existsSync(storePath), 'gameStore.ts 檔案必須存在')
  const content = fs.readFileSync(storePath, 'utf8')

  assert.ok(content.includes('defaultHintTemplates'), '必須包含預設提示卡陣列 defaultHintTemplates')
  assert.ok(content.includes('hintTemplates'), '必須包含 hintTemplates 響應式狀態')
  assert.ok(content.includes('addHintTemplate'), '必須包含 addHintTemplate 方法')
  assert.ok(content.includes('removeHintTemplate'), '必須包含 removeHintTemplate 方法')
  assert.ok(content.includes('resetHintTemplates'), '必須包含 resetHintTemplates 方法')
})

test('白板全螢幕檢視與完成閱讀功能驗證 (Whiteboard.vue)', () => {
  const whiteboardPath = path.resolve(__dirname, '../src/components/Whiteboard.vue')
  const content = fs.readFileSync(whiteboardPath, 'utf8')

  // 1. 底部按鈕區必須包含「檢視」按鈕
  assert.ok(content.includes('class="view-btn"'), '底部工具列必須包含 view-btn 檢視按鈕')
  assert.ok(content.includes('isFullscreenView = true'), '檢視按鈕點擊應開啟全螢幕檢視')
  assert.ok(content.includes('檢視'), '按鈕文字必須包含「檢視」')

  // 2. 全螢幕檢視層架構
  assert.ok(content.includes('fullscreen-view-overlay'), '必須包含全螢幕檢視遮罩層 fullscreen-view-overlay')
  assert.ok(content.includes('fullscreen-view-text'), '必須包含放大顯示的文字節點 fullscreen-view-text')
  assert.ok(content.includes('fullscreenFontSize'), '必須具備放大文字計算邏輯 fullscreenFontSize')

  // 3. 關閉與「完成閱讀」按鈕
  assert.ok(content.includes('finish-reading-btn'), '必須包含 finish-reading-btn 完成閱讀按鈕')
  assert.ok(content.includes('完成閱讀'), '按鈕文字必須包含「完成閱讀」')
  assert.ok(content.includes('isFullscreenView = false'), '完成閱讀與關閉按鈕點擊應關閉全螢幕檢視')
})

test('說書人資訊白板 (Whiteboard.vue) 圖示與 SVG 向量圖替換驗證', () => {
  const whiteboardPath = path.resolve(__dirname, '../src/components/Whiteboard.vue')
  const content = fs.readFileSync(whiteboardPath, 'utf8')

  // 1. 設定控制展開/收起圖示
  assert.ok(content.includes('/pic/caret-arrow-up.png'), '收起設定應使用 /pic/caret-arrow-up.png')
  assert.ok(content.includes('/pic/gear.png'), '展開設定應使用 /pic/gear.png')

  // 2. 標題與提示卡圖示
  assert.ok(content.includes('/pic/theater.png'), '填入劇本角色應使用 /pic/theater.png')
  assert.ok(content.includes('/pic/bulb.png'), '提示卡應使用 /pic/bulb.png')

  // 3. 新增提示卡按鈕圖示
  assert.ok(content.includes('/pic/plus.svg'), '新增提示卡應使用 /pic/plus.svg')

  // 4. 底部複製與清除按鈕圖示
  assert.ok(content.includes('/pic/files-copy.png'), '複製全部文字應使用 /pic/files-copy.png')
  assert.ok(content.includes('/pic/rubber-gold.png'), '清除全部內容應使用 /pic/rubber-gold.png')
})


