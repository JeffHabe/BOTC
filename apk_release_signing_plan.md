# APK 正式發佈與簽名設定計畫

本計畫將引導您生成正式的數位簽名金鑰，並配置 Tauri 專案以產出符合上架標準的 Release APK。

## 用戶審查要求

> [!CAUTION]
> **金鑰安全警告：**
> 即將生成的 `.jks` 金鑰檔案與密碼是您應用程式的「身分證」。**請務必妥善備份且不要上傳到任何公開平台（如 GitHub）**。一旦丟失金鑰，您將無法更新已上架的 App。

## 擬議步驟

### 第一階段：生成正式簽名金鑰 (Keystore)
我將提供指令，由您在終端執行生成一個專屬的金鑰檔案。
```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

### 第二階段：配置 Gradle 簽名屬性
1. 我們將在 `src-tauri/gen/android` 目錄下建立或修改 `local.properties`。
2. 設定以下環境變數（或寫入檔案）：
   - `TAURI_ANDROID_KEYSTORE_PATH`: 指向您的 `.jks` 檔案路徑。
   - `TAURI_ANDROID_KEYSTORE_PASSWORD`: 您的金鑰密碼。
   - `TAURI_ANDROID_KEY_ALIAS`: 您的金鑰別名（Alias）。
   - `TAURI_ANDROID_KEY_PASSWORD`: 您的金鑰密碼。

### 第三階段：執行正式 Release 編譯
執行受保護的 Release 打包指令：
```bash
npx tauri android build
```
這將產出經過優化、混淆且由正式金鑰簽名的 APK 或 AAB（Android App Bundle）。

## 預期產出
- **正式版 APK**: `src-tauri/gen/android/app/build/outputs/apk/release/app-release.apk`
- **上架專用 AAB**: `src-tauri/gen/android/app/build/outputs/bundle/release/app-release.aab`

---
## 開放性問題
1. 您是否已經準備好一組想要使用的**金鑰密碼**（需包含字母與數字，且需自行記住）？
2. 您是否需要我直接在代碼層協助配置 Gradle 簽名邏輯？
