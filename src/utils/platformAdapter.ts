/**
 * 平台轉接層 (Platform Adapter)
 * 目的：
 *   - 自動偵測目前運行環境 (Tauri 單機版 vs 網頁 Web 版)
 *   - 在 Tauri 模式下調用桌面/Android 原生外掛，確保單機版 100% 不受影響
 *   - 在 Web 模式下自動切換為瀏覽器原生 API (localStorage, Blob 下載, <input type="file"> 等)
 */

export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    '__TAURI_INTERNALS__' in window ||
    '__TAURI__' in window ||
    (window as any).__TAURI_IPC__ !== undefined
  );
};

// ─── 檔案與對話框適配 ───────────────────────────────────────────

/**
 * 儲存/匯出檔案
 * 在 Tauri 中調用原生儲存對話框；在瀏覽器中自動轉為下載 Blob 檔案
 */
export async function exportFile(
  defaultFilename: string,
  content: string,
  filters: { name: string; extensions: string[] }[] = [{ name: 'JSON', extensions: ['json'] }]
): Promise<boolean> {
  if (isTauri()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const filePath = await save({
        filters,
        defaultPath: defaultFilename
      });
      if (filePath) {
        await writeTextFile(filePath, content);
        return true;
      }
      return false; // 使用者主動取消
    } catch (e) {
      console.warn('[Adapter] Tauri saveDialog 失敗，回退至瀏覽器下載:', e);
    }
  }

  // Web 回退方案：建立 Blob 並觸發瀏覽器下載
  try {
    if (typeof document === 'undefined') return false;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('[Adapter] Web 下載失敗:', err);
    return false;
  }
}

/**
 * 開啟/匯入檔案
 * 在 Tauri 中調用原生開啟對話框；在瀏覽器中動態彈出 <input type="file"> 讀取
 */
export async function importFile(
  acceptExtensions: string[] = ['.json']
): Promise<{ name: string; content: string } | null> {
  if (isTauri()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const extList = acceptExtensions.map(e => e.replace(/^\./, ''));
      const selected = await open({
        filters: [{ name: 'Supported Files', extensions: extList }],
        multiple: false
      });
      if (selected && typeof selected === 'string') {
        const content = await readTextFile(selected);
        const name = selected.split(/[/\\]/).pop() || selected;
        return { name, content };
      }
      return null;
    } catch (e) {
      console.warn('[Adapter] Tauri openDialog 失敗，回退至瀏覽器選擇:', e);
    }
  }

  // Web 回退方案：建立 <input type="file">
  if (typeof document === 'undefined') return null;
  return new Promise<{ name: string; content: string } | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptExtensions.join(',');
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        resolve({ name: file.name, content });
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

// ─── 應用程式持久化儲存 (AppData) 適配 ──────────────────────────────

const STORAGE_PREFIX = 'botc:appdata:';

export async function readAppData(filename: string): Promise<string> {
  if (isTauri()) {
    try {
      const { readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      return await readTextFile(filename, { baseDir: BaseDirectory.AppData });
    } catch (e) {
      // 若檔案在 Tauri 中讀取失敗，拋出以便外層處理
      throw e;
    }
  }

  if (typeof localStorage !== 'undefined') {
    const data = localStorage.getItem(STORAGE_PREFIX + filename);
    if (data !== null) return data;
  }
  throw new Error(`[Adapter] Web Storage 找不到檔案: ${filename}`);
}

export async function writeAppData(filename: string, content: string): Promise<void> {
  if (isTauri()) {
    try {
      const { writeTextFile, BaseDirectory, mkdir } = await import('@tauri-apps/plugin-fs');
      await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true }).catch(() => {});
      await writeTextFile(filename, content, { baseDir: BaseDirectory.AppData });
      return;
    } catch (e) {
      console.warn('[Adapter] Tauri 寫入 AppData 失敗，同步寫入 localStorage 回退:', e);
    }
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_PREFIX + filename, content);
  }
}

export async function existsAppData(filename: string): Promise<boolean> {
  if (isTauri()) {
    try {
      const { exists, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      return await exists(filename, { baseDir: BaseDirectory.AppData });
    } catch (_) {
      return false;
    }
  }

  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(STORAGE_PREFIX + filename) !== null;
  }
  return false;
}

// ─── 系統通知適配 ────────────────────────────────────────────────

export async function sendNotification(title: string, body: string): Promise<void> {
  if (isTauri()) {
    try {
      const { isPermissionGranted, requestPermission, sendNotification: tauriSend } =
        await import('@tauri-apps/plugin-notification');
      let permission = await isPermissionGranted();
      if (!permission) {
        const res = await requestPermission();
        permission = res === 'granted';
      }
      if (permission) {
        tauriSend({ title, body });
        return;
      }
    } catch (e) {
      console.warn('[Adapter] Tauri 通知發送失敗:', e);
    }
  }

  // Web 回退方案：調用瀏覽器 Notification API
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        new Notification(title, { body });
      }
    }
  }
}

// ─── 說書人獨立 Session 與本地狀態記憶 ─────────────────────────────

const SESSION_ID_KEY = 'botc:session_id';
const SAVED_GAME_STATE_KEY = 'botc:saved_game_state';

/**
 * 取得當前瀏覽器/裝置專屬的說書人 Session ID
 * 若首次進入則自動產生並持久化至 localStorage，確保每位說書人擁有獨立魔典空間
 */
export function getSessionId(): string {
  if (typeof localStorage !== 'undefined') {
    const existing = localStorage.getItem(SESSION_ID_KEY);
    if (existing && existing.trim()) {
      return existing;
    }
    const newId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `st-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_ID_KEY, newId);
    return newId;
  }
  return 'default';
}

// ─── 安全 IPC 指令調用適配 ────────────────────────────────────────

export async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(cmd, args);
    } catch (e) {
      console.error(`[Adapter] Tauri 指令 [${cmd}] 呼叫失敗:`, e);
      throw e;
    }
  }

  const sessionId = getSessionId();

  // Web 模式下同步將說書人的存檔寫入瀏覽器 localStorage，防止容器重啟遺失進度
  if (cmd === 'save_game_state' && args?.state && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SAVED_GAME_STATE_KEY, JSON.stringify(args.state));
    } catch (_) {}
  }

  // Web 模式下載入存檔時，若本地已有該說書人上次的對局紀錄，優先同步回伺服器 Session 並還原
  let effectiveCmd = cmd;
  let effectiveArgs = args || {};
  let localSavedState: any = null;
  if (cmd === 'load_game_state' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(SAVED_GAME_STATE_KEY);
      if (raw) {
        localSavedState = JSON.parse(raw);
        if (localSavedState && Array.isArray(localSavedState.players)) {
          effectiveCmd = 'save_game_state';
          effectiveArgs = { state: localSavedState };
        }
      }
    } catch (_) {}
  }

  // Web 模式：透過 HTTP API 發送至 Rust 伺服器 (附帶專屬 session_id)
  if (typeof fetch !== 'undefined') {
    try {
      const baseUrl = typeof window !== 'undefined' && window.location?.origin ? '' : 'http://127.0.0.1:3030';
      const res = await fetch(`${baseUrl}/api/game/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId,
        },
        body: JSON.stringify({
          cmd: effectiveCmd,
          args: effectiveArgs,
          session_id: sessionId,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as T;
        // 若回傳為有效 GameState，同步更新本地快取以便下次開啟即時恢復
        if (
          data &&
          typeof data === 'object' &&
          Array.isArray((data as any).players) &&
          typeof localStorage !== 'undefined' &&
          cmd !== 'load_game_state'
        ) {
          try {
            localStorage.setItem(SAVED_GAME_STATE_KEY, JSON.stringify(data));
          } catch (_) {}
        }
        return data;
      }
      const errData = await res.json().catch(() => ({}));
      console.warn(`[Adapter] Web API [${cmd}] 伺服器回應錯誤:`, errData);
      return localSavedState as T | null;
    } catch (err: any) {
      // 伺服器離線時安全靜默防護，若有本地存檔則回退返回本地存檔
      if (typeof window !== 'undefined') {
        console.warn(`[Adapter] Web API [${cmd}] 連線失敗 (伺服器可能離線):`, err?.message || err);
      }
      return localSavedState as T | null;
    }
  }

  return localSavedState as T | null;
}
