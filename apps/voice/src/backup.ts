import fs from 'fs';
import path from 'path';
import { logger } from '@webgal-tools/logger';

export class BackupManager {
  private backupDir: string;

  constructor(workDir: string) {
    this.backupDir = path.join(workDir, '.voice-backups');
    this.ensureBackupDir();
  }

  /**
   * 确保备份目录存在
   */
  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info(`✅ 创建备份目录: ${this.backupDir}`);
    }
  }

  /**
   * 创建文件备份
   * @param filePath 要备份的文件路径
   * @returns 备份文件路径
   */
  createBackup(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      throw new Error(`要备份的文件不存在: ${filePath}`);
    }

    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${fileName}.backup.${timestamp}`;
    const backupPath = path.join(this.backupDir, backupFileName);

    try {
      fs.copyFileSync(filePath, backupPath);
      logger.info(`📁 创建备份文件: ${backupFileName}`);
      return backupPath;
    } catch (error) {
      throw new Error(`创建备份失败: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * 清理旧的备份文件（保留最近的N个）
   * @param fileName 原始文件名
   * @param keepCount 保留的备份数量，默认10个
   */
  cleanOldBackups(fileName: string, keepCount: number = 10): void {
    try {
      const backupFiles = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith(`${fileName}.backup.`))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          stat: fs.statSync(path.join(this.backupDir, file))
        }))
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime()); // 按修改时间降序排列

      if (backupFiles.length > keepCount) {
        const filesToDelete = backupFiles.slice(keepCount);
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          logger.info(`🗑️ 清理旧备份: ${file.name}`);
        }
      }
    } catch (error) {
      logger.error('清理备份文件时出错:', error);
    }
  }

  /**
   * 获取备份目录路径
   */
  getBackupDir(): string {
    return this.backupDir;
  }

  /**
   * 列出指定文件的所有备份
   * @param fileName 原始文件名
   * @returns 备份文件列表
   */
  listBackups(fileName: string): Array<{ name: string; path: string; mtime: Date }> {
    try {
      return fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith(`${fileName}.backup.`))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stat = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            mtime: stat.mtime
          };
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    } catch (error) {
      logger.info('列出备份文件时出错:', error);
      return [];
    }
  }
} 