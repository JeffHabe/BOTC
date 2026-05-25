# BOTC 專案錯誤處理與日誌追蹤規範 (logger.md)

本文件用以記錄專案中前端（Vue 3）、後端（Rust Axum 獨立伺服器）以及 Tauri App 殼的錯誤處理原則、日誌追蹤方法與最佳實踐。

---

## 1. Rust 獨立伺服器 (Server) 日誌追蹤

伺服器端統一使用 **`tracing`** 生態系來記錄非同步系統中的日誌。

### 1.1 初始化與環境變數控制
在 `server/src/main.rs` 中，我們初始化了 `tracing-subscriber`。
日誌級別由環境變數 `RUST_LOG` 來調控。預設如果沒有提供環境變數，日誌級別將為 `info`：

```bash
# 預設啟動 (輸出 INFO, WARN, ERROR)
cargo run -p server

# 調校為 DEBUG 等級啟動 (輸出所有詳細除錯日誌)
RUST_LOG=debug cargo run -p server
```

### 1.2 日誌等級使用規範
請從 `tracing` 庫引入對應的巨集，不要直接使用 `println!`：
```rust
use tracing::{info, warn, error, debug};
```

各等級的使用原則如下：
* **`error!`**：系統發生致命錯誤、無法恢復的異常，或嚴重的業務失敗。
  * *範例*：TCP 監聽器綁定失敗、資料庫連線中斷。
* **`warn!`**：系統遇到可容忍的異常、非預期的客戶端行為。
  * *範例*：客戶端傳送無法解析的 JSON 協定。
* **`info!`**：關鍵生命週期事件、顯著的狀態轉換。
  * *範例*：伺服器成功啟動、新玩家連線建立、房間被銷毀。
* **`debug!`**：用於開發偵錯的詳細數據流與事件。
  * *範例*：收到客戶端的心跳包、特定的 WebSocket 訊息包內容。

---

## 2. Vue 前端日誌追蹤

前端統一使用封裝好的 [logger.ts](file:///d:/BOTC/src/utils/logger.ts) 工具。

### 2.1 引入與基本使用
在前端 Vue 組件、TypeScript 服務或 Pinia Store 中：
```typescript
import { logger } from '@/utils/logger';

// 記錄普通資訊
logger.info("遊戲大廳初始化");

// 記錄錯誤與詳細物件
logger.error("WebSocket 連線異常", errorEvent);
```

### 2.2 開發與生產環境過濾
日誌工具會自動偵測 Vite 的 `import.meta.env.DEV` 變數：
* **在開發環境 (DEV)**：所有等級（`debug`、`info`、`warn`、`error`）皆會印出到瀏覽器的主控台，方便調試。
* **在生產環境 (PROD)**：僅有 `warn` 和 `error` 會被印出。`debug` 和 `info` 會被自動過濾，以維護效能與隱私。

### 2.3 全域錯誤捕捉 (Global Error Handling)
若要補齊 Vue 的全域錯誤追蹤，可在 `src/main.ts` 中配置全域 handler，將異常透過 `logger.error` 集中記錄：

```typescript
import { createApp } from 'vue';
import App from './App.vue';
import { logger } from './utils/logger';

const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
  logger.error(`Vue 全域異常捕捉: ${err}`, { instance, info });
};

app.mount('#app');
```

---

## 3. Tauri App 殼 (Rust) 日誌追蹤

本地 App 端統一引進了官方的 **`tauri-plugin-log`** 插件與 `log` 門面 API。

### 3.1 初始化設定
在 `src-tauri/src/lib.rs` 中，我們在 tauri builder 註冊了日誌插件：
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::new().build())
```

### 3.2 本地日誌儲存與特點
* **日誌歸檔**：`tauri-plugin-log` 會自動將 Rust 端的 `log::info!`、`log::error!` 等日誌，寫入到使用者作業系統當前的本地 AppData 目錄中：
  * **Windows**: `C:\Users\<Username>\AppData\Local\com.botc.grimoire\logs\tauri.log`
* **前後端日誌合一**：此插件會**自動攔截**前端 Vue (Webview) 中調用的 `console.log` / `console.error`（這也包含了我們的 `logger.ts` 的控制台輸出），並將它們與 Rust 端的日誌合併歸檔在同一個本地 `tauri.log` 中。這能為發布後的線上 Bug 排查提供極大的幫助。

### 3.3 Rust Command 中的錯誤追蹤實踐
在 `commands.rs` 中，請導入 `log` 的巨集並在關鍵功能上追蹤：
```rust
use log::{info, warn, error, debug};
```
* **檔案與持久化操作**：所有涉及到系統 IO（如 `save_game_state`, `load_game_state`）的操作，必須在失敗時使用 `error!` 記錄系統層面崩潰的原因，並在成功時以 `info!` 記錄完成狀態。
* **背景異步任務**：像 `start_background_timer` 這種在獨立執行緒運行的任務，必須在關鍵的「開始計時」與「觸發通知」時使用 `info!` 記錄，避免任務在背景安靜崩潰。
