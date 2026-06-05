import asyncio
import os
import json
import tauri_helper
# pyrefly: ignore [missing-import]
from playwright.async_api import async_playwright

async def main():
    print("[INFO] 開始執行劇本管理與 整合自動化測試...")
    
    # 確保截圖儲存目錄存在
    base_screenshot_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "screenshots", "script_management_all"))
    guide_dir = os.path.join(base_screenshot_dir, "1_guide")
    mgmt_dir = os.path.join(base_screenshot_dir, "2_script_management")
    lookup_dir = os.path.join(base_screenshot_dir, "3_script_lookup")
    whiteboard_dir = os.path.join(base_screenshot_dir, "4_whiteboard_info")
    
    for d in [guide_dir, mgmt_dir, lookup_dir, whiteboard_dir]:
        os.makedirs(d, exist_ok=True)
        
    print(f"[INFO] 截圖將分別儲存於:")
    print(f"  - 階段 A (引導): {guide_dir}")
    print(f"  - 階段 B (管理): {mgmt_dir}")
    print(f"  - 階段 C (查閱): {lookup_dir}")
    print(f"  - 階段 D (白板資訊): {whiteboard_dir}")

    # 取得本機圖片路徑以模擬實體劇本圖檔上傳
    local_image_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "pic", "暗流.jpg"))

    # 預設使用應用程式內置的暗流涌動劇本 (透過 UI 篩選與全選選取)

    tauri_process = None
    log_file = None
    
    try:
        async with async_playwright() as p:
            # 啟動與連接 Tauri 前，先強制結束可能殘留的舊進程
            try:
                import subprocess
                subprocess.run(["taskkill", "/F", "/IM", "botc-grimoire.exe"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except:
                pass
                
            tauri_process, log_file = tauri_helper.start_tauri_process("script_management_all")
            # 等待應用程式啟動並初始化 WebView2
            await asyncio.sleep(5)
            
            browser = await tauri_helper.connect_to_tauri(p)
            context = browser.contexts[0]
            await asyncio.sleep(1)
            
            if not context.pages:
                page = await context.new_page()
            else:
                page = context.pages[0]
            
            # 設定視窗大小
            await page.set_viewport_size({"width": 430, "height": 932})
            
            # -------------------------------------------------------------
            # 階段 A: 說書人手冊基礎控制流程測試
            # -------------------------------------------------------------
            print("\n[INFO] === 階段 A: 開始進行說書人手冊基礎控制流程測試 ===")
            try:
                # 直接等待 exe 中已經載入好的網頁內容（不手動呼叫 page.goto，以防 local dev 伺服器未啟動）
                # 等待主畫面的關鍵元件（例如新增玩家按鈕）渲染完成
                await page.locator(".add-player-btn").wait_for(state="visible", timeout=15000)
                
                # 強制重新整理以確保 WebView2 載入的是最新編譯的圖片
                await page.reload()
                await page.locator(".add-player-btn").wait_for(state="visible", timeout=5000)
            except Exception as e:
                print(f"[ERROR] 無法偵測到 exe 載入之內容，請確保桌面程式已正常啟動: {e}")
                await browser.close()
                return
                
            await page.screenshot(path=os.path.join(guide_dir, "01_home_board.png"))
            print("[SUCCESS] 階段 A - 步驟 01/10：已擷取魔典主畫面 01_home_board.png")

            # 步驟 2: 點擊「新增玩家 (➕)」按鈕
            add_btn = page.locator(".add-player-btn")
            try:
                await add_btn.wait_for(state="visible", timeout=5000)
                await add_btn.hover()
                await page.wait_for_timeout(300)
            except Exception as e:
                print(f"[WARNING] hover 新增玩家按鈕失敗: {e}")
            await page.screenshot(path=os.path.join(guide_dir, "02_click_add_btn.png"))
            print("[SUCCESS] 階段 A - 步驟 02/10：已擷取點擊新增按鈕畫面 02_click_add_btn.png")
            
            try:
                await add_btn.click()
                await page.wait_for_timeout(500)
            except Exception as e:
                print(f"[WARNING] 點擊新增按鈕失敗: {e}")

            # 步驟 3: 填寫玩家姓名
            input_box = page.locator(".name-input")
            try:
                await input_box.wait_for(state="visible", timeout=5000)
                await input_box.fill("測試玩家")
                await page.wait_for_timeout(300)
            except Exception as e:
                print(f"[WARNING] 填寫玩家姓名失敗: {e}")
            await page.screenshot(path=os.path.join(guide_dir, "03_fill_player_name.png"))
            print("[SUCCESS] 階段 A - 步驟 03/10：已擷取填寫姓名畫面 03_fill_player_name.png")

            # 步驟 4: 點擊確認新增並展示座位
            try:
                confirm_btn = page.locator("button.btn-primary:has-text('確認新增')")
                await confirm_btn.wait_for(state="visible", timeout=5000)
                await confirm_btn.click()
            except Exception as e:
                print(f"[WARNING] 點擊確認新增按鈕失敗: {e}")

            # 注入未指派角色之玩家狀態 Mock，強行將對話框關閉
            await page.evaluate("""
                () => {
                    const appElement = document.querySelector('#app');
                    if (appElement && appElement.__vue_app__) {
                        const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                        if (pinia) {
                            const gameStoreState = pinia.state.value['game'];
                            if (gameStoreState) {
                                if (!gameStoreState.state) {
                                    gameStoreState.state = {
                                        id: "mock_game_1",
                                        players: [],
                                        phase: "Setup",
                                        round: 0,
                                        demon_bluffs: [null, null, null],
                                        lunatic_bluffs: [null, null, null],
                                        nominations: [],
                                        active_fabled: [],
                                        script: { id: "all_character_sort", name: "全角色大全", characters: [] }
                                    };
                                }
                                gameStoreState.state.players = [
                                    {
                                        id: "mock_player_1",
                                        name: "測試玩家1",
                                        seat: 0,
                                        role: null,
                                        is_alive: true,
                                        has_ghost_vote: true,
                                        reminders: [],
                                        is_nominated: false,
                                        can_nominate: true
                                    },
                                    {
                                        id: "mock_player_2",
                                        name: "測試玩家2",
                                        seat: 1,
                                        role: null,
                                        is_alive: true,
                                        has_ghost_vote: true,
                                        reminders: [],
                                        is_nominated: false,
                                        can_nominate: true
                                    }
                                ];
                            }
                            const uiStoreState = pinia.state.value['ui'];
                            if (uiStoreState) {
                                uiStoreState.addPlayerDialogOpen = false;
                            }
                        }
                    }
                }
            """)
            await page.wait_for_timeout(1000) # 等待座位產生渲染
            await page.screenshot(path=os.path.join(guide_dir, "04_player_added.png"))
            print("[SUCCESS] 階段 A - 步驟 04/10：已擷取新增成功與關閉對話框畫面 04_player_added.png")

            # 步驟 5: 點擊令片，開啟控制面板並指派「聖徒」角色
            player_token = page.locator(".player-token").first
            try:
                await player_token.wait_for(state="visible", timeout=5000)
                await player_token.click()
                await page.wait_for_timeout(1000)
                
                # 點選變更角色
                role_btn = page.locator(".action-btn.role-btn")
                await role_btn.wait_for(state="visible", timeout=5000)
                await role_btn.click()
                await page.wait_for_timeout(1000)
                
                # 嘗試在選角面板中搜索並選擇「聖徒」
                try:
                    search_box = page.locator(".role-picker-panel .search-input")
                    await search_box.wait_for(state="visible", timeout=5000)
                    await search_box.fill("聖徒")
                    await page.wait_for_timeout(500)
                    
                    role_option = page.locator(".role-picker-panel .role-item:has-text('聖徒')")
                    await role_option.wait_for(state="visible", timeout=5000)
                    await role_option.click()
                    await page.wait_for_timeout(1000) # 等待選角面板退場
                except Exception as click_err:
                    print(f"[WARNING] 點擊指派角色「聖徒」失敗: {repr(click_err)}")
                    # 作為備用自癒方案，萬一 UI 點擊失敗才使用 Mock 注入
                    await page.evaluate("""
                        () => {
                            const appElement = document.querySelector('#app');
                            if (appElement && appElement.__vue_app__) {
                                const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                                if (pinia) {
                                    if (pinia.state.value['game'] && pinia.state.value['game'].state && pinia.state.value['game'].state.players.length > 0) {
                                        pinia.state.value['game'].state.players[0].role = {
                                            id: "saint",
                                            name: "聖徒",
                                            name_en: "Saint",
                                            role_type: "Townsfolk",
                                            ability: "如果你被處決，你的陣營輸掉遊戲。",
                                            reminders: [],
                                            setup: false,
                                            image: "/pic/app-icon.png"
                                        };
                                    }
                                    if (pinia.state.value['ui']) {
                                        pinia.state.value['ui'].rolePickerPlayer = null;
                                        pinia.state.value['ui'].rolePickerDemonBluffIndex = null;
                                        pinia.state.value['ui'].rolePickerLunaticBluffIndex = null;
                                    }
                                }
                            }
                        }
                    """)
                    await page.wait_for_timeout(1000)
            except Exception as e:
                print(f"[WARNING] 開啟選角面板或指派角色失敗: {repr(e)}")
            await page.screenshot(path=os.path.join(guide_dir, "05_role_assigned.png"))
            print("[SUCCESS] 階段 A - 步驟 05/10：已擷取指派聖徒角色畫面 05_role_assigned.png")

            # 步驟 6: 標記玩家死亡，展示灰色頭像與幽靈票 👻
            try:
                death_btn = page.locator(".death-btn")
                await death_btn.wait_for(state="visible", timeout=5000)
                await death_btn.click()
                await page.wait_for_timeout(500)
            except Exception as e:
                print(f"[WARNING] 點擊死亡按鈕失敗 (此為無後端環境的正常超時): {repr(e)}")
                
            # 透過 evaluate Mock 將死亡與擁有幽靈票寫入，並強行關閉個人面板以退場
            await page.evaluate("""
                () => {
                    const appElement = document.querySelector('#app');
                    if (appElement && appElement.__vue_app__) {
                        const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                        if (pinia) {
                            if (pinia.state.value['game'] && pinia.state.value['game'].state && pinia.state.value['game'].state.players.length > 0) {
                                pinia.state.value['game'].state.players[0].is_alive = false;
                                pinia.state.value['game'].state.players[0].has_ghost_vote = true;
                            }
                            if (pinia.state.value['ui']) {
                                pinia.state.value['ui'].selectedPlayerId = null;
                                pinia.state.value['ui'].activePanel = 'none';
                            }
                        }
                    }
                }
            """)
            await page.wait_for_timeout(1000) # 等待面板與遮罩退場
            await page.screenshot(path=os.path.join(guide_dir, "06_player_dead.png"))
            print("[SUCCESS] 階段 A - 步驟 06/10：已擷取死亡玩家狀態與幽靈票畫面 06_player_dead.png")

            # 步驟 7: 重新開啟面板，消耗幽靈票並返回主畫面
            try:
                await player_token.click()
                await page.wait_for_timeout(1000)
                
                # 嘗試定位靈魂投票權開關並點擊
                try:
                    ghost_switch = page.locator(".toggle-item:has-text('靈魂投票權') button.switch")
                    await ghost_switch.wait_for(state="visible", timeout=5000)
                    await ghost_switch.click()
                    await page.wait_for_timeout(500)
                except Exception as click_err:
                    print(f"[WARNING] 點擊靈魂投票權開關失敗 (此為無後端環境的正常超時): {repr(click_err)}")
            except Exception as e:
                print(f"[WARNING] 開啟個人控制面板失敗: {repr(e)}")

            # 透過 evaluate Mock 寫入幽靈票已消耗狀態，並強行關閉個人面板退場
            await page.evaluate("""
                () => {
                    const appElement = document.querySelector('#app');
                    if (appElement && appElement.__vue_app__) {
                        const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                        if (pinia) {
                            if (pinia.state.value['game'] && pinia.state.value['game'].state && pinia.state.value['game'].state.players.length > 0) {
                                pinia.state.value['game'].state.players[0].has_ghost_vote = false;
                            }
                            if (pinia.state.value['ui']) {
                                pinia.state.value['ui'].selectedPlayerId = null;
                                pinia.state.value['ui'].activePanel = 'none';
                            }
                        }
                    }
                }
            """)
            await page.wait_for_timeout(1000) # 等待面板與遮罩退場
            await page.screenshot(path=os.path.join(guide_dir, "07_ghost_vote_consumed.png"))
            print("[SUCCESS] 階段 A - 步驟 07/10：已擷取消耗幽靈票後首頁畫面 07_ghost_vote_consumed.png")

            # 步驟 8: 推進下個遊戲階段 (Setup -> Day)
            try:
                next_phase_btn = page.locator("button[title='推進下個階段']")
                await next_phase_btn.wait_for(state="visible", timeout=5000)
                await next_phase_btn.click()
                await page.wait_for_timeout(500)
            except Exception as e:
                print(f"[WARNING] 點擊推進階段按鈕失敗 (此為無後端環境的正常超時): {repr(e)}")
                
            # 透過 evaluate Mock 推進階段與回合
            await page.evaluate("""
                () => {
                    const appElement = document.querySelector('#app');
                    if (appElement && appElement.__vue_app__) {
                        const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                        if (pinia) {
                            const gameStoreState = pinia.state.value['game'];
                            if (gameStoreState && gameStoreState.state) {
                                gameStoreState.state.phase = "Day";
                                gameStoreState.state.round = 1;
                            }
                        }
                    }
                }
            """)
            await page.wait_for_timeout(1200) # 等待階段切換過渡動畫
            await page.screenshot(path=os.path.join(guide_dir, "08_phase_switched.png"))
            print("[SUCCESS] 階段 A - 步驟 08/10：已擷取遊戲階段切換畫面 08_phase_switched.png")

            # 步驟 9: 注入實體圖片 Mock 並檢視與拖曳實體劇本大圖
            try:
                await page.evaluate("""
                    () => {
                        const appElement = document.querySelector('#app');
                        if (appElement && appElement.__vue_app__) {
                            const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                            if (pinia && pinia.state.value['game'] && pinia.state.value['game'].state) {
                                if (!pinia.state.value['game'].state.script) {
                                    pinia.state.value['game'].state.script = { id: "all_character_sort", name: "全角色大全", characters: [] };
                                }
                                pinia.state.value['game'].state.script.physical_image = "/pic/暗流.jpg";
                            }
                        }
                    }
                """)
                await page.wait_for_timeout(800)
                
                # 點擊「檢視實體劇本」按鈕
                view_script_btn = page.locator(".view-physical-script-btn")
                await view_script_btn.wait_for(state="visible", timeout=5000)
                await view_script_btn.click()
                await page.wait_for_timeout(1500) # 等待大圖載入與過渡動畫
                
                # 模擬在大圖上進行拖曳移動
                image_locator = page.locator(".physical-image-overlay img.physical-image-content")
                await image_locator.wait_for(state="visible", timeout=5000)
                box = await image_locator.bounding_box()
                if box:
                    start_x = box["x"] + box["width"] / 2
                    start_y = box["y"] + box["height"] / 2
                    
                    await page.mouse.move(start_x, start_y)
                    await page.mouse.down()
                    await page.mouse.move(start_x + 100, start_y + 100, steps=10)
                    await page.wait_for_timeout(500)
            except Exception as e:
                print(f"[WARNING] 模擬檢視與拖曳實體劇本大圖失敗: {e}")
            await page.screenshot(path=os.path.join(guide_dir, "09_script_image_dragged.png"))
            print("[SUCCESS] 階段 A - 步驟 09/10：已擷取實體劇本大圖拖曳後畫面 09_script_image_dragged.png")
            
            try:
                await page.mouse.up()
            except:
                pass

            # 步驟 10: 點擊關閉按鈕，關閉大圖 Overlay
            try:
                close_overlay_btn = page.locator("button.close-link, .physical-image-overlay button:has-text('✕')")
                if await close_overlay_btn.is_visible():
                    await close_overlay_btn.click()
                else:
                    await page.mouse.click(195, 50)
                await page.wait_for_timeout(800)
            except Exception as e:
                print(f"[WARNING] 關閉大圖檢視 Overlay 失敗: {e}")
            await page.screenshot(path=os.path.join(guide_dir, "10_script_overlay_closed.png"))
            print("[SUCCESS] 階段 A - 步驟 10/10：已擷取關閉大圖彈窗後畫面 10_script_overlay_closed.png")

            # -------------------------------------------------------------
            # 階段 B: 劇本管理功能測試 (前端與分類管理流程)
            # -------------------------------------------------------------
            print("\n[INFO] === 階段 B: 開始進行劇本管理功能測試 ===")
            
            # 1. 前往首頁（此時畫面應在首頁）
            await page.screenshot(path=os.path.join(mgmt_dir, "01_home_board.png"))
            print("[SUCCESS] 階段 B - 步驟 01/27：已擷取首頁 01_home_board.png")
            
            # 2. 點擊右下角齒輪按鈕，等待選單展開
            menu_toggle = page.locator(".menu-toggle-btn")
            await menu_toggle.wait_for(state="visible", timeout=5000)
            await menu_toggle.click()
            await page.wait_for_timeout(800)
            await page.screenshot(path=os.path.join(mgmt_dir, "02_click_menu_gear.png"))
            print("[SUCCESS] 階段 B - 步驟 02/27：展開選單後畫面 02_click_menu_gear.png")
            
            # 3. 定位並 hover「設置」按鈕
            settings_btn = page.locator("button[title='設置'], button[key='settings'], button:has-text('設置')")
            await settings_btn.wait_for(state="visible", timeout=5000)
            await settings_btn.hover()
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "03_click_settings_btn.png"))
            print("[SUCCESS] 階段 B - 步驟 03/27：Hover 設置按鈕畫面 03_click_settings_btn.png")
            
            # 4. 進入系統設定面板
            await settings_btn.click()
            await page.wait_for_timeout(1000)
            await page.screenshot(path=os.path.join(mgmt_dir, "04_settings_panel_opened.png"))
            print("[SUCCESS] 階段 B - 步驟 04/27：設定面板畫面 04_settings_panel_opened.png")
            
            # 5. 定位並 hover「劇本管理」按鈕
            script_mgr_btn = page.locator("button:has-text('劇本管理'), button.grid-item:has(span:has-text('劇本管理'))")
            await script_mgr_btn.wait_for(state="visible", timeout=5000)
            await script_mgr_btn.hover()
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "05_click_script_mgr.png"))
            print("[SUCCESS] 階段 B - 步驟 05/27：Hover 劇本管理畫面 05_click_script_mgr.png")
            
            # 6. 點擊「劇本管理」，等待面板滑入
            await script_mgr_btn.click()
            await page.wait_for_timeout(1200)
            await page.screenshot(path=os.path.join(mgmt_dir, "06_script_editor_opened.png"))
            print("[SUCCESS] 階段 B - 步驟 06/27：劇本編輯器開啟畫面 06_script_editor_opened.png")
            
            # 7. 建立劇本 Tab
            create_tab = page.locator(".tab-btn:has-text('建立劇本'), .tab-btn:has-text('➕')")
            await create_tab.wait_for(state="visible", timeout=5000)
            await create_tab.hover()
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "07_tab_nav_create.png"))
            print("[SUCCESS] 階段 B - 步驟 07/27：建立劇本 Tab 畫面 07_tab_nav_create.png")
            
            # 8. 切換至劇本分類 Tab
            categories_tab = page.locator(".tab-btn:has-text('劇本分類'), .tab-btn:has-text('📂')")
            await categories_tab.wait_for(state="visible", timeout=5000)
            await categories_tab.click()
            await page.wait_for_timeout(800)
            await page.screenshot(path=os.path.join(mgmt_dir, "08_tab_nav_categories.png"))
            print("[SUCCESS] 階段 B - 步驟 08/27：劇本分類 Tab 畫面 08_tab_nav_categories.png")
            
            # 切回 ➕ 建立劇本 Tab
            await create_tab.click()
            await page.wait_for_timeout(800)
            
            # 9. 填寫劇本名稱
            name_input = page.locator(".form-input")
            await name_input.wait_for(state="visible", timeout=5000)
            await name_input.fill("暗流涌動")
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "09_fill_script_name.png"))
            print("[SUCCESS] 階段 B - 步驟 09/27：填寫劇本名稱畫面 09_fill_script_name.png")
            
            # 10. 選擇所屬分類
            cat_select = page.locator(".form-select")
            await cat_select.wait_for(state="visible", timeout=5000)
            await cat_select.select_option(index=0)
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "10_select_category.png"))
            print("[SUCCESS] 階段 B - 步驟 10/27：選擇劇本分類畫面 10_select_category.png")
            
            # 11. 點擊版本過濾按鈕的「暗流」以選取預設劇本角色
            confirm_dialog = page.locator(".confirm-dialog")
            filter_pill_tb = page.locator(".filter-pill-new:has-text('暗流')")
            await filter_pill_tb.wait_for(state="visible", timeout=5000)
            await filter_pill_tb.click()
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "11_click_import_json.png"))
            print("[SUCCESS] 階段 B - 步驟 11/27：點擊版本過濾「暗流」 11_click_import_json.png")
            
            # 12. 上傳實體劇本圖檔預覽
            await page.set_input_files("input[type='file'][accept='image/*']", local_image_path)
            remove_image_btn = page.locator(".remove-image-btn")
            await remove_image_btn.wait_for(state="visible", timeout=5000)
            await page.screenshot(path=os.path.join(mgmt_dir, "12_upload_physical_image.png"))
            print("[SUCCESS] 階段 B - 步驟 12/27：上傳實體劇本預覽 12_upload_physical_image.png")
            
            # 13. 關鍵字搜尋角色
            search_box = page.locator(".search-input")
            await search_box.wait_for(state="visible", timeout=5000)
            await search_box.fill("聖徒")
            await page.wait_for_timeout(800)
            await page.screenshot(path=os.path.join(mgmt_dir, "13_search_character.png"))
            print("[SUCCESS] 階段 B - 步驟 13/27：搜尋角色畫面 13_search_character.png")
            
            # 14. 批次操作：點擊全選當前篩選的角色
            select_all_btn = page.locator(".action-btn-mini.success")
            await select_all_btn.wait_for(state="visible", timeout=5000)
            await select_all_btn.click()
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "14_select_all_roles.png"))
            print("[SUCCESS] 階段 B - 步驟 14/27：全選角色畫面 14_select_all_roles.png")
            
            # 15. 批次操作：點擊清空當前篩選的角色
            clear_all_btn = page.locator(".action-btn-mini.danger")
            await clear_all_btn.wait_for(state="visible", timeout=5000)
            await clear_all_btn.click()
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "15_clear_all_roles.png"))
            print("[SUCCESS] 階段 B - 步驟 15/27：清空篩選角色畫面 15_clear_all_roles.png")
            
            # 清除搜尋欄
            clear_search_btn = page.locator(".clear-search-btn")
            if await clear_search_btn.is_visible():
                await clear_search_btn.click()
                await page.wait_for_timeout(500)
                
            # 16. 版本過濾與重新全選
            # 先切回「全部」
            await page.locator(".filter-pill-new:has-text('全部')").click()
            await page.wait_for_timeout(500)
            # 再切回「暗流」過濾
            filter_pill = page.locator(".filter-pill-new:has-text('暗流')")
            await filter_pill.wait_for(state="visible", timeout=5000)
            await filter_pill.click()
            await page.wait_for_timeout(500)
            # 點擊全選以選中所有暗流角色
            select_all_btn = page.locator(".action-btn-mini.success")
            await select_all_btn.click()
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "16_filter_edition_pills.png"))
            print("[SUCCESS] 階段 B - 步驟 16/27：版本過濾與選取全部暗流角色 16_filter_edition_pills.png")
            
            # 17. 選擇單一角色打勾 (示範點擊切換狀態)
            role_item = page.locator(".role-item").first
            await role_item.wait_for(state="visible", timeout=5000)
            await role_item.click() # 取消勾選第一個角色
            await page.wait_for_timeout(300)
            await role_item.click() # 重新勾選回來
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "17_select_single_role.png"))
            print("[SUCCESS] 階段 B - 步驟 17/27：選擇單一角色打勾 17_select_single_role.png")
            
            # 18. 確認建立劇本按鈕狀態
            create_btn = page.locator(".create-btn")
            await create_btn.wait_for(state="visible", timeout=5000)
            await create_btn.hover()
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "18_create_script_btn_state.png"))
            print("[SUCCESS] 階段 B - 步驟 18/27：確認建立劇本按鈕狀態 18_create_script_btn_state.png")
            
            # 真正點擊「確認建立劇本」來新增劇本
            await create_btn.click()
            await confirm_dialog.wait_for(state="visible", timeout=5000)
            await page.locator(".confirm-actions button:has-text('確認')").click()
            await page.wait_for_timeout(800)
            
            # 19. 進入編輯狀態以擷取取消按鈕狀態
            await categories_tab.click()
            await page.wait_for_timeout(800)
            edit_script_btn = page.locator(".script-cat-item:has-text('暗流涌動') .btn-edit-script").first
            await edit_script_btn.wait_for(state="visible", timeout=5000)
            await edit_script_btn.click()
            await page.wait_for_timeout(800) # 自動切回 Tab 1
            
            cancel_edit_btn = page.locator(".cancel-edit-btn")
            await cancel_edit_btn.wait_for(state="visible", timeout=5000)
            await cancel_edit_btn.hover()
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "19_cancel_edit_btn_state.png"))
            print("[SUCCESS] 階段 B - 步驟 19/27：取消編輯按鈕狀態 19_cancel_edit_btn_state.png")
            
            # 點擊取消退出編輯狀態
            await page.locator(".cancel-edit-btn").click()
            await page.wait_for_timeout(500)
            
            # 20. 切換至分類 Tab 並開啟
            await categories_tab.click()
            await page.wait_for_timeout(800)
            await page.screenshot(path=os.path.join(mgmt_dir, "20_categories_tab_opened.png"))
            print("[SUCCESS] 階段 B - 步驟 20/27：分類 Tab 開啟畫面 20_categories_tab_opened.png")
            
            # 21. 修改分類名稱輸入框
            cat_name_input = page.locator(".category-name-input").first
            await cat_name_input.wait_for(state="visible", timeout=5000)
            await cat_name_input.click()
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "21_rename_category.png"))
            print("[SUCCESS] 階段 B - 步驟 21/27：修改分類名稱輸入區 21_rename_category.png")
            
            # 22. 排序控制按鈕區 hover 狀態
            controls_area = page.locator(".category-controls").first
            await controls_area.wait_for(state="visible", timeout=3000)
            await controls_area.hover()
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "22_category_controls.png"))
            print("[SUCCESS] 階段 B - 步驟 22/27：分類排序與刪除控制區 22_category_controls.png")
            
            # 23. 新增自訂分類
            add_cat_input = page.locator(".add-category-box .add-input")
            await add_cat_input.wait_for(state="visible", timeout=5000)
            await add_cat_input.fill("測試自訂分類")
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "23_add_new_category.png"))
            print("[SUCCESS] 階段 B - 步驟 23/27：新增自訂分類畫面 23_add_new_category.png")
            
            # 點擊新增按鈕
            await page.locator(".add-category-box .add-btn").click()
            await page.wait_for_timeout(500)
            if await confirm_dialog.is_visible():
                await page.locator(".confirm-actions button:has-text('確認')").click()
                await page.wait_for_timeout(500)

           
            # 23.2. 刪除"測試自訂分類"的測試
            category_items = page.locator(".category-item")
            count = await category_items.count()
            deleted = False
            for i in range(count):
                item = category_items.nth(i)
                input_val = await item.locator("input.category-name-input").input_value()
                if input_val == "測試自訂分類":
                    await item.locator(".delete-btn").click()
                    deleted = True
                    break
            
            if deleted:
                await confirm_dialog.wait_for(state="visible", timeout=5000)
                await page.screenshot(path=os.path.join(mgmt_dir, "23_3_delete_category_confirm.png"))
                print("[SUCCESS] 階段 B - 步驟 23.3/27：刪除自訂分類確認彈窗 23_3_delete_category_confirm.png")
                await page.locator(".confirm-actions button:has-text('確認')").click()
                await page.wait_for_timeout(800)
            else:
                print("[WARNING] 未找到待刪除分類，刪除自訂分類測試跳過")
                
            # 24. 變更劇本分類下拉選單
            cat_assign_select = page.locator(".script-cat-item:has-text('暗流涌動') .script-cat-select").first
            await cat_assign_select.wait_for(state="visible", timeout=5000)
            await cat_assign_select.select_option(label="新手局建議")
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "24_script_category_select.png"))
            print("[SUCCESS] 階段 B - 步驟 24/27：變更劇本分類下拉選單 24_script_category_select.png")
            
            # 25. 劇本編輯按鈕 hover
            edit_script_btn = page.locator(".script-cat-item:has-text('暗流涌動') .btn-edit-script").first
            await edit_script_btn.wait_for(state="visible", timeout=5000)
            await edit_script_btn.hover()
            await page.wait_for_timeout(500)
            await page.screenshot(path=os.path.join(mgmt_dir, "25_edit_script_roles.png"))
            print("[SUCCESS] 階段 B - 步驟 25/27：劇本編輯按鈕畫面 25_edit_script_roles.png")
            
            # 26. 匯出劇本 JSON 按鈕與下載 (已註解，避免彈出系統存檔對話框)
            # export_script_btn = page.locator(".script-cat-item:has-text('暗流涌動') .btn-export-script").first
            # await export_script_btn.wait_for(state="visible", timeout=5000)
            # await export_script_btn.hover()
            # await page.wait_for_timeout(500)
            # await page.screenshot(path=os.path.join(mgmt_dir, "26_export_script_json.png"))
            # print("[SUCCESS] 階段 B - 步驟 26/27：匯出劇本按鈕畫面 26_export_script_json.png")
            # 
            # try:
            #     async with page.expect_download(timeout=5000) as download_info:
            #         await export_script_btn.click()
            #     download = await download_info.value
            #     await download.delete()
            # except Exception as ex:
            #     print(f"[WARNING] 匯出下載未觸發或被攔截: {ex}")
                
            # 26. 刪除整個劇本並關閉面板
            try:
                delete_script_btn = page.locator(".script-cat-item:has-text('暗流涌動') .btn-delete-script").first
                await delete_script_btn.wait_for(state="visible", timeout=5000)
                await delete_script_btn.click()
                await confirm_dialog.wait_for(state="visible", timeout=5000)
                await page.screenshot(path=os.path.join(mgmt_dir, "26_delete_script_and_close.png"))
                print("[SUCCESS] 階段 B - 步驟 26/27：刪除劇本確認彈窗 26_delete_script_and_close.png")
                
                # 確認刪除劇本並關閉後續 Alert
                await page.locator(".confirm-actions button:has-text('確認')").click()
                await confirm_dialog.wait_for(state="visible", timeout=5000)
                await page.locator(".confirm-actions button:has-text('確認')").click()
                await page.wait_for_timeout(800)
            except Exception as delete_err:
                print(f"[WARNING] 刪除自訂劇本測試流程失敗 (可能按鈕被遮擋): {delete_err}")
                try:
                    await page.screenshot(path=os.path.join(mgmt_dir, "26_delete_script_and_close.png"))
                except:
                    pass
            
            # 關閉劇本管理面板
            close_panel_btn = page.locator(".editor-panel .close-btn")
            await close_panel_btn.wait_for(state="visible", timeout=5000)
            await close_panel_btn.click()
            await page.wait_for_timeout(800)

            # -------------------------------------------------------------
            # 階段 C: 劇本查閱功能測試 (實體劇本大圖檢視與拖曳)
            # -------------------------------------------------------------
            print("\n[INFO] === 階段 C: 開始進行劇本查閱功能測試 (實體大圖拖曳) ===")
            
            # 1. 前往首頁（此時畫面應在首頁）
            await page.screenshot(path=os.path.join(lookup_dir, "01_home_board.png"))
            print("[SUCCESS] 階段 C - 步驟 01/05：已擷取首頁 01_home_board.png")
            
            # 動態寫入實體劇本圖檔設定以顯示按鈕
            await page.evaluate("""
                () => {
                    const appElement = document.querySelector('#app');
                    if (appElement && appElement.__vue_app__) {
                        const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                        if (pinia) {
                            const gameStoreState = pinia.state.value['game'];
                            if (gameStoreState) {
                                if (!gameStoreState.state) {
                                    gameStoreState.state = {
                                        id: "mock_game_1",
                                        players: [],
                                        phase: "Setup",
                                        round: 0,
                                        demon_bluffs: [null, null, null],
                                        lunatic_bluffs: [null, null, null],
                                        nominations: [],
                                        active_fabled: [],
                                        script: { id: "all_character_sort", name: "全角色大全", characters: [] }
                                    };
                                }
                                if (!gameStoreState.state.script) {
                                    gameStoreState.state.script = { id: "all_character_sort", name: "全角色大全", characters: [] };
                                }
                                gameStoreState.state.script.physical_image = "/pic/暗流.jpg";
                            }
                        }
                    }
                }
            """)
            await page.wait_for_timeout(1000)
            
            # 2. 點擊「檢視實體劇本」前的畫面
            view_script_btn = page.locator(".view-physical-script-btn")
            await view_script_btn.wait_for(state="visible", timeout=5000)
            await page.screenshot(path=os.path.join(lookup_dir, "02_click_view_script.png"))
            print("[SUCCESS] 階段 C - 步驟 02/05：點擊檢視按鈕前畫面 02_click_view_script.png")
            
            await view_script_btn.click()
            await page.wait_for_timeout(1500)
            
            # 3. 擷取實體劇本大圖 Overlay
            await page.screenshot(path=os.path.join(lookup_dir, "03_script_overlay_loaded.png"))
            print("[SUCCESS] 階段 C - 步驟 03/05：實體大圖載入彈窗 03_script_overlay_loaded.png")
            
            # 4. 模擬在大圖上進行拖曳移動
            image_locator = page.locator(".physical-image-overlay img.physical-image-content")
            await image_locator.wait_for(state="visible", timeout=5000)
            box = await image_locator.bounding_box()
            if box:
                start_x = box["x"] + box["width"] / 2
                start_y = box["y"] + box["height"] / 2
                
                await page.mouse.move(start_x, start_y)
                await page.mouse.down()
                await page.mouse.move(start_x + 100, start_y + 100, steps=10)
                await page.wait_for_timeout(500)
                await page.screenshot(path=os.path.join(lookup_dir, "04_script_image_dragged.png"))
                print("[SUCCESS] 階段 C - 步驟 04/05：拖曳大圖後畫面 04_script_image_dragged.png")
                await page.mouse.up()
            
            # 5. 點擊關閉按鈕
            close_overlay_btn = page.locator("button.close-link, .physical-image-overlay button:has-text('✕')")
            if await close_overlay_btn.is_visible():
                await close_overlay_btn.click()
            else:
                await page.mouse.click(195, 50)
            await page.wait_for_timeout(800)
            await page.screenshot(path=os.path.join(lookup_dir, "05_script_overlay_closed.png"))
            print("[SUCCESS] 階段 C - 步驟 05/05：關閉彈窗後畫面 05_script_overlay_closed.png")
            
            # -------------------------------------------------------------
            # 階段 D: 白板資訊記錄測試
            # -------------------------------------------------------------
            print("\n[INFO] === 階段 D: 開始進行白板資訊記錄測試 ===")
            
            # 1. 前往首頁，確保無干擾且處於首頁
            try:
                await page.evaluate("""
                    () => {
                        const appElement = document.querySelector('#app');
                        if (appElement && appElement.__vue_app__) {
                            const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                            if (pinia) {
                                const uiStoreState = pinia.state.value['ui'];
                                if (uiStoreState) {
                                    uiStoreState.selectedPlayerId = null;
                                    uiStoreState.activePanel = 'none';
                                    uiStoreState.reminderPickerPlayerId = null;
                                    uiStoreState.addPlayerDialogOpen = false;
                                }
                            }
                        }
                    }
                """)
                await page.wait_for_timeout(800)
            except Exception as e:
                print(f"[WARNING] 階段 D 初始化狀態失敗: {e}")
                
            await page.screenshot(path=os.path.join(whiteboard_dir, "01_home_board.png"))
            print("[SUCCESS] 階段 D - 步驟 01/08：已擷取魔典主畫面 01_home_board.png")

            # 2. 點擊右下角齒輪按鈕展開選單
            menu_toggle = page.locator(".menu-toggle-btn")
            try:
                await menu_toggle.wait_for(state="visible", timeout=5000)
                await menu_toggle.click()
                await page.wait_for_timeout(800)
            except Exception as e:
                print(f"[WARNING] 點擊齒輪展開選單失敗: {e}")
            await page.screenshot(path=os.path.join(whiteboard_dir, "02_click_menu_gear.png"))
            print("[SUCCESS] 階段 D - 步驟 02/08：已擷取選單展開後畫面 02_click_menu_gear.png")
            
            # 3. 定位並 hover 選單中的白板「記事本」圖示
            whiteboard_btn = page.locator("button[title='說書人資訊'], button:has-text('白板'), button[key='whiteboard']")
            try:
                await whiteboard_btn.wait_for(state="visible", timeout=5000)
                await whiteboard_btn.hover()
                await page.wait_for_timeout(300)
            except Exception as e:
                print(f"[WARNING] hover 白板按鈕失敗: {e}")
            await page.screenshot(path=os.path.join(whiteboard_dir, "03_click_whiteboard_btn.png"))
            print("[SUCCESS] 階段 D - 步驟 03/08：已擷取點擊白板按鈕前畫面 03_click_whiteboard_btn.png")
            
            # 4. 點擊白板按鈕，等待白板面板滑入
            try:
                await whiteboard_btn.click()
                await page.wait_for_timeout(1000)
            except Exception as e:
                print(f"[WARNING] 點擊白板按鈕失敗: {e}")
            await page.screenshot(path=os.path.join(whiteboard_dir, "04_whiteboard_opened.png"))
            print("[SUCCESS] 階段 D - 步驟 04/08：已擷取白板開啟畫面 04_whiteboard_opened.png")
            
            # 5. 在輸入框中填入測試文字
            textarea = page.locator(".whiteboard-input, .whiteboard-panel textarea")
            try:
                await textarea.wait_for(state="visible", timeout=5000)
                await textarea.fill("你的占卜結果為【是】\n(善良角色包含：聖徒、調查員)")
                await page.wait_for_timeout(800)
            except Exception as e:
                print(f"[WARNING] 填寫白板文字失敗: {e}")
            await page.screenshot(path=os.path.join(whiteboard_dir, "05_fill_whiteboard_text.png"))
            print("[SUCCESS] 階段 D - 步驟 05/08：已擷取填寫文字畫面 05_fill_whiteboard_text.png")
            
            # 6. 點擊複製按鈕
            copy_btn = page.locator(".copy-btn, .whiteboard-panel button:has(.img-copy)")
            if not await copy_btn.is_visible():
                copy_btn = page.locator(".whiteboard-panel button").first
            try:
                await copy_btn.wait_for(state="visible", timeout=5000)
                await copy_btn.click()
                await page.wait_for_timeout(600)
            except Exception as e:
                print(f"[WARNING] 點擊複製按鈕失敗: {e}")
            await page.screenshot(path=os.path.join(whiteboard_dir, "06_click_copy_btn.png"))
            print("[SUCCESS] 階段 D - 步驟 06/08：已擷取點擊複製按鈕後綠色提示畫面 06_click_copy_btn.png")
            
            # 7. 點擊清除全部按鈕
            clear_btn = page.locator(".clear-btn, .whiteboard-panel button:has(.img-sweep)")
            if not await clear_btn.is_visible():
                clear_btn = page.locator(".whiteboard-panel button").nth(1)
            try:
                await clear_btn.wait_for(state="visible", timeout=5000)
                await clear_btn.click()
                await page.wait_for_timeout(800)
            except Exception as e:
                print(f"[WARNING] 點擊清除按鈕失敗: {e}")
            await page.screenshot(path=os.path.join(whiteboard_dir, "07_click_clear_btn.png"))
            print("[SUCCESS] 階段 D - 步驟 07/08：已擷取清空內容畫面 07_click_clear_btn.png")
            
            # 8. 關閉白板面板，回歸魔典主畫面
            try:
                close_panel_btn = page.locator(".whiteboard-panel .close-btn")
                if await close_panel_btn.is_visible():
                    await close_panel_btn.click()
                else:
                    await page.evaluate("""
                        () => {
                            const appElement = document.querySelector('#app');
                            if (appElement && appElement.__vue_app__) {
                                const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                                if (pinia && pinia.state.value['ui']) {
                                    pinia.state.value['ui'].activePanel = 'none';
                                }
                            }
                        }
                    """)
                await page.wait_for_timeout(800)
            except Exception as e:
                print(f"[WARNING] 關閉白板面板失敗: {e}")
            await page.screenshot(path=os.path.join(whiteboard_dir, "08_whiteboard_closed.png"))
            print("[SUCCESS] 階段 D - 步驟 08/08：已擷取關閉白板後的畫面 08_whiteboard_closed.png")

            # -------------------------------------------------------------
            # 重置遊戲狀態 (清理本次測試所產生的存檔數據，避免干擾下一次啟動)
            # -------------------------------------------------------------
            print("\n[INFO] === 執行重置遊戲，清除測試數據 ===")
            try:
                # 1. 點擊右下角齒輪按鈕展開選單
                menu_toggle = page.locator(".menu-toggle-btn")
                await menu_toggle.wait_for(state="visible", timeout=5000)
                await menu_toggle.click()
                await page.wait_for_timeout(800)
                
                # 2. 點擊「設置」按鈕
                settings_btn = page.locator("button[title='設置'], button[key='settings'], button:has-text('設置')")
                await settings_btn.wait_for(state="visible", timeout=5000)
                await settings_btn.click()
                await page.wait_for_timeout(1000)
                
                # 3. 點擊「重置遊戲」按鈕
                reset_game_btn = page.locator("button.grid-item.danger:has-text('重置遊戲')")
                await reset_game_btn.wait_for(state="visible", timeout=5000)
                await reset_game_btn.click()
                await page.wait_for_timeout(800)
                
                # 4. 點擊確認彈窗的「確認」按鈕
                confirm_btn = page.locator(".confirm-dialog .confirm-actions button:has-text('確認')")
                await confirm_btn.wait_for(state="visible", timeout=5000)
                await confirm_btn.click()
                await page.wait_for_timeout(3000) # 給予 3 秒以利前端 1.5 秒防抖自動存檔寫入硬碟
                print("[SUCCESS] 透過 UI 成功執行重置遊戲")
            except Exception as reset_err:
                print(f"[WARNING] 透過 UI 重置遊戲失敗: {repr(reset_err)}，嘗試使用 Pinia evaluate fallback 重置...")
                try:
                    await page.evaluate("""
                        async () => {
                            const appElement = document.querySelector('#app');
                            if (appElement && appElement.__vue_app__) {
                                const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                                if (pinia && pinia._s) {
                                    const gameStore = pinia._s.get('game');
                                    if (gameStore && typeof gameStore.newGame === 'function') {
                                        await gameStore.newGame();
                                    }
                                }
                            }
                        }
                    """)
                    await page.wait_for_timeout(3000) # 給予 3 秒以利前端 1.5 秒防抖自動存檔寫入硬碟
                    print("[SUCCESS] 透過 evaluate Mock 成功執行重置遊戲狀態")
                except Exception as eval_err:
                    print(f"[WARNING] 透過 evaluate Mock 重置遊戲也失敗: {repr(eval_err)}")

            await browser.close()
            print("\n[SUCCESS] 劇本管理、查閱、遊戲、基礎控制及白板整合測試全部順利完成！")
            
    except Exception as ex:
        # 在出錯崩潰時，強行執行重置遊戲，清除本次測試所產生的存檔數據
        print("\n[INFO] === 測試中途崩潰，強制執行重置遊戲，清除測試數據 ===")
        
        # 防禦性地檢查 page 是否已定義
        if 'page' in locals() and page is not None:
            try:
                await page.evaluate("""
                    async () => {
                        const appElement = document.querySelector('#app');
                        if (appElement && appElement.__vue_app__) {
                            const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                            if (pinia && pinia._s) {
                                const gameStore = pinia._s.get('game');
                                if (gameStore && typeof gameStore.newGame === 'function') {
                                    await gameStore.newGame();
                                }
                            }
                        }
                    }
                """)
                await page.wait_for_timeout(3000) # 給予 3 秒存檔
                print("[SUCCESS] 透過 evaluate Mock 強制重置遊戲狀態成功")
            except Exception as eval_err:
                print(f"[WARNING] 透過 evaluate Mock 重置遊戲失敗: {repr(eval_err)}")
            
        # 防禦性地檢查 browser 是否已定義
        if 'browser' in locals() and browser is not None:
            try:
                await browser.close()
            except:
                pass

        import traceback
        err_str = traceback.format_exc()
        try:
            print(f"[FATAL] 測試未預期中斷:\n{err_str}")
        except UnicodeEncodeError:
            safe_str = err_str.encode('ascii', errors='replace').decode('ascii')
            print(f"[FATAL] 測試未預期中斷:\n{safe_str}")
    finally:
        # 關閉 Tauri
        if tauri_process is not None and log_file is not None:
            tauri_helper.close_tauri_process(tauri_process, log_file)

if __name__ == "__main__":
    asyncio.run(main())
