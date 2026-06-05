# 血染鐘樓魔典輔助程式 - 劇本管理系統自動化測試指南 (AI Agent 變數版)

本指南專為 **AI Agent** 進行自動化測試與視覺定位編寫。手冊內含精確的 CSS 類名、ID 以及 Pinia 狀態變數名稱，以確保腳本編寫與測試定位的準確性。

> [!NOTE]
> 人類主持說書人請查閱圖文並茂的 [script_management_guide.md](file:///d:/BOTC/scripts/script_management_guide.md)。

---

## 🧭 進入劇本管理系統

*   **第一步：開啟設定面板 (Open Settings)**
    *   **定位變數 (Selector)**：齒輪選單按鈕 `.menu-toggle-btn`，展開選單後的設置按鈕 `button[title='設置']`
*   **第二步：開啟劇本管理 (Open Script Manager)**
    *   **定位變數 (Selector)**：`button:has-text('劇本管理')`
    *   **面板容器 (Container)**：`.editor-panel`
*   **第三步：分頁導覽 (Tab Navigation)**
    *   **定位變數 (Selector)**：`.tab-btn` (分頁按鈕陣列)
        1. 建立/編輯劇本分頁：`.tab-btn:has-text('建立劇本')` 或 `.tab-btn:has-text('編輯劇本')`
        2. 劇本分類分頁：`.tab-btn:has-text('劇本分類')`

---

## 🛠️ 分頁一：建立與編輯劇本 (Create/Edit Tab)

### 1. 輸入劇本基礎資料 (Basic Fields)
*   **劇本名稱輸入框**：`.form-input`
*   **所屬分類選單**：`.form-select` (下拉選單，狀態變數為 `script.category`)
*   **匯入 JSON 按鈕**：`.import-json-btn`
*   **實體圖檔上傳佔位框**：`.upload-placeholder`
*   **刪除實體圖檔按鈕**：`.remove-image-btn`

### 2. 篩選與選擇角色 (Filter & Role Grid)
*   **關鍵字搜尋框**：`.search-input`
*   **全選與清空按鈕**：
    *   全選：`.action-btn-mini.success`
    *   清空：`.action-btn-mini.danger`
*   **版本過濾標籤**：`.filter-pill-new`
*   **角色卡片項目**：`.role-item`
*   **已選取狀態高亮與對勾**：卡片加載高亮樣式且右上角有勾號 ✓

### 3. 儲存與取消 (Submit & Cancel Buttons)
*   **確認儲存按鈕**：`.create-btn` (若劇本名稱為空或未選角色，按鈕屬性為 `disabled`)
*   **取消編輯按鈕**：`.cancel-edit-btn`

---

## 📂 分頁二：劇本分類管理 (Categories Tab)

### 1. 分類名稱與排序管理 (Category List)
*   **分類名稱編輯文字框**：`.category-name-input`
*   **拖曳排序手柄**：`.drag-handle`
*   **刪除分類按鈕**：`.delete-btn`
*   **新增分類輸入框**：`.add-input`
*   **新增分類確認按鈕**：`.add-btn`

### 2. 劇本歸類管理 (Script Assignment)
*   **快速歸類下拉選單**：`.script-cat-select`
*   **編輯角色按鈕**：`.btn-edit-script` (圖示為 📝)
*   **匯出劇本按鈕**：`.btn-export-script` (將發起 JSON 檔案下載下載)
*   **刪除整個劇本按鈕**：`.btn-delete-script` (點擊會彈出二次確認對話框)
*   **二次確認對話框定位**：`.confirm-actions button:has-text('確認')`
