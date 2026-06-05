# 血染鐘樓魔典輔助程式 - 一般玩家自動化測試指南 (AI Agent 變數版)

本指南專為 **AI Agent** 進行自動化測試與視覺定位編寫。手冊內含精確的 CSS 類名、ID 以及 Pinia 狀態變數名稱，以確保腳本編寫與測試定位的準確性。

> [!NOTE]
> 人類玩家請查閱圖文並茂的 [player_guide.md](file:///d:/BOTC/guide/player_guide.md)。

---

## 👁️ 魔典公開資訊查閱 (Grimoire Public Info)

### 1. 玩家座次與生死狀態 (Player Seats & States)
*   **玩家令片定位變數 (Selector)**：`.player-token` (網格排列，包含 `seat` index)
*   **存活狀態標識**：無附加特殊樣式類名。
*   **死亡狀態標識**：令片加載灰色半透明樣式，且內部渲染一個覆蓋的 `.death-skull` 骷髏頭元素。
*   **幽靈票投票標記**：令片旁的 `.ghost-vote-ticket` 圖示。
    - 亮起表示未消耗：`has_ghost_vote = true`
    - 消失或灰化表示已消耗：`has_ghost_vote = false`
*   **數據狀態變數 (Store State)**：
    - 玩家列表：`gameStore.state.players` (Pinia Array)

### 2. 當前遊戲階段與日誌 (Game Stage)
*   **定位變數 (Selector)**：螢幕頂部的中央狀態欄 `.phase-banner`
*   **階段文字比對**：`.phase-banner .phase-title` (例如：比對文字是否包含 `"白天"`、`"夜晚"` 或 `"首夜"`)

---

## 🎮 遊戲開始 (Phase A)

玩家在遊戲剛開始時會看到主畫面以及玩家座次資訊。以下截圖展示了遊戲啟動後的畫面。

![遊戲開始畫面](../screenshots/script_management_all/1_game_start/01_game_start.png)

---

## 📋 劇本管理 (Phase B)

玩家可在此階段管理劇本、角色庫及相關設定。以下示意圖說明了劇本管理介面。

![劇本管理畫面](../screenshots/script_management_all/2_script_management/02_script_management.png)

---

## 📜 劇本與角色庫查閱 (Phase C)

### 1. 檢視實體劇本大圖 (View Script Overlay)
*   **操作流程**：
    1. 點擊主畫面左下角（新增按鈕正上方）的實體劇本按鈕。
    2. 螢幕中央會彈出目前劇本的實體 PDF 大圖或圖片，讓玩家能快速對照角色技能。
    3. 玩家可在大圖上進行拖曳、雙指捏合縮放，且不影響底層魔典背景。
        
    ![彈出實體劇本大圖檢視](../screenshots/script_management_all/3_script_lookup/03_script_overlay_loaded.png)

    ![拖曳大圖移動進行對照](../screenshots/script_management_all/3_script_lookup/04_script_image_dragged.png)

---

## 💬 接收說書人資訊 (Phase D)

### 1. 說書人白板展示 (Whiteboard Display)
*   **狀態變數 (Store State)**：`gameStore.state.whiteboard` (Pinia 儲存的文字內容串，透過 evaluate 可直接讀寫)
*   **文字內容定位**：在白板容器 `.whiteboard-panel` 內的 `.whiteboard-input` textarea 中。
*   **排版高度**：確保底部的複製/清除按鈕留有 `.whiteboard-panel` 的底部 safe area 間距。

![白板中編輯的文字內容](../screenshots/script_management_all/4_whiteboard_info/05_fill_whiteboard_text.png)
