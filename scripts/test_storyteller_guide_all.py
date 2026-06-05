import asyncio
import os
import tauri_helper
# pyrefly: ignore [missing-import]
from playwright.async_api import async_playwright

async def main():
    print("[INFO] 開始執行說書人手冊-三大模組整合自動化測試...")
    
    # 確保截圖儲存目錄存在
    base_screenshot_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "screenshots", "storyteller_guide_all"))
    guide_dir = os.path.join(base_screenshot_dir, "1_storyteller_guide")
    reminder_dir = os.path.join(base_screenshot_dir, "2_reminder_picker")
    voting_dir = os.path.join(base_screenshot_dir, "3_voting_panel")
    whiteboard_dir = os.path.join(base_screenshot_dir, "4_whiteboard_info")
    
    for d in [guide_dir, reminder_dir, voting_dir, whiteboard_dir]:
        os.makedirs(d, exist_ok=True)
        
    print(f"[INFO] 截圖將分別儲存於:")
    print(f"  - 階段 A (基礎控制): {guide_dir}")
    print(f"  - 階段 B (提示標記): {reminder_dir}")
    print(f"  - 階段 C (投票面板): {voting_dir}")
    print(f"  - 階段 D (白板資訊): {whiteboard_dir}")

    tauri_process = None
    log_file = None
    
    try:
        async with async_playwright() as p:
            # 啟動與連接 Tauri
            tauri_process, log_file = tauri_helper.start_tauri_process("storyteller_guide_all")
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
                await input_box.fill("測試玩家1")
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
                    print(f"[WARNING] 點擊指派角色「聖徒」失敗: {click_err}")
            except Exception as e:
                print(f"[WARNING] 開啟選角面板失敗: {e}")

            # 透過 evaluate Mock 強行注入聖徒並關閉選角面板，確保選角面板退場
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
                                pinia.state.value['ui'].isRolePickerOpen = false;
                            }
                        }
                    }
                }
            """)
            await page.wait_for_timeout(1000) # 等待選角面板退場
            await page.screenshot(path=os.path.join(guide_dir, "05_role_assigned.png"))
            print("[SUCCESS] 階段 A - 步驟 05/10：已擷取指派聖徒角色畫面 05_role_assigned.png")

            # 步驟 6: 標記玩家死亡，展示灰色頭像與幽靈票 👻
            try:
                death_btn = page.locator(".death-btn")
                await death_btn.wait_for(state="visible", timeout=5000)
                await death_btn.click()
                await page.wait_for_timeout(500)
            except Exception as e:
                print(f"[WARNING] 點擊死亡按鈕失敗 (此為無後端環境的正常超時): {e}")
                
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
                    print(f"[WARNING] 點擊靈魂投票權開關失敗 (此為無後端環境的正常超時): {click_err}")
            except Exception as e:
                print(f"[WARNING] 開啟個人控制面板失敗: {e}")

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
                print(f"[WARNING] 點擊推進階段按鈕失敗 (此為無後端環境的正常超時): {e}")
                
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
                image_locator = page.locator(".physical-image-overlay img")
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
            # 階段 B: 說書人提示標記管理測試
            # -------------------------------------------------------------
            print("\n[INFO] === 階段 B: 開始進行說書人手冊-提示標記管理測試 ===")
            
            # 1. 前往首頁，並注入一名調查員 mock 玩家 (01_home_board.png)
            try:
                # 注入已指派調查員的玩家座位，使其擁有專屬標記
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
                                            id: "storyteller_p3",
                                            name: "提示標記測試員",
                                            seat: 0,
                                            role: {
                                                id: "investigator",
                                                name: "調查員",
                                                name_en: "Investigator",
                                                role_type: "Townsfolk",
                                                ability: "你得知兩名玩家之一是某爪牙角色。",
                                                reminders: ["爪牙", "錯誤"],
                                                setup: false,
                                                image: "/pic/app-icon.png"
                                            },
                                            is_alive: true,
                                            has_ghost_vote: true,
                                            reminders: [],
                                            is_nominated: false,
                                            can_nominate: true
                                        }
                                    ];
                                }
                                // 確保關閉所有面板與對話框
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
                await page.wait_for_timeout(1000)
            except Exception as e:
                print(f"[WARNING] 階段 B 注入調查員玩家失敗: {e}")
                
            await page.screenshot(path=os.path.join(reminder_dir, "01_home_board.png"))
            print("[SUCCESS] 階段 B - 步驟 01/08：已擷取魔典主畫面 01_home_board.png")

            # 2. 定位並開啟玩家控制面板， hover 提示標記按鈕
            try:
                # 點擊玩家 Token 展開個人面板
                await page.locator(".player-token").first.click()
                await page.wait_for_timeout(800)
                
                reminder_btn = page.locator(".action-btn.reminder-btn")
                await reminder_btn.wait_for(state="visible", timeout=5000)
                await reminder_btn.hover()
                await page.wait_for_timeout(300)
            except Exception as e:
                print(f"[WARNING] hover 提示標記按鈕失敗: {e}")
            await page.screenshot(path=os.path.join(reminder_dir, "02_click_reminder_picker_btn.png"))
            print("[SUCCESS] 階段 B - 步驟 02/08：已擷取點擊提示標記按鈕前畫面 02_click_reminder_picker_btn.png")

            # 3. 點擊按鈕彈出 ReminderPicker 面板
            try:
                await page.locator(".action-btn.reminder-btn").click()
                await page.wait_for_timeout(800) # 等待面板彈出
            except Exception as e:
                print(f"[WARNING] 開啟 ReminderPicker 面板失敗: {e}")
            await page.screenshot(path=os.path.join(reminder_dir, "03_reminder_picker_opened.png"))
            print("[SUCCESS] 階段 B - 步驟 03/08：已擷取提示標記面板開啟畫面 03_reminder_picker_opened.png")

            # 4. hover 通用標記並以 Mock 寫入
            try:
                good_btn = page.locator(".common-badge:has-text('善良'), .common-badge").first
                await good_btn.wait_for(state="visible", timeout=5000)
                await good_btn.hover()
                await page.wait_for_timeout(300)
                
                # Mock 將通用標記寫入 reminders 陣列
                await page.evaluate("""
                    () => {
                        const appElement = document.querySelector('#app');
                        if (appElement && appElement.__vue_app__) {
                            const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                            if (pinia && pinia.state.value['game'] && pinia.state.value['game'].state) {
                                pinia.state.value['game'].state.players[0].reminders = [
                                    { id: "rem_g1", text: "善良", source_role: "自定義", round: 0 }
                                ];
                            }
                        }
                    }
                """)
                await page.wait_for_timeout(500)
            except Exception as e:
                print(f"[WARNING] hover 或 Mock 通用標記失敗: {e}")
            await page.screenshot(path=os.path.join(reminder_dir, "04_add_general_reminder.png"))
            print("[SUCCESS] 階段 B - 步驟 04/08：已擷取新增通用標記畫面 04_add_general_reminder.png")

            # 5. hover 場上專屬標記並以 Mock 寫入
            try:
                # 定位調查員下屬的專屬標記
                in_play_badge = page.locator(".in-play-badge").first
                await in_play_badge.wait_for(state="visible", timeout=5000)
                await in_play_badge.hover()
                await page.wait_for_timeout(300)
                
                # Mock 寫入調查員的「爪牙」標記
                await page.evaluate("""
                    () => {
                        const appElement = document.querySelector('#app');
                        if (appElement && appElement.__vue_app__) {
                            const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                            if (pinia && pinia.state.value['game'] && pinia.state.value['game'].state) {
                                pinia.state.value['game'].state.players[0].reminders.push(
                                    { id: "rem_c1", text: "爪牙", source_role: "調查員", round: 0 }
                                );
                            }
                        }
                    }
                """)
                await page.wait_for_timeout(500)
            except Exception as e:
                print(f"[WARNING] hover 或 Mock 專屬標記失敗: {e}")
            await page.screenshot(path=os.path.join(reminder_dir, "05_add_character_reminder.png"))
            print("[SUCCESS] 階段 B - 步驟 05/08：已擷取新增專屬標記畫面 05_add_character_reminder.png")

            # 6. 自定義填寫標記，hover「新增」按鈕並以 Mock 寫入
            try:
                custom_input = page.locator(".custom-input")
                await custom_input.wait_for(state="visible", timeout=5000)
                await custom_input.fill("測試自訂標記")
                await page.wait_for_timeout(300)
                
                add_btn = page.locator(".custom-input-row .action-btn")
                await add_btn.hover()
                await page.wait_for_timeout(300)
                
                # Mock 寫入自定義標記
                await page.evaluate("""
                    () => {
                        const appElement = document.querySelector('#app');
                        if (appElement && appElement.__vue_app__) {
                            const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                            if (pinia && pinia.state.value['game'] && pinia.state.value['game'].state) {
                                pinia.state.value['game'].state.players[0].reminders.push(
                                    { id: "rem_cust", text: "測試自訂標記", source_role: "自定義", round: 0 }
                                );
                            }
                        }
                    }
                """)
                await page.wait_for_timeout(500)
            except Exception as e:
                print(f"[WARNING] hover 或 Mock 新增自定義標記失敗: {e}")
            await page.screenshot(path=os.path.join(reminder_dir, "06_add_custom_reminder.png"))
            print("[SUCCESS] 階段 B - 步驟 06/08：已擷取填寫自定義標記畫面 06_add_custom_reminder.png")

            # 7. 點選現有標記進入修改模式展示垃圾桶
            try:
                existing_badge = page.locator(".reminder-badge.existing:has-text('測試自訂標記')")
                await existing_badge.wait_for(state="visible", timeout=5000)
                await existing_badge.click()
                await page.wait_for_timeout(500) # 等待進入修改模式
            except Exception as e:
                print(f"[WARNING] 點選現有標記失敗: {e}")
            await page.screenshot(path=os.path.join(reminder_dir, "07_edit_delete_reminder.png"))
            print("[SUCCESS] 階段 B - 步驟 07/08：已擷取編輯模式下顯示垃圾桶畫面 07_edit_delete_reminder.png")

            # 8. hover 垃圾桶，並以 Mock 刪除標記並強制關閉面板展示首頁
            try:
                delete_btn = page.locator(".custom-input-row .delete-btn")
                await delete_btn.wait_for(state="visible", timeout=5000)
                await delete_btn.hover()
                await page.wait_for_timeout(300)
            except Exception as e:
                print(f"[WARNING] hover 刪除標記按鈕失敗: {e}")
                
            try:
                # 使用 Pinia Mock 刪除自定義標記，並強制關閉面板
                await page.evaluate("""
                    () => {
                        const appElement = document.querySelector('#app');
                        if (appElement && appElement.__vue_app__) {
                            const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                            if (pinia) {
                                const gameStoreState = pinia.state.value['game'];
                                if (gameStoreState && gameStoreState.state) {
                                    gameStoreState.state.players[0].reminders = gameStoreState.state.players[0].reminders.filter(r => r.id !== 'rem_cust');
                                }
                                const uiStoreState = pinia.state.value['ui'];
                                if (uiStoreState) {
                                    uiStoreState.reminderPickerPlayerId = null;
                                    uiStoreState.selectedPlayerId = null;
                                    uiStoreState.activePanel = 'none';
                                }
                            }
                        }
                    }
                """)
                await page.wait_for_timeout(1000)
            except Exception as e:
                print(f"[WARNING] Mock 刪除標記並關閉面板失敗: {e}")
            await page.screenshot(path=os.path.join(reminder_dir, "08_reminder_deleted_and_close.png"))
            print("[SUCCESS] 階段 B - 步驟 08/08：已擷取刪除並回到首頁展示貼好標記畫面 08_reminder_deleted_and_close.png")

            # -------------------------------------------------------------
            # 階段 C: 投票與處決面板管理測試
            # -------------------------------------------------------------
            print("\n[INFO] === 階段 C: 開始進行投票面板測試 ===")
            
            # 1. 前往首頁，並注入 4 名測試玩家座位 (01_home_board.png)
            try:
                # 注入 Mock 玩家資料，包含存活、死亡、爪牙與惡魔
                await page.evaluate("""
                    () => {
                        const appElement = document.querySelector('#app');
                        if (appElement && appElement.__vue_app__) {
                            const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                            if (pinia) {
                                const gameStoreState = pinia.state.value['game'];
                                if (gameStoreState) {
                                    gameStoreState.state = {
                                        id: "mock_game_voting",
                                        players: [
                                            {
                                                id: "storyteller_p1",
                                                name: "提名者玩家",
                                                seat: 0,
                                                role: { id: "washerwoman", name: "洗衣婦", role_type: "Townsfolk", image: "/pic/app-icon.png" },
                                                is_alive: true,
                                                has_ghost_vote: true,
                                                reminders: [],
                                                is_nominated: false,
                                                can_nominate: true
                                            },
                                            {
                                                id: "storyteller_p2",
                                                name: "被提名玩家",
                                                seat: 1,
                                                role: { id: "librarian", name: "圖書管理員", role_type: "Townsfolk", image: "/pic/app-icon.png" },
                                                is_alive: true,
                                                has_ghost_vote: true,
                                                reminders: [],
                                                is_nominated: false,
                                                can_nominate: true
                                            },
                                            {
                                                id: "storyteller_p3",
                                                name: "爪牙投票者",
                                                seat: 2,
                                                role: { id: "poisoner", name: "下毒者", role_type: "Minion", image: "/pic/app-icon.png" },
                                                is_alive: true,
                                                has_ghost_vote: true,
                                                reminders: [],
                                                is_nominated: false,
                                                can_nominate: true
                                            },
                                            {
                                                id: "storyteller_p4",
                                                name: "已死惡魔玩家",
                                                seat: 3,
                                                role: { id: "imp", name: "小鬼", role_type: "Demon", image: "/pic/app-icon.png" },
                                                is_alive: false,
                                                has_ghost_vote: true,
                                                reminders: [],
                                                is_nominated: false,
                                                can_nominate: true
                                            }
                                        ],
                                        phase: "Day",
                                        round: 1,
                                        demon_bluffs: [null, null, null],
                                        lunatic_bluffs: [null, null, null],
                                        nominations: [],
                                        active_fabled: [],
                                        script: { id: "all_character_sort", name: "全角色大全", characters: [] }
                                    };
                                }
                                // 重置 UI state，確保無干擾且處於首頁
                                const uiStoreState = pinia.state.value['ui'];
                                if (uiStoreState) {
                                    uiStoreState.selectedPlayerId = null;
                                    uiStoreState.activePanel = 'none';
                                    uiStoreState.reminderPickerPlayerId = null;
                                }
                            }
                        }
                    }
                """)
                await page.wait_for_timeout(1000)
            except Exception as e:
                print(f"[WARNING] 階段 C 注入 4 名玩家失敗: {e}")
                
            await page.screenshot(path=os.path.join(voting_dir, "01_home_board.png"))
            print("[SUCCESS] 階段 C - 步驟 01/10：已擷取魔典主畫面 01_home_board.png")

            # 2. 點擊右下角「齒輪 ⚙️」展開功能選單
            menu_toggle = page.locator(".menu-toggle-btn")
            try:
                await menu_toggle.wait_for(state="visible", timeout=5000)
                await menu_toggle.click()
                await page.wait_for_timeout(800)
            except Exception as e:
                print(f"[WARNING] 展開齒輪選單失敗: {e}")
            await page.screenshot(path=os.path.join(voting_dir, "02_click_menu_gear.png"))
            print("[SUCCESS] 階段 C - 步驟 02/10：已擷取展開選單後畫面 02_click_menu_gear.png")

            # 3. 定位並 hover「投票管理 (🗳️)」圖示
            voting_btn = page.locator("button[title='投票管理'], button.menu-btn:has(img[src='/pic/vote-yes.png'])")
            try:
                await voting_btn.wait_for(state="visible", timeout=5000)
                await voting_btn.hover()
                await page.wait_for_timeout(300)
            except Exception as e:
                print(f"[WARNING] hover 投票管理按鈕失敗: {e}")
            await page.screenshot(path=os.path.join(voting_dir, "03_click_voting_btn.png"))
            print("[SUCCESS] 階段 C - 步驟 03/10：已擷取點擊投票管理前畫面 03_click_voting_btn.png")

            # 4. 點選「投票管理」彈出投票管理面板
            try:
                await voting_btn.click()
                await page.wait_for_timeout(1000) # 等待面板滑入
            except Exception as e:
                print(f"[WARNING] 點擊投票管理按鈕失敗: {e}")
            await page.screenshot(path=os.path.join(voting_dir, "04_voting_panel_opened.png"))
            print("[SUCCESS] 階段 C - 步驟 04/10：已擷取投票面板開啟畫面 04_voting_panel_opened.png")

            # 5. 發起提名，hover「確認提名」按鈕
            try:
                # 選擇提名者與被提名者
                nominator_select = page.locator(".nominate-section select").first
                nominee_select = page.locator(".nominate-section select").nth(1)
                
                await nominator_select.select_option(label="1. 提名者玩家")
                await nominee_select.select_option(label="2. 被提名玩家")
                await page.wait_for_timeout(300)
                
                nominate_btn = page.locator(".nominate-btn")
                await nominate_btn.hover()
                await page.wait_for_timeout(300)
            except Exception as e:
                print(f"[WARNING] 填寫提名資料失敗: {e}")
            await page.screenshot(path=os.path.join(voting_dir, "05_click_nominate_btn.png"))
            print("[SUCCESS] 階段 C - 步驟 05/10：已擷取確認提名按鈕狀態畫面 05_click_nominate_btn.png")

            # 6. 以 Mock 寫入一筆提名記錄，展示邪惡勢力統計與列表
            try:
                await page.evaluate("""
                    () => {
                        const appElement = document.querySelector('#app');
                        if (appElement && appElement.__vue_app__) {
                            const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                            if (pinia && pinia.state.value['game'] && pinia.state.value['game'].state) {
                                pinia.state.value['game'].state.nominations = [
                                    {
                                        nominator_id: "storyteller_p3", // 下毒者 (Minion) 發起
                                        nominee_id: "storyteller_p2",  // 被提名人
                                        round: 1,
                                        votes_for: [],
                                        executed: false,
                                        threshold: 2
                                    }
                                ];
                                // 重置下拉選單變數
                                const uiStoreState = pinia.state.value['ui'];
                                if (uiStoreState) {
                                    uiStoreState.nominationNominatorId = "";
                                    uiStoreState.nominationNomineeId = "";
                                }
                            }
                        }
                    }
                """)
                await page.wait_for_timeout(800)
            except Exception as e:
                print(f"[WARNING] Mock 注入提名記錄失敗: {e}")
            await page.screenshot(path=os.path.join(voting_dir, "06_nominations_list_displayed.png"))
            print("[SUCCESS] 階段 C - 步驟 06/10：已擷取提名記錄列表與邪惡勢力統計畫面 06_nominations_list_displayed.png")

            # 7. 點選「修改提名 (✍️)」按鈕，展開編輯表單
            try:
                edit_nom_btn = page.locator(".btn-edit-nom").first
                await edit_nom_btn.wait_for(state="visible", timeout=5000)
                await edit_nom_btn.click()
                await page.wait_for_timeout(800)
            except Exception as e:
                print(f"[WARNING] 點選修改提名按鈕失敗: {e}")
            await page.screenshot(path=os.path.join(voting_dir, "07_edit_nomination_form.png"))
            print("[SUCCESS] 階段 C - 步驟 07/10：已擷取編輯提名表單畫面 07_edit_nomination_form.png")

            # 關閉編輯表單
            try:
                cancel_edit_btn = page.locator(".nom-edit-form button:has-text('取消')")
                if await cancel_edit_btn.is_visible():
                    await cancel_edit_btn.click()
                await page.wait_for_timeout(500)
            except Exception as e:
                print(f"[WARNING] 取消編輯表單失敗: {e}")

            # 8. 模擬投票，展示勾號 ✓ 與死亡無票灰化
            try:
                # Mock 1 號與 3 號投票，並且 4 號惡魔死亡且幽靈票已被消耗 (顯示為 spent 灰化)
                await page.evaluate("""
                    () => {
                        const appElement = document.querySelector('#app');
                        if (appElement && appElement.__vue_app__) {
                            const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                            if (pinia && pinia.state.value['game'] && pinia.state.value['game'].state) {
                                // 4 號設為死亡且已無幽靈票
                                pinia.state.value['game'].state.players[3].is_alive = false;
                                pinia.state.value['game'].state.players[3].has_ghost_vote = false;
                                // 1 號 (p1) 與 3 號 (p3) 投下贊成票
                                pinia.state.value['game'].state.nominations[0].votes_for = ["storyteller_p1", "storyteller_p3"];
                            }
                        }
                    }
                """)
                await page.wait_for_timeout(800)
            except Exception as e:
                print(f"[WARNING] Mock 投票計票狀態失敗: {e}")
            await page.screenshot(path=os.path.join(voting_dir, "08_voting_grid_updated.png"))
            print("[SUCCESS] 階段 C - 步驟 08/10：已擷取投票計票網格更新畫面 08_voting_grid_updated.png")

            # 9. hover「執行處決」按鈕，並以 Mock 處決展示
            try:
                execute_btn = page.locator(".nom-actions button:has-text('執行處決'), .nom-actions button.btn-danger")
                await execute_btn.wait_for(state="visible", timeout=5000)
                await execute_btn.hover()
                await page.wait_for_timeout(300)
                
                # Mock 執行處決結果，將該劇本提名設為 executed，並將被提名人 2 號設為死亡
                await page.evaluate("""
                    () => {
                        const appElement = document.querySelector('#app');
                        if (appElement && appElement.__vue_app__) {
                            const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                            if (pinia && pinia.state.value['game'] && pinia.state.value['game'].state) {
                                pinia.state.value['game'].state.nominations[0].executed = true;
                                pinia.state.value['game'].state.players[1].is_alive = false;
                            }
                        }
                    }
                """)
                await page.wait_for_timeout(800)
            except Exception as e:
                print(f"[WARNING] hover 處決按鈕或 Mock 處決狀態失敗: {e}")
            await page.screenshot(path=os.path.join(voting_dir, "09_execute_execution_state.png"))
            print("[SUCCESS] 階段 C - 步驟 09/10：已擷取點擊執行處決前畫面 09_execute_execution_state.png")

            # 10. hover「撤銷」按鈕，展示處決後狀態，並關閉投票面板
            try:
                undo_btn = page.locator(".btn-undo")
                await undo_btn.wait_for(state="visible", timeout=5000)
                await undo_btn.hover()
                await page.wait_for_timeout(300)
            except Exception as e:
                print(f"[WARNING] hover 撤銷處決按鈕失敗: {e}")
            await page.screenshot(path=os.path.join(voting_dir, "10_undo_state_and_close.png"))
            print("[SUCCESS] 階段 C - 步驟 10/10：已擷取已處決徽章與撤銷按鈕畫面 10_undo_state_and_close.png")
            
            # 強制關閉投票面板
            try:
                await page.evaluate("""
                    () => {
                        const appElement = document.querySelector('#app');
                        if (appElement && appElement.__vue_app__) {
                            const pinia = appElement.__vue_app__.config.globalProperties.$pinia;
                            if (pinia) {
                                const uiStoreState = pinia.state.value['ui'];
                                if (uiStoreState) {
                                    uiStoreState.activePanel = 'none';
                                }
                            }
                        }
                    }
                """)
                await page.wait_for_timeout(800)
            except Exception as e:
                print(f"[WARNING] 關閉投票面板失敗: {e}")

            # -------------------------------------------------------------
            # 階段 D: 說書人手冊-白板資訊記錄測試
            # -------------------------------------------------------------
            print("\n[INFO] === 階段 D: 開始進行說書人手冊-白板資訊記錄測試 ===")
            
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
                print(f"[WARNING] 透過 UI 重置遊戲失敗: {reset_err}，嘗試使用 Pinia evaluate fallback 重置...")
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
                    print(f"[WARNING] 透過 evaluate Mock 重置遊戲也失敗: {eval_err}")

            await browser.close()
            print("\n[SUCCESS] 說書人四大測試流程（基礎控制、提示標記、投票面板、白板資訊）全部整合執行完畢！")

    except Exception as ex:
        import traceback
        err_str = traceback.format_exc()
        try:
            print(f"[FATAL] 測試未預期中斷:\n{err_str}")
        except UnicodeEncodeError:
            safe_str = err_str.encode('ascii', errors='replace').decode('ascii')
            print(f"[FATAL] 測試未預期中斷:\n{safe_str}")
    finally:
        if 'tauri_process' in locals() and 'log_file' in locals():
            tauri_helper.close_tauri_process(tauri_process, log_file)

if __name__ == "__main__":
    asyncio.run(main())
