type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 判斷是否為 Vite 開發環境
const isDev = import.meta.env.DEV;

class Logger {
  private log(level: LogLevel, message: string, ...optionalParams: any[]) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

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
