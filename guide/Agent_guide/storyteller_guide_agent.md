# 血染鐘樓魔典輔助程式 - 說書人自動化測試指南 (AI Agent 變數版)

本指南專為 **AI Agent** 進行自動化測試與視覺定位編寫。手冊內含精確的 CSS 類名、ID 以及 Pinia 狀態變數名稱，以確保腳本編寫與測試定位的準確性。

> [!NOTE]
> 人類主持說書人請查閱圖文並茂的 [storyteller_guide.md](file:///d:/BOTC/scripts/storyteller_guide.md)。

---

## 🧭 主畫面與全域控制區

### 1. 新增玩家 (Add Player)
*   **按鈕定位變數 (Selector)**：`.add-player-btn` (➕)
*   **輸入框定位變數 (Selector)**：`.name-input`
*   **確認按鈕定位變數 (Selector)**：`.dialog-actions .btn-primary` (確認新增)
*   **關閉對話框定位變數 (Selector)**：`.close-btn`
*   **狀態變數 (Store State)**：`uiStore.addPlayerDialogOpen`

### 2. 檢視實體劇本 (View Script Image)
*   **按鈕定位變數 (Selector)**：`.view-physical-script-btn`
*   **大圖 Overlay 容器**：`.physical-image-overlay`
*   **大圖定位變數 (Selector)**：`.physical-image-overlay img`
*   **關閉 Overlay 按鈕**：`button.close-link` (或 `.physical-image-overlay button:has-text('✕')`)

### 3. 功能選單 (Gear Menu)
*   **齒輪按鈕定位變數 (Selector)**：`.menu-toggle-btn` (⚙️)
*   **展開選單項目定位變數 (Selectors)**：
    *   設置：`button[title='設置']` (🛠️)
    *   夜晚順序：`button[title='夜晚順序']` (🌙)
    *   隱私模式：`button[title='隱私模式']` (👁️)
    *   投票管理：`button[title='投票管理']` (🗳️)
    *   說書人資訊白板：`button[title='說書人資訊']` (📝)

---

## 🎭 玩家個人狀態與角色指派

### 1. 開啟玩家控制面板 (Player Control Panel)
*   **玩家令片定位變數 (Selector)**：`.player-token`
*   **控制面板容器**：`.player-sheet` (PlayerControlSheet.vue)
*   **狀態變數 (Store State)**：`uiStore.selectedPlayerId` (非空時開啟)

### 2. 指派角色 (Assign Role)
*   **指派按鈕定位變數 (Selector)**：`.action-btn.role-btn`
*   **角色選取面板項目**：`.role-picker-panel .role-item`
*   **狀態變數 (Store State)**：`gameStore.state.players[i].role`

### 3. 標記死亡狀態與幽靈票 (Death State & Ghost Vote)
*   **死亡開關定位變數 (Selector)**：`.death-btn`
*   **狀態變數 (Store State)**：
    - 存活狀態：`gameStore.state.players[i].is_alive`
    - 幽靈投票權：`gameStore.state.players[i].has_ghost_vote`
*   **幽靈票控制開關 (Selector)**：`.toggle-item:has-text('靈魂投票權') button.switch`
*   **關閉個人面板定位變數**：`.close-sheet`

---

## 🔖 提示標記管理 (ReminderPicker)

*   **標籤按鈕定位變數 (Selector)**：`.action-btn.reminder-btn` (🔖)
*   **新增自定義標記輸入框**：`.custom-input`
*   **新增自定義按鈕定位變數**：`.custom-input-row .action-btn` (新增)
*   **通用標記定位變數 (Selector)**：`.common-badge` (如：`.common-badge:has-text('善良')`)
*   **場上角色專屬標記**：`.in-play-badge`
*   **現有已貼標記**：`.reminder-badge.existing`
*   **刪除標記垃圾桶按鈕**：`.custom-input-row .delete-btn`
*   **狀態變數 (Store State)**：
    - 提示標記陣列：`gameStore.state.players[i].reminders` (包含 `id`, `text`, `source_role`, `round`)
    - 提示面板狀態：`uiStore.reminderPickerPlayerId`

---

## 📝 說書人資訊（白板）記錄

*   **入口按鈕定位變數 (Selector)**：`button[title='說書人資訊']` (或 `.menu-btn:has(img[src='/pic/notes.png'])`)
*   **白板文字輸入框**：`.whiteboard-input`
*   **複製按鈕定位變數 (Selector)**：`.copy-btn` (成功時會加載 `.copy-success` 且顯示 `"✅ 已複製內容"`)
*   **清除按鈕定位變數 (Selector)**：`.clear-btn`
*   **關閉白板定位變數 (Selector)**：`.whiteboard-panel .close-btn`
*   **狀態變數 (Store State)**：`uiStore.activePanel = 'whiteboard'`
