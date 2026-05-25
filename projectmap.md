# BOTC 專案架構與地圖指南 (projectmap.md)

本文件用以記錄《血染鐘樓魔典》專案的整體架構、各子模組功能、目錄檔案結構，以及開發與打包的指令對照。

---

## 1. 專案架構概覽 (Architecture)

本專案採用 **Monorepo (單一倉庫) & Rust Workspace** 架構開發，主要由以下三大模組組成：

```
                    ┌─────────────────────────┐
                    │      Vue 3 前端專案     │
                    │        (在 src/)        │
                    └───────────┬─────────────┘
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
   ┌───────────────────────┐         ┌───────────────────────┐
   │ Tauri 桌面/手機 App   │         │ 瀏覽器網頁版 (Web)    │
   │  (在 src-tauri/ 殼)   │         │ (直接部署 dist/)       │
   └───────────┬───────────┘         └───────────┬───────────┘
               │                                 │
               │        WebSocket (WS)           │
               └────────────────┬────────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  Rust Axum 獨立伺服器   │◄───┐
                    │       (在 server/)      │    │ 共享 Struct
                    └─────────────────────────┘    │ 遊戲資料協定
                                 ▲                 │ (在 shared/)
                                 └─────────────────┘
```

* **Vue 3 前端 (`src/`)**：採用 Vue 3 + TypeScript + Vite 開發。透過響應式介面設計，此前端能同時在電腦 App、手機 App 或是網頁瀏覽器上完美渲染。
* **Tauri 殼 (`src-tauri/`)**：負責將 Vue 前端打包成跨平台的桌面應用程式 (Windows/macOS/Linux) 以及行動端 App (Android/iOS)。
* **獨立遊戲伺服器 (`server/`)**：使用 Rust 語言及 Axum 框架開發的獨立 Web 伺服器，負責管理所有在線玩家的房間、廣播即時狀態與提供 WebRTC (LiveKit) 音視訊 Token。
* **共享協定庫 (`shared/`)**：Rust 子模組，定義了前後端通訊協議與遊戲核心狀態 Struct。由於 `server` 與 `src-tauri` 均使用 Rust，兩者能 100% 共享此庫的資料結構，免除重複定義的繁瑣。

---

## 2. 目錄結構與重要檔案導航

```text
BOTC/ (專案根目錄)
├── Cargo.toml                # Rust Workspace 根設定檔 (管理 src-tauri, server, shared)
├── package.json              # 前端與 Tauri 腳本配置檔
├── vite.config.ts            # Vite 前端編譯設定
├── index.html                # 前端網頁入口點
├── hook.md                   # 專案自動化鉤子 (Build/Git Hooks) 說明文件
├── projectmap.md             # [本檔案] 專案地圖與架構指南
│
├── src/                      # 【Vue 3 前端原始碼】
│   ├── main.ts               # 前端進入點
│   ├── App.vue               # 前端根元件
│   ├── style.css             # 全域 Vanilla CSS 樣式表
│   ├── types.ts              # 前端 TypeScript 類型定義
│   ├── assets/               # 靜態資源 (圖片、角色圖標等)
│   ├── components/           # 可複用 UI 元件 (如 ScriptEditorPanel.vue)
│   ├── views/                # 主要遊戲頁面 (Lobby, PlayRoom 等)
│   ├── services/             # API 與 WebSocket 連線服務
│   └── store/                # Pinia 狀態管理
│
├── src-tauri/                # 【Tauri 跨平台 App 殼 (Rust)】
│   ├── tauri.conf.json       # Tauri 打包與功能配置檔
│   ├── Cargo.toml            # Tauri Rust 依賴 (引入本地的 shared 庫)
│   └── src/                  # Tauri 本地 Rust 代碼
│
├── server/                   # 【Rust Axum 獨立伺服器】
│   ├── Cargo.toml            # 伺服器依賴 (引入 Axum, Tokio 與 shared 庫)
│   └── src/
│       └── main.rs           # 伺服器主入口 (監聽 3030 端口，包含 WebSocket 廣播處理)
│
├── shared/                   # 【共享 Rust 核心庫】
│   ├── Cargo.toml            # 共享庫依賴
│   └── src/
│       ├── lib.rs            # 庫模組導出
│       └── protocol.rs       # 定義多端共享的玩家資料、遊戲階段與 WS 訊息通訊格式
│
└── 根目錄輔助腳本/
    ├── bump-version.js       # 自動遞增版本號腳本 (Patch 自動加 1)
    ├── post-build.js         # 打包 Android 完成後，自動尋找、命名並複製 APK 的歸檔腳本
    ├── sort_by_team.py       # Python 輔助工具：按陣營分類角色
    └── sort_chinese_roles.py # Python 輔助工具：將中文角色按首字母排序
```

---

## 3. 開發與構建指令對照表

在專案根目錄下，您可以使用以下指令來啟動或編譯各個模組：

### 3.1 本地開發指令
| 執行指令 | 說明 |
| :--- | :--- |
| `npm run dev` | 僅啟動 Vue 前端開發伺服器 (預設監聽 `http://localhost:5173`) |
| `npm run tauri dev` | 啟動 Tauri 電腦桌面端 App 偵錯模式 (會自動呼叫前端 dev) |
| `cargo run -p server` | 啟動 Rust 獨立遊戲後端伺服器 (監聽 `http://127.0.0.1:3030`) |

### 3.2 打包與編譯指令
| 執行指令 | 說明 |
| :--- | :--- |
| `npm run build` | 僅編譯前端 Vue 程式碼，產出靜態網頁檔案於 `dist/` 目錄 |
| `npm run tauri build` | 打包電腦桌面端正式發佈版 App (Windows 會產出 `.msi` 與 `.exe`) |
| `npm run build:android:debug`| 自動遞增版本、編譯 Android Debug 版 App，並歸檔 APK 至根目錄 `debug/` |
| `npm run build:android:release`| 自動遞增版本、編譯 Android Release 正式版 App，並歸檔 APK 至根目錄 `releases/` |
| `cargo build` | 編譯整個 Rust Workspace (包含 tauri, server 與 shared) |
