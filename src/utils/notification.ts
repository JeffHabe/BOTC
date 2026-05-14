import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

/**
 * 發送桌面通知 (立即發送)
 */
export async function sendDesktopNotification(title: string, body: string) {
  try {
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
