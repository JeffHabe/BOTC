# BOTC 專案自動化鉤子與腳本說明文件 (hook.md)

本文件詳細說明了專案中現有的自動化腳本（Build Hooks）運作機制，以及如何將它們與 Git Hooks 結合，以提升開發效率並防止錯誤。

---

## 1. 編譯生命週期鉤子 (Build Hooks)

專案在 `package.json` 中配置了多個編譯與打包的自動化腳本，主要負責**自動遞增版本號**與**自動歸檔編譯產物 (APK)**。

### 1.1 版本號自動遞增器 (`bump-version.js`)
* **執行時機**：在打包 Android App 的 Debug 或 Release 版本之前自動執行。
* **腳本位置**：`./bump-version.js`
* **運作機制**：
  1. 讀取專案根目錄的 `package.json` 中的 `version` 欄位。
  2. 將 Patch 版本號自動遞增 1（例如：`0.1.154` -> `0.1.155`）。
  3. 將更新後的新版本號，同步寫入回 `package.json` 以及 `src-tauri/tauri.conf.json` 中的 `version` 欄位。
* **單獨手動執行**：
  ```bash
  node bump-version.js
  ```

### 1.2 編譯產物歸檔器 (`post-build.js`)
* **執行時機**：在 Tauri 完成 Android 編譯（`tauri android build`）後執行。
* **腳本位置**：`./post-build.js`
* **參數說明**：
  * `debug`：搜尋並歸檔偵錯版 APK，將其複製到根目錄的 `debug/` 目錄中。
  * `release`：搜尋並歸檔正式版 APK，將其複製到根目錄的 `releases/` 目錄中.
* **運作機制**：
  1. 讀取當前最新的版本號。
  2. 遞迴搜尋 `src-tauri/gen/android/app/build/outputs/apk/` 目錄，自動找出最新生成的 APK 檔案。
  3. 優先選擇適配當前主流手機架構（`aarch64` / `arm64`）的 APK，若無則選擇 `universal` 版本。
  4. 將該 APK 檔案重新命名為 `BOTC_v{version}{_debug}.apk`，並複製到根目錄的 `releases/` 或 `debug/` 資料夾下，省去手動到 Gradle 深層目錄翻找檔案的步驟。

---

## 2. 與 Git Hooks 結合指南

您可以將上述腳本或程式碼檢查工具與 Git 鉤子結合。Git 鉤子位於專案的 `.git/hooks/` 目錄下（注意：此目錄預設不進入 Git 追蹤，需本地配置）。

### 2.1 提交前檢查預防錯誤 (`pre-commit`)
建議在每次 `git commit` 前，自動執行前端類型檢查，確保有語法錯誤的程式碼不會被提交到倉庫中。

**配置步驟**：
1. 在 `.git/hooks/` 目錄下建立一個名為 `pre-commit` 的無副檔名檔案。
2. 寫入以下內容（適用於 Windows Git Bash 或 Linux/macOS）：
   ```bash
   #!/bin/sh
   echo "🔍 正在執行 pre-commit 檢查：語法與類型檢查..."
   
   # 執行 Vue 類型檢查
   npm run build
   
   if [ $? -ne 0 ]; then
       echo "❌ 檢查失敗！請先修復程式碼中的 TypeScript 語法錯誤再提交。"
       exit 1
   fi
   
   echo "✅ 檢查通過，允許提交！"
   exit 0
   ```
3. 在終端機執行 `chmod +x .git/hooks/pre-commit` 賦予執行權限。

### 2.2 提交後自動遞增版本號 (`post-commit` - 選配)
如果您希望每一次的 Git 提交都自動視為一次小版本號更新（適合快速迭代測試），您可以使用提交後鉤子。

**配置步驟**：
1. 在 `.git/hooks/` 目錄下建立一個名為 `post-commit` 的檔案。
2. 寫入以下內容：
   ```bash
   #!/bin/sh
   # 避免遞迴調用
   if [ "$GIT_BYPASS_HOOK" = "1" ]; then
       exit 0
   fi

   echo "🚀 檢測到提交，自動遞增版本號..."
   export GIT_BYPASS_HOOK=1
   
   # 執行版本號遞增
   node bump-version.js
   
   # 自動將變更的設定檔加回並修訂 commit
   git add package.json src-tauri/tauri.conf.json
   git commit --amend --no-verify -C HEAD
   ```
3. 賦予執行權限：`chmod +x .git/hooks/post-commit`。

---

## 3. Windows 環境下的操作指引

在 Windows 系統中配置 Git Hooks 時，請遵循以下步驟以避免常見的系統相容性問題：

### 3.1 建立無副檔名檔案
Windows 檔案總管預設不允許直接建立無副檔名的檔案。您可以使用以下任一方式建立：
* **使用 VS Code**：在 VS Code 的檔案總管中，展開 `.git` -> `hooks` 目錄，按右鍵選擇「新增檔案」，直接輸入 `pre-commit` 或 `post-commit`（請確保沒有任何副檔名，如 `.txt`）。
* **使用 PowerShell 建立**（在專案根目錄執行）：
  ```powershell
  # 建立 pre-commit
  New-Item -Path ".git/hooks/pre-commit" -ItemType File
  # 建立 post-commit
  New-Item -Path ".git/hooks/post-commit" -ItemType File
  ```

### 3.2 關於執行權限 (`chmod`)
* Windows 的 NTFS 檔案系統不支援 Linux 的檔案執行權限屬性 (`chmod`)。
* 因此，在 Windows 上，您**完全不需要**執行 `chmod +x .git/hooks/pre-commit`。Git 在執行 commit 時，會自動識別並直接執行這些無副檔名的腳本。

### 3.3 執行環境與 Shell 相容性
* 雖然這些鉤子腳本開頭宣告了 `#!/bin/sh`，但在 Windows 下執行 `git commit` 時，Git 會自動調用其內部自帶的 `sh.exe`（位於 Git 安裝目錄的 `bin/` 底下）來編譯並執行該 Shell 腳本。
* 因此，無論您是在 PowerShell、CMD 還是 Git Bash 中執行 `git` 指令，這些 Hooks 都會正常被執行。

### 3.4 ❗ 關鍵：換行符格式必須為 LF (Unix)
* Windows 系統預設會將新建立的文字檔案存為 `CRLF` (`\r\n`) 格式。
* 如果 Git Hook 檔案（如 `pre-commit`）使用了 `CRLF`，Git 執行時會將開頭解析為 `#!/bin/sh\r`。因為系統找不到 `/bin/sh\r` 這個執行檔，便會噴出以下錯誤：
  `error: cannot spawn .git/hooks/pre-commit: No such file or directory`
* **解決辦法**：請務必在您的編輯器（如 VS Code）中，將 `pre-commit` 與 `post-commit` 檔案的換行符格式**從 `CRLF` 切換為 `LF`**。

