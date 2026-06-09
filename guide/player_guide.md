# 血染鐘樓魔典輔助程式 - 一般玩家（Player）使用手冊
---
## <img src="../public/pic/show.png" width="20" height="20" style="vertical-align: middle;" /> 魔典公開資訊查閱
在遊戲過程中，玩家最核心的畫面是主畫面的圓環魔典，可得知全局狀況。


## <img src="../public/pic/spellbook.png" width="20" height="20" style="vertical-align: middle;" /> 主畫面與全域控制區

### 1. 新增玩家
*   **操作流程**：
    1. 點擊主畫面左下角金色邊框內含黑色「<img src="../public/pic/plus.png" width="16" height="16" style="vertical-align: middle;" />」圖示的按鈕。
    2. 螢幕中央會彈出一個半透明輸入框，在輸入欄中填寫玩家名稱。
    3. 點擊「確認」即可在魔典上新增一個玩家座位。
    ![首頁魔典主畫面](../screenshots/script_management_all/1_guide/01_home_board.png)
    ![新增玩家按鈕](../screenshots/script_management_all/1_guide/02_click_add_btn.png)
    ![新增玩家對話框](../screenshots/script_management_all/1_guide/03_fill_player_name.png)
    ![成功新增玩家座位](../screenshots/script_management_all/1_guide/04_player_added.png)

### 2. 玩家座次與生死狀態
* **視覺位置**：主畫面中央由所有玩家頭像圍繞成的圓環。
* **元素辨識**：
  * **存活玩家**：頭像明亮，顯示角色名稱。
    ![存活玩家魔典盤面](../screenshots/script_management_all/1_guide/05_role_assigned.png)
  * **死亡玩家**：頭像灰色半透明，中心有骷髏頭圖示。
  * **幽靈投票標記**：死亡玩家旁顯示幽靈投票券（<img src="../public/pic/grave.png" width="16" height="16" style="vertical-align: middle;" />），亮起表示未消耗。
    ![死亡玩家灰頭像與幽靈票標記](../screenshots/script_management_all/1_guide/06_player_dead.png)

### 3. 當前遊戲階段與日誌
* **視覺位置**：螢幕頂部中央的狀態欄。
* **元素辨識**：頂部大字顯示當前階段，如「首夜」、「白天 (第 1 天)」或「夜晚 (第 1 夜)」。
## <img src="../public/pic/spellbook.png" width="20" height="20" style="vertical-align: middle;" /> 劇本管理
此階段玩家可管理劇本、角色庫與設定。以下截圖挑選了關鍵步驟，完整流程請參見測試腳本。
**第一步：開啟設定面板**
*   **操作流程**：點選主畫面右下角「齒輪 <img src="../public/pic/gear.png" width="16" height="16" style="vertical-align: middle;" />」按鈕展開選單，點選選單中帶有「<img src="../public/pic/magic-wand.png" width="16" height="16" style="vertical-align: middle;" />」圖示的 **設置** 按鈕，開啟系統設定面板。
    ![展開選單後畫面](../screenshots/script_management_all/2_script_management/02_click_menu_gear.png)
    ![點擊設置按鈕前畫面](../screenshots/script_management_all/2_script_management/03_click_settings_btn.png)
    ![設定面板畫面](../screenshots/script_management_all/2_script_management/04_settings_panel_opened.png)
*   **第二步：開啟劇本管理**
    *   **操作流程**：在設定面板中，點擊帶有「 <img src="../public/pic/spellbook.png" width="16" height="16" style="vertical-align: middle;" />」圖示的 **劇本管理** 按鈕，劇本管理系統面板將會滑入。
    ![點擊劇本管理前畫面](../screenshots/script_management_all/2_script_management/05_click_script_mgr.png)
    ![劇本管理主面板開啟畫面](../screenshots/script_management_all/2_script_management/06_script_editor_opened.png) 
*   **第三步：分頁導覽**
    *   **操作流程**：面板標題下方有兩個大分頁按鈕：
        1.  <img src="../public/pic/plus.png" width="16" height="16" style="vertical-align: middle;" /> `建立劇本` (編輯時為 <img src="../public/pic/edit.png" width="16" height="16" style="vertical-align: middle;" /> `編輯劇本`)：管理劇本資料與角色池配置。
        2.  <img src="../public/pic/notes.png" width="16" height="16" style="vertical-align: middle;" /> `劇本分類`：管理自訂分類排序與劇本快速歸類。    
    ![建立劇本分頁](../screenshots/script_management_all/2_script_management/07_tab_nav_create.png)
    ![劇本分類分頁](../screenshots/script_management_all/2_script_management/08_tab_nav_categories.png)
---
## <img src="../public/pic/plus.png" width="20" height="20" style="vertical-align: middle;" /> 分頁一：建立與編輯劇本
本分頁用於輸入劇本資料，並從角色池中選取要加入劇本的角色：
### 1. 輸入劇本基礎資料
*   **劇本名稱**：在面板左側「劇本名稱」輸入框中打入劇本名稱。
    ![輸入劇本名稱](../screenshots/script_management_all/2_script_management/09_fill_script_name.png)
*   **所屬分類**：在下拉選單中為此劇本選擇一個所屬類別。
    ![選擇劇本分類](../screenshots/script_management_all/2_script_management/10_select_category.png)
*   **匯入 JSON 劇本**：點選劇本欄位旁的 **<img src="../public/pic/import.png" width="16" height="16" style="vertical-align: middle;" /> 匯入 JSON** 按鈕，選取本機劇本檔可直接匯入。
    ![點擊匯入 JSON 劇本](../screenshots/script_management_all/2_script_management/11_click_import_json.png)
*   **上傳實體劇本圖檔**：點選右側帶有「<img src="../public/pic/upload.png" width="16" height="16" style="vertical-align: middle;" />」圖示的上傳框選取圖片。上傳後可看到縮圖與 **<img src="../public/pic/close.png" width="16" height="16" style="vertical-align: middle;" /> 刪除圖檔** 按鈕。
    ![上傳實體劇本圖檔](../screenshots/script_management_all/2_script_management/12_upload_physical_image.png)
### 2. 篩選與選擇角色
*   **關鍵字搜尋**：在角色搜尋框中輸入關鍵字，過濾出要找的角色。
    ![搜尋篩選角色](../screenshots/script_management_all/2_script_management/13_search_character.png) 
*   **批次操作**：點選 **<img src="../public/pic/vote-yes.png" width="16" height="16" style="vertical-align: middle;" /> 全選** 可以把當前列出的角色全部勾選，點選 **<img src="../public/pic/rubber.png" width="16" height="16" style="vertical-align: middle;" /> 清空** 則能全部取消勾選。
    ![全選當前篩選角色](../screenshots/script_management_all/2_script_management/14_select_all_roles.png)
    ![清空當前篩選角色](../screenshots/script_management_all/2_script_management/15_clear_all_roles.png)
*   **版本過濾**：點擊版本標籤切換過濾官方、自訂等角色來源。
    ![版本過濾標籤篩選](../screenshots/script_management_all/2_script_management/16_filter_edition_pills.png)   
*   **勾選角色**：在下方的角色網格中直接點選角色卡片，勾選的角色卡片右上角會標示綠色勾號「✓」且高亮。
    ![點選單個角色卡片](../screenshots/script_management_all/2_script_management/17_select_single_role.png)
### 3. 儲存劇本
*   **儲存按鈕**：點擊底部右側 **<img src="../public/pic/export.png" width="16" height="16" style="vertical-align: middle;" /> 確認建立劇本** 按鈕（編輯下為 **<img src="../public/pic/export.png" width="16" height="16" style="vertical-align: middle;" /> 確認儲存變更**）儲存。
    ![建立劇本儲存按鈕狀態](../screenshots/script_management_all/2_script_management/18_create_script_btn_state.png)  
*   **取消編輯**：編輯狀態下點擊左下角 **<img src="../public/pic/close.png" width="16" height="16" style="vertical-align: middle;" /> 取消** 按鈕可放棄修改退出。
    ![取消編輯按鈕狀態](../screenshots/script_management_all/2_script_management/19_cancel_edit_btn_state.png)
---
## <img src="../public/pic/notes.png" width="20" height="20" style="vertical-align: middle;" /> 分頁二：劇本分類管理
本分頁用於編輯劇本分類的排序，以及將現有劇本分配至不同類別中：
### 1. 分類名稱與排序管理
*   **分類分頁**：點選「<img src="../public/pic/notes.png" width="16" height="16" style="vertical-align: middle;" /> 劇本分類」分頁按鈕進入管理。
    ![劇本分類分頁開啟](../screenshots/script_management_all/2_script_management/20_categories_tab_opened.png)  
*   **修改分類名稱**：點選文字框直接修改分類名稱。
    ![修改分類名稱](../screenshots/script_management_all/2_script_management/21_rename_category.png)
*   **排序與刪除**：按住手柄「<img src="../public/pic/sort.png" width="16" height="16" style="vertical-align: middle;" />」可以上下拖曳分類順序，或點點右側上下移按鈕。點選垃圾桶圖示（<img src="../public/pic/trash.png" width="16" height="16" style="vertical-align: middle;" />）將刪除分類。
    ![排序手柄與刪除分類按鈕](../screenshots/script_management_all/2_script_management/22_category_controls.png) 
*   **新增分類**：在底部輸入名稱並點選 **<img src="../public/pic/plus.png" width="16" height="16" style="vertical-align: middle;" /> 新增** 按鈕。
    ![新增自訂分類](../screenshots/script_management_all/2_script_management/23_add_new_category.png)
### 2. 劇本歸類管理
*   **變更歸類**：使用下拉選單快速變更劇本所屬分類。
    ![變更劇本分類歸類](../screenshots/script_management_all/2_script_management/24_script_category_select.png)   
*   **編輯與導出**：點擊編輯圖示（<img src="../public/pic/edit.png" width="16" height="16" style="vertical-align: middle;" />）將載入劇本並切換回分頁一；點擊匯出按鈕（<img src="../public/pic/export.png" width="16" height="16" style="vertical-align: middle;" />）可下載該劇本的 JSON 檔案。
    ![編輯劇本角色配置](../screenshots/script_management_all/2_script_management/25_edit_script_roles.png)
    ![匯出劇本 JSON](../screenshots/script_management_all/2_script_management/26_export_script_json.png)
    
*   **刪除劇本**：點擊垃圾桶圖示（<img src="../public/pic/trash.png" width="16" height="16" style="vertical-align: middle;" />）可完全刪除該自訂劇本。
    ![刪除整個劇本確認與關閉](../screenshots/script_management_all/2_script_management/27_delete_script_and_close.png)
---
## <img src="../public/pic/magic-book.png" width="20" height="20" style="vertical-align: middle;" /> 劇本與角色庫查閱
玩家可檢視實體劇本大圖，以便對照角色資訊。
### 1.檢視實體劇本（實體劇本大圖）
*   操作流程： 
1. **首頁概覽**
    1. 點擊「新增玩家」按鈕正上方的實體劇本圖標按鈕 <img src="../public/pic/magic-book.png" width="16" height="16" style="vertical-align: middle;" />。
   ![查閱首頁](../screenshots/script_management_all/3_script_lookup/01_home_board.png)
2. **點擊檢視實體劇本按鈕**
   ![點擊檢視按鈕前畫面](../screenshots/script_management_all/3_script_lookup/02_click_view_script.png)
3. **實體大圖彈窗載入**
   ![彈出實體劇本大圖檢視](../screenshots/script_management_all/3_script_lookup/03_script_overlay_loaded.png)
4. **拖曳大圖**
   您可以對大圖進行拖曳、雙指捏合縮放。點擊大圖右上角的「<img src="../public/pic/close.png" width="16" height="16" style="vertical-align: middle;" />」按鈕或點擊大圖外側陰影處，即可關閉大圖。
   ![拖曳大圖移動進行對照](../screenshots/script_management_all/3_script_lookup/04_script_image_dragged.png)
5. **關閉彈窗**
   ![關閉彈窗後畫面](../screenshots/script_management_all/3_script_lookup/05_script_overlay_closed.png)
---
## <img src="../public/pic/whiteboard.png" width="20" height="20" style="vertical-align: middle;" /> 接收說書人資訊（白板與私訊）
說書人白板訊息會透過文字或投影方式呈現給玩家。
1. **白板開啟前的主畫面**
   ![白板前首頁](../screenshots/script_management_all/4_whiteboard_info/01_home_board.png)
2. **點擊白板按鈕**
   ![點擊白板按鈕前畫面](../screenshots/script_management_all/4_whiteboard_info/03_click_whiteboard_btn.png)
3. **白板面板開啟**
   ![白板開啟畫面](../screenshots/script_management_all/4_whiteboard_info/04_whiteboard_opened.png)
4. **填寫白板文字**
   ![填寫白板文字畫面](../screenshots/script_management_all/4_whiteboard_info/05_fill_whiteboard_text.png)
5. **點擊複製按鈕**
   ![點擊複製按鈕後提示](../screenshots/script_management_all/4_whiteboard_info/06_click_copy_btn.png)
6. **清除全部內容**
   ![清除白板內容畫面](../screenshots/script_management_all/4_whiteboard_info/07_click_clear_btn.png)
7. **關閉白板面板**
   ![關閉白板後畫面](../screenshots/script_management_all/4_whiteboard_info/08_whiteboard_closed.png)

---
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
    *   處決執行後，卡片會變為半透明並顯示 <img src="../public/pic/suicide.png" width="16" height="16" style="vertical-align: middle;" /> 已處決。您可以點擊 **撤銷** 按鈕來恢復被處決玩家的存活狀態。
    
    ![已處決徽章與撤銷按鈕畫面](../screenshots/storyteller_guide_all/3_voting_panel/10_undo_state_and_close.png)

---

祝您遊戲愉快！如有任何疑問，請參閱聯繫開發團隊。
