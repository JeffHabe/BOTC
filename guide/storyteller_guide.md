# 血染鐘樓魔典
## 說書人（Storyteller）使用手冊

---

## <img src="../public/pic/spellbook.png" width="20" height="20" style="vertical-align: middle;" /> 主畫面與全域控制區

### 1. 新增玩家
*   **操作流程**：
    1. 點擊主畫面左下角金色邊框內含黑色「<img src="../public/pic/plus.png" width="16" height="16" style="vertical-align: middle;" />」圖示的按鈕。
    2. 螢幕中央會彈出一個半透明輸入框，在輸入欄中填寫玩家名稱。
    3. 點擊「確認」即可在魔典上新增一個玩家座位。
    
    ![首頁魔典主畫面](../screenshots/storyteller_guide_all/1_storyteller_guide/01_home_board.png)
    
    ![hover 新增玩家按鈕]
    
    ![新增玩家對話框](../screenshots/script_management_all/1_guide/03_fill_player_name.png)
    
    ![成功新增玩家座位](../screenshots/storyteller_guide_all/1_storyteller_guide/04_player_added.png)

### 2. 檢視實體劇本（實體劇本大圖）
*   **操作流程**：
    1. 點擊「新增玩家」按鈕正上方的實體劇本圖標按鈕。
    2. 螢幕中央將彈出**實體劇本的大圖檢視 Overlay**。
    3. 您可以對大圖進行拖曳、雙指捏合縮放。點擊大圖右上角的「✕」按鈕或點擊大圖外側陰影處，即可關閉大圖。
    
    ![檢視實體劇本按鈕](../public/pic/magic-book.png)
    
    ![實體劇本大圖彈窗](../screenshots/script_management_all/3_script_lookup/03_script_overlay_loaded.png)
    
    ![拖曳大圖移動](../screenshots/script_management_all/3_script_lookup/04_script_image_dragged.png)
    
    ![關閉大圖彈窗後畫面](../screenshots/script_management_all/3_script_lookup/05_script_overlay_closed.png)

### 3. 功能選單（齒輪選單）
*   **操作流程**：
    1. 點擊主畫面右下角帶有齒輪「<img src="../public/pic/gear.png" width="16" height="16" style="vertical-align: middle;" />」圖示的按鈕，選單會向上滑動展開：
        *   **設置 (<img src="../public/pic/magic-wand.png" width="16" height="16" style="vertical-align: middle;" />)**：開啟系統設置、管理劇本角色。
        *   **夜晚順序 (<img src="../public/pic/day-and-night.png" width="16" height="16" style="vertical-align: middle;" />)**：顯示夜間角色行動次序。
        *   **隱私模式 (<img src="../public/pic/show.png" width="16" height="16" style="vertical-align: middle;" />)**：一鍵隱藏或顯示所有座位上的角色。
        *   **魔典排列形狀**：點擊可切換座位排列為圓形、矩形或自由排列。
        *   **投票管理 (<img src="../public/pic/vote.png" width="16" height="16" style="vertical-align: middle;" />)**：管理白天的提名與投票計票。
        *   **說書人資訊白板 (<img src="../public/pic/whiteboard.png" width="16" height="16" style="vertical-align: middle;" />)**：點擊會展開說書人白板記錄頁面。
    2. 再次點擊原本的齒輪位置（此時顯示為「<img src="../public/pic/close.png" width="16" height="16" style="vertical-align: middle;" />」關閉圖示）即可收起選單。
    
    ![展開選單後畫面](../screenshots/storyteller_guide_all/3_voting_panel/02_click_menu_gear.png)
---

## <img src="../public/pic/mask.png" width="20" height="20" style="vertical-align: middle;" /> 玩家個人狀態與角色指派

### 1. 開啟玩家控制面板
*   **操作流程**：直接點擊魔典圓環上該玩家的圓形頭像（Token），控制面板將從底部滑入。
    
    ![玩家控制面板開啟畫面](../screenshots/storyteller_guide_all/2_reminder_picker/02_click_reminder_picker_btn.png)
    
### 2. 指派角色
*   **操作流程**：
    1. 點擊面板頂部的「變更角色」按鈕。
    2. 選擇想要指派的角色卡片。玩家頭像將即時更新為該角色的插畫與名稱。
        
    ![成功指派角色畫面](../screenshots/script_management_all/1_guide/05_role_assigned.png)

### 3. 標記死亡狀態與幽靈票
*   **操作流程**：
    1. 在控制面板中點擊「死亡狀態」開關，使頭像變為灰色覆蓋骷髏圖案。
    2. 死亡玩家頭像旁會自動出現一張「幽靈投票券」標記，代表其擁有最後一次的死亡投票權（幽靈票）。再次點擊可在計票時消耗該幽靈票。    
    ![消耗幽靈票後首頁畫面](../screenshots/script_management_all/1_guide/06_player_dead.png)

---

## <img src="../public/pic/reminder1.png" width="20" height="20" style="vertical-align: middle;" /> 提示標記管理 (ReminderPicker)

*   **入口位置**：在玩家座位旁或玩家控制面板中，點擊小標籤「<img src="../public/pic/reminder1.png" width="16" height="16" style="vertical-align: middle;" />」圖示。
*   **操作流程**：
    *   **快速新增**：點擊任意「通用標記」（善良/邪惡）或「專屬標記」圓角按鈕即可貼上。
    *   **自訂新增**：在輸入框輸入內容後點擊右側的新增按鈕。
    *   **刪除或編輯**：點選最上方現有標記，輸入框會進入修改模式，點選右側垃圾桶即可刪除。
    
    ![hover 提示標記按鈕](../screenshots/storyteller_guide_all/2_reminder_picker/02_click_reminder_picker_btn.png)
    
    ![提示標記面板開啟畫面](../screenshots/storyteller_guide_all/2_reminder_picker/03_reminder_picker_opened.png)
    
    ![新增通用標記善良](../screenshots/storyteller_guide_all/2_reminder_picker/04_add_general_reminder.png)
    
    ![新增角色專屬標記](../screenshots/storyteller_guide_all/2_reminder_picker/05_add_character_reminder.png)
    
    ![填寫自定義標記](../screenshots/storyteller_guide_all/2_reminder_picker/06_add_custom_reminder.png)
    
    ![編輯模式下顯示垃圾桶](../screenshots/storyteller_guide_all/2_reminder_picker/07_edit_delete_reminder.png)
    
    ![刪除並回到首頁畫面](../screenshots/storyteller_guide_all/2_reminder_picker/08_reminder_deleted_and_close.png)

---

## <img src="../public/pic/whiteboard.png" width="20" height="20" style="vertical-align: middle;" /> 說書人資訊（白板）記錄

*   **入口位置**：右下角「齒輪」展開選單後，點擊「記事本 (<img src="../public/pic/whiteboard.png" width="16" height="16" style="vertical-align: middle;" />)」圖示。
*   **操作流程**：
    *   **記錄資訊**：在文字框內鍵入資訊（例如：「你的占卜結果為【是】」）。
    *   **一鍵複製**：點擊底部左側「複製全部文字」按鈕，成功後會顯示已複製內容的提示。
    *   **一鍵清空**：點擊底部右側「清除全部內容」按鈕即可重置白板。
    
    ![hover 白板筆記按鈕](../screenshots/storyteller_guide_all/4_whiteboard_info/03_click_whiteboard_btn.png)
    
    ![白板面板滑入開啟](../screenshots/storyteller_guide_all/4_whiteboard_info/04_whiteboard_opened.png)
    
    ![填寫白板文字內容](../screenshots/storyteller_guide_all/4_whiteboard_info/05_fill_whiteboard_text.png)
    
    ![點擊複製按鈕成功提示](../screenshots/storyteller_guide_all/4_whiteboard_info/06_click_copy_btn.png)
    
    ![點擊清除清空內容](../screenshots/storyteller_guide_all/4_whiteboard_info/07_click_clear_btn.png)
    
    ![關閉白板面板畫面](../screenshots/storyteller_guide_all/4_whiteboard_info/08_whiteboard_closed.png)


## <img src="../public/pic/vote.png" width="20" height="20" style="vertical-align: middle;" /> 進入投票面板

*   **開啟功能選單**
    *   **按鈕位置**：主畫面右下角。
    *   **操作**：點擊帶有齒輪「<img src="../public/pic/gear.png" width="16" height="16" style="vertical-align: middle;" />」圖示的圓形按鈕展開功能選單。
    
    ![展開齒輪選單後畫面](../screenshots/storyteller_guide_all/3_voting_panel/02_click_menu_gear.png)
    
*   **開啟投票管理**
    *   **按鈕位置**：齒輪選單展開後的按鈕之一（「<img src="../public/pic/vote-yes.png" width="16" height="16" style="vertical-align: middle;" />」圖示）。
    *   **操作**：點擊名稱為 **投票管理** 的按鈕，投票管理面板將從畫面下方滑入。
    
    ![點擊投票管理按鈕前畫面](../screenshots/storyteller_guide_all/3_voting_panel/03_click_voting_btn.png)
    
    ![投票面板開啟畫面](../screenshots/storyteller_guide_all/3_voting_panel/04_voting_panel_opened.png)

---

## <img src="../public/pic/vote.png" width="20" height="20" style="vertical-align: middle;" /> 發起提名

本區塊僅在白天階段顯示，用於為玩家建立新提名：

*   **選擇提名者與被提名者**：
    *   **提名者**：左側下拉選單，僅列出目前存活且今天還能提名的玩家。
    *   **被提名者**：右側下拉選單，僅列出今天尚未被提名的玩家。
*   **確認發起提名**：
    *   點選下拉選單下方的 **確認提名** 按鈕即可完成發起。
    
    ![發起提名操作與確認按鈕](../screenshots/storyteller_guide_all/3_voting_panel/05_click_nominate_btn.png)

---

## <img src="../public/pic/Minions.png" width="20" height="20" style="vertical-align: middle;" /> 邪惡勢力統計

當場上存在提名時，面板最上方會自動顯示一個紅色的邪惡勢力統計欄，僅限主持說書人可見：

*   **<img src="../public/pic/Minions.png" width="16" height="16" style="vertical-align: middle;" /> 爪牙提名**：統計今日爪牙發起提名的總次數。
*   **<img src="../public/pic/Demons.png" width="16" height="16" style="vertical-align: middle;" /> 惡魔投票**：統計今日投票中，惡魔投出贊成票的累計總次數。
*   *註：若在設定中開啟隱私模式（隱藏角色），此紅色統計欄將會自動隱藏。*

![邪惡勢力統計欄與提名卡片展示](../screenshots/storyteller_guide_all/3_voting_panel/06_nominations_list_displayed.png)

---

## <img src="../public/pic/spellbook.png" width="20" height="20" style="vertical-align: middle;" /> 提名記錄與編輯

每一次發起的提名都會在下方產生一張獨立的提名卡片：

*   **檢視提名資訊**：卡片頂部顯示「第 X 輪」標籤與提名人和被提名人姓名。右上角顯示獲得票數與處決門檻（若達門檻會呈現金色高亮）。
*   **修改提名**：點選名字旁的編輯按鈕 **<img src="../public/pic/edit   .png" width="16" height="16" style="vertical-align: middle;" />** 可展開編輯選單重新指派玩家。
    
    ![編輯提名表單畫面](../screenshots/storyteller_guide_all/3_voting_panel/07_edit_nomination_form.png)
    
*   **取消提名記錄**：點選卡片底部的 **取消提名** 按鈕，確認後會移除該提名並退還可能已消耗的幽靈票。

---

## <img src="../public/pic/suicide.png" width="20" height="20" style="vertical-align: middle;" /> 投票計票與處決

*   **投票計票網格**：
    *   卡片中間顯示所有存活及已死亡的玩家座位按鈕。
    *   **投贊成票**：點擊玩家按鈕使其亮起並顯示勾號 **<img src="../public/pic/vote-yes.png" width="16" height="16" style="vertical-align: middle;" />** ，票數即時累加。
    *   **死亡玩家（靈魂投票）**：死亡玩家按鈕會帶有 **<img src="../public/pic/grave.png" width="16" height="16" style="vertical-align: middle;" />** 圖示。投贊成票後，其幽靈票會被自動扣除；已無幽靈票的死亡玩家按鈕會呈現半透明灰化且無法點擊。
    
    ![投票計票網格更新畫面](../screenshots/storyteller_guide_all/3_voting_panel/08_voting_grid_updated.png)
    
*   **執行處決**：
    *   當某個提名的贊成票數已達門檻，且為今日唯一最高票時，右下角的 **執行處決** 按鈕會被啟用。點擊確認後即可處決該被提名玩家。
        
    ![執行處決按鈕狀態畫面](../screenshots/storyteller_guide_all/3_voting_panel/09_execute_execution_state.png)
    
*   **已處決徽章與撤銷**：
    *   處決執行後，卡片會變為半透明並顯示 `<img src="../public/pic/suicide.png" width="16" height="16" style="vertical-align: middle;" /> 已處決`。您可以點擊 **撤銷** 按鈕來恢復被處決玩家的存活狀態。
    
    ![已處決徽章與撤銷按鈕畫面](../screenshots/storyteller_guide_all/3_voting_panel/10_undo_state_and_close.png)
