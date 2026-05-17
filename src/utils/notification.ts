/**
 * 發送桌面通知 (立即發送)
 */
export async function sendDesktopNotification(title: string, body: string) {
  try {
    // 動態載入 Tauri 通知插件，避免在 Webview 剛啟動 (URL 還在 about:blank) 時載入模組觸發權限安全錯誤
    const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');

    let permission = await isPermissionGranted();
    if (!permission) {
      const permissionResponse = await requestPermission();
      permission = permissionResponse === 'granted';
    }

    if (permission) {
      sendNotification({ title, body });
    }
  } catch (err) {
    console.error('發送桌面通知失敗:', err);
  }
}
