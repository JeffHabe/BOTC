# 血染鐘樓魔典輔助程式 - 投票面板自動化測試指南 (AI Agent 變數版)

本指南專為 **AI Agent** 進行自動化測試與視覺定位編寫。手冊內含精確的 CSS 類名、ID 以及 Pinia 狀態變數名稱，以確保腳本編寫與測試定位的準確性。

> [!NOTE]
> 人類主持說書人請查閱圖文並茂的 [voting_guide.md](file:///d:/BOTC/scripts/voting_guide.md)。

---

## 🧭 進入投票面板

*   **開啟功能選單 (Gear Menu)**
    *   **定位變數 (Selector)**：`.menu-toggle-btn` (齒輪按鈕)
    *   **操作**：點擊展開功能選單。
*   **開啟投票管理 (Open Panel)**
    *   **定位變數 (Selector)**：`button[title='投票管理']` 或 `button.menu-btn:has(img[src='/pic/vote-yes.png'])`
    *   **面板容器 (Container)**：`.voting-panel`
    *   **操作**：點擊開啟面板，面板滑入。
    *   **狀態變數 (Store State)**：`uiStore.activePanel = 'voting'`

---

## 🗳️ 模組一：發起提名 (Nomination Form)

*   **選擇提名人與被提名人 (Select Fields)**
    *   **提名者下拉選單**：`.nominate-section select` 的第一個實例 (`nth(0)`)
    *   **被提名者下拉選單**：`.nominate-section select` 的第二個實例 (`nth(1)`)
    *   **狀態變數 (Store State)**：
        - 提名人：`uiStore.nominationNominatorId`
        - 被提名人：`uiStore.nominationNomineeId`
*   **確認發起提名 (Confirm Button)**
    *   **定位變數 (Selector)**：`.nominate-btn` (或 `.btn-primary.nominate-btn`)
    *   **操作**：選好提名與被提名人後點擊，觸發後端 API 寫入提名。

---

## 🔱 模組二：邪惡勢力統計 (Evil Force Stats)

*   **統計容器 (Stats Container)**：`.evil-stats-bar`
*   **統計欄位與文字比對**：
    *   爪牙提名統計：`.evil-stats-bar .stat-item:has-text('爪牙提名')`
    *   惡魔投票統計：`.evil-stats-bar .stat-item:has-text('惡魔投票')`
*   **隱私模式防禦**：當 `uiStore.privacyMode = true` 時，此容器將不會在 DOM 中渲染。

---

## 📜 模組三：提名記錄與編輯 (Nomination Card)

*   **提名卡片容器 (Card Container)**：`.nomination-card`
*   **數據欄位定位**：
    *   輪數標籤：`.nom-round-tag` (比對文字 `"第 X 輪"`)
    *   提名分數統計：`.nom-score` (若達門檻會加載高亮樣式 `.score-pass`)
*   **編輯提名記錄**：
    *   修改按鈕：`.btn-edit-nom` (✍️)
    *   編輯表單：`.nom-edit-form`
    *   表單確認儲存：`.mini-btn.btn-primary`
    *   表單取消編輯：`.mini-btn.btn-danger`
*   **取消提名記錄**：
    *   定位按鈕：`.btn-secondary` (卡片底部)
    *   操作：點擊會彈出確認對話框。
*   **數據狀態變數 (Store State)**：
    *   提名記錄列表：`gameStore.state.nominations` (Pinia Array，每項包含 `nominator_id`, `nominee_id`, `round`, `votes_for`, `executed`, `threshold`)

---

## ⚖️ 模組四：投票計票與處決 (Voting Grid & Execution)

*   **投票網格與座位按鈕**：
    *   投票網格容器：`.vote-grid`
    *   座位投票按鈕：`.vote-grid .vote-btn`
    *   已投票狀態樣式：`.vote-btn.vote-yes` (顯示勾號 ✓)
    *   死亡玩家投票按鈕：`.vote-btn.vote-ghost` (顯示 👻)
    *   幽靈票已消耗灰化按鈕：`.vote-btn.vote-spent` (帶有 `disabled` 屬性)
*   **執行處決按鈕 (Execute Button)**：
    *   定位變數：`.nom-actions button:has-text('執行處決')` (或 `.btn-danger`)
    *   按鈕狀態：當符合處決條件時（為唯一最高票且已達門檻），移除 `disabled` 狀態。
*   **處決完成徽章與撤銷**：
    *   處決完成樣式：卡片會高亮加載 `.nom-executed` 類名
    *   已處決徽章：`.nom-executed-badge` (⚖️ 已處決)
    *   撤銷處決按鈕：`.btn-undo`
*   **狀態變數 (Store State)**：
    *   關閉投票面板狀態：`uiStore.activePanel = 'none'`
