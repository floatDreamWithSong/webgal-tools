import fs from 'fs';
import path from 'path';
import { workDir } from './config.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerConfig {
  level: LogLevel;
  enableTimestamp: boolean;
  prefix?: string;
  enableFileLogging?: boolean;
  logDir?: string;
  retentionDays?: number;
}


export class Logger {
  private config: LoggerConfig;
  private logFilePath: string | null = null;
  private currentDate: string = '';

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level ?? LogLevel.INFO,
      enableTimestamp: config.enableTimestamp ?? true,
      prefix: config.prefix,
      enableFileLogging: config.enableFileLogging ?? false,
      logDir: config.logDir ?? path.join(workDir,'./.logs'),
      retentionDays: config.retentionDays ?? 7,
    };

    if (this.config.enableFileLogging) {
      this.setupFileLogging();
    }
  }

  private setupFileLogging(): void {
    // 确保日志目录存在
    if (!fs.existsSync(this.config.logDir!)) {
      fs.mkdirSync(this.config.logDir!, { recursive: true });
    }

    // 设置当前日志文件
    this.updateLogFile();
    
    // 清理旧日志文件
    this.cleanupOldLogs();
  }

  private updateLogFile(): void {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 格式
    
    // 如果日期变了，更新日志文件路径
    if (today !== this.currentDate) {
      this.currentDate = today;
      this.logFilePath = path.join(this.config.logDir!, `${today}.log`);
    }
  }

  private cleanupOldLogs(): void {
    try {
      const files = fs.readdirSync(this.config.logDir!);
      const now = new Date();
      
      files.forEach(file => {
        // 只处理 .log 文件
        if (!file.endsWith('.log')) return;
        
        // 从文件名获取日期 (YYYY-MM-DD.log)
        const dateStr = file.replace('.log', '');
        const fileDate = new Date(dateStr);
        
        // 计算文件日期与当前日期的天数差
        const diffTime = now.getTime() - fileDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // 如果文件超过保留天数，删除它
        if (diffDays > this.config.retentionDays!) {
          const filePath = path.join(this.config.logDir!, file);
          fs.unlinkSync(filePath);
          this.info(`已删除旧日志文件: ${filePath}`);
        }
      });
    } catch (error) {
      this.error('清理旧日志文件时出错:', error);
    }
  }

  private formatMessage(level: string, message: string): string {
    const parts: string[] = [];

    if (this.config.enableTimestamp) {
      const timestamp = new Date().toISOString();
      parts.push(`[${timestamp}]`);
    }

    parts.push(`[${level}]`);

    if (this.config.prefix) {
      parts.push(`[${this.config.prefix}]`);
    }

    parts.push(message);

    return parts.join(' ');
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private writeToFile(message: string): void {
    if (!this.config.enableFileLogging || !this.logFilePath) return;
    
    // 检查日期是否变化，如果变化则更新日志文件
    this.updateLogFile();
    
    try {
      // 追加写入日志文件
      fs.appendFileSync(this.logFilePath, message + '\n');
    } catch (error) {
      this.error('写入日志文件失败:', error);
    }
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) return;
    
    let label = 'INFO';
    switch (level) {
      case LogLevel.DEBUG:
        label = 'DEBUG';
        break;
      case LogLevel.INFO:
        label = 'INFO';
        break;
      case LogLevel.WARN:
        label = 'WARN';
        break;
      case LogLevel.ERROR:
        label = 'ERROR';
        break;
      default:
        label = 'INFO';
        break;
    }
    
    const formatted = this.formatMessage(label, message);
    console.error(formatted, ...args);
    this.writeToFile(formatted + (args.length > 0 ? ' ' + args.join(' ') : ''));
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  setPrefix(prefix: string): void {
    this.config.prefix = prefix;
  }

  enableFileLogging(enable: boolean, logDir?: string): void {
    this.config.enableFileLogging = enable;
    if (logDir) {
      this.config.logDir = logDir;
    }
    
    if (enable) {
      this.setupFileLogging();
    }
  }
}

// 默认导出一个全局日志实例
export const logger = new Logger({
  level: LogLevel.DEBUG,
  enableFileLogging: true
});

// 便捷函数
export const createLogger = (config?: Partial<LoggerConfig>) => new Logger(config);
