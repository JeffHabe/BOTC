# 🎲 血染鐘樓 (BOTC) 預設劇本與角色庫維護手冊

本手冊說明系統中預設劇本（`default_scripts.json`）與預設角色大全（`all_character_sort.json`）的運作架構，以及日後如何輕鬆一鍵更新。

---

## 一、目前系統狀態

- **最新預設角色庫**：已整合 `botc-characters-1792915125811.json`（共 405 位角色），同步至 `src-tauri/data/all_character_sort.json` 與 `public/data/default_characters.json`。
- **最新預設劇本庫**：已整合 `botc-scripts-2026-10-24.json`（共 69 套官方與社群精選劇本），同步至 `public/data/default_scripts.json`。
- **架構保護**：預設劇本以非同步靜態資源存放於 `public/data/`，避免 40MB 的圖片 Base64 膨脹前端主打包 Bundle，維持秒開體驗。

---

## 二、日後更新預設劇本與角色的方法

### 方式 1：全自動指令一鍵更新（最推薦）

當您在遊戲中編輯或新增了劇本/角色，並點選「匯出劇本」或「匯出角色」產生了新的備份檔（例如 `botc-scripts-2026-xx-xx.json` 或 `botc-characters-xxxxxxxx.json`）後：

1. **直接將導出的 JSON 檔案丟入專案根目錄**（即與 `package.json` 同層級）。
2. 在終端執行以下指令：
   ```bash
   npm run update:presets
   ```
3. 腳本會**自動比對檔名時間戳與修改時間**，精準挑選最新版本，完成資料校驗並更新至系統內建位置！

> **指定自訂路徑更新**：
> ```bash
> node scripts/update-presets.cjs --scripts ./my-scripts.json --characters ./my-characters.json
> ```

---

### 方式 2：使用者介面（UI）一鍵重載

在遊戲前端介面中，說書人隨時可手動還原至系統最新預設：

1. 點擊右上角「**齒輪設定**」面板。
2. 滑動至「**資料管理**」區塊：
   - 點擊「**還原預設劇本**」：將系統內建的最新 69 套劇本重載並合併至當前清單。
   - 點擊「**重置預設角色**」：將全角色大全還原為系統最新官方設定。

---

## 三、自動化驗收與迴歸測試

每當更新預設劇本或角色庫時，可透過以下測試指令驗證檔案健康度：

```bash
# 執行專屬預設規格測試
node tests/presets.test.js

# 執行全套回歸測試
npm test
```
- 驗證角色資料結構（包含 `_meta`、角色數量 >= 200）。
- 驗證劇本資料結構（包含 `scripts` 陣列、劇本數量 >= 50、各劇本必備屬性）。
