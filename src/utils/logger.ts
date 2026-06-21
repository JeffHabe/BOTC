import { invoke } from '@tauri-apps/api/core';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 判斷是否為 Vite 開發環境
const isDev = import.meta.env.DEV;
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

class Logger {
  private log(level: LogLevel, message: string, ...optionalParams: any[]) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // 1. 本地 console 印出
    if (level === 'error') {
      console.error(formattedMessage, ...optionalParams);
    } else if (level === 'warn') {
      console.warn(formattedMessage, ...optionalParams);
    } else if (isDev) {
      if (level === 'debug') {
        console.debug(formattedMessage, ...optionalParams);
      } else {
        console.log(formattedMessage, ...optionalParams);
      }
    }

    // 2. 實體日誌檔案寫入 (跨平台 Tauri 支援，含 Android)
    if (isTauri) {
      let paramStr = '';
      if (optionalParams.length > 0) {
        try {
          paramStr = ' ' + optionalParams.map(p => {
            if (p instanceof Error) {
              return p.stack || p.message;
            }
            return typeof p === 'object' ? JSON.stringify(p) : String(p);
          }).join(' ');
        } catch (e) {
          paramStr = ' [無法序列化的選用參數]';
        }
      }

      invoke('write_log_file', { level, message: message + paramStr }).catch(err => {
        console.error('寫入實體日誌檔案失敗:', err);
      });
    }
  }

  debug(message: string, ...optionalParams: any[]) {
    this.log('debug', message, ...optionalParams);
  }

  info(message: string, ...optionalParams: any[]) {
    this.log('info', message, ...optionalParams);
  }

  warn(message: string, ...optionalParams: any[]) {
    this.log('warn', message, ...optionalParams);
  }

  error(message: string, ...optionalParams: any[]) {
    this.log('error', message, ...optionalParams);
  }
}

export const logger = new Logger();
