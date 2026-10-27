import { sendNotification } from './platformAdapter';

/**
 * 發送桌面/網頁通知 (立即發送)
 */
export async function sendDesktopNotification(title: string, body: string) {
  try {
    await sendNotification(title, body);
  } catch (err) {
    console.error('發送通知失敗:', err);
  }
}

