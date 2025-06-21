import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import * as diff from 'diff';
import { DialogueChunk, WebGALScriptCompiler } from './compiler.js';

interface CacheData {
  filePath: string;
  content: string;
  timestamp: number;
  hash: string;
  dialogues: DialogueChunk[];
}

export class ScriptCache {
  private cacheDir: string;

  constructor(workDir: string) {
    this.cacheDir = path.join(workDir, '.webgal-voice-cache');
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getCacheFilePath(filePath: string): string {
    const hash = createHash('md5').update(filePath).digest('hex');
    return path.join(this.cacheDir, `${hash}.json`);
  }

  private getContentHash(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }

  /**
   * 读取之前的文件缓存
   * @param filePath 文件路径
   * @returns 缓存的内容，如果不存在则返回空字符串
   */
  readPreviousFileCache(filePath: string): string {
    try {
      const cacheFilePath = this.getCacheFilePath(filePath);
      if (!fs.existsSync(cacheFilePath)) {
        return '';
      }

      const cacheData: CacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
      return cacheData.content;
    } catch (error) {
      console.error(`Failed to read cache for ${filePath}:`, error);
      return '';
    }
  }

  /**
   * 为对话数组添加唯一id
   * @param dialogues 对话数组
   * @returns 带id的对话数组
   */
  private addDialogueIds(dialogues: DialogueChunk[]): DialogueChunk[] {
    const characterCounters = new Map<string, number>();
    
    return dialogues.map(dialogue => {
      const key = `${dialogue.character}:${dialogue.text}`;
      const count = characterCounters.get(key) || 0;
      characterCounters.set(key, count + 1);
      
      return {
        ...dialogue,
        id: count // 添加自增id来区分重复对话
      };
    });
  }

  /**
   * 保存文件缓存
   * @param filePath 文件路径
   * @param content 文件内容
   * @param configuredCharacters 配置的角色列表
   */
  saveFileCache(filePath: string, content: string, configuredCharacters: string[]): void {
    try {
      const dialogues = WebGALScriptCompiler.parseScript(filePath, configuredCharacters);
      const dialoguesWithIds = this.addDialogueIds(dialogues);
      
      const cacheData: CacheData = {
        filePath,
        content,
        timestamp: Date.now(),
        hash: this.getContentHash(content),
        dialogues: dialoguesWithIds
      };

      const cacheFilePath = this.getCacheFilePath(filePath);
      fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      console.error(`Failed to save cache for ${filePath}:`, error);
    }
  }

  /**
   * 获取缓存的对话数据
   * @param filePath 文件路径
   * @returns 缓存的对话数组，如果不存在则返回空数组
   */
  getCachedDialogues(filePath: string): DialogueChunk[] {
    try {
      const cacheFilePath = this.getCacheFilePath(filePath);
      if (!fs.existsSync(cacheFilePath)) {
        return [];
      }

      const cacheData: CacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
      return cacheData.dialogues || [];
    } catch (error) {
      console.error(`Failed to get cached dialogues for ${filePath}:`, error);
      return [];
    }
  }

  /**
   * 比较文件内容差异
   * @param filePath 文件路径
   * @param currentContent 当前文件内容
   * @param configuredCharacters 配置的角色列表
   * @returns 差异结果
   */
  compareContent(filePath: string, currentContent: string, configuredCharacters: string[]): {
    hasChanges: boolean;
    deletedDialogues: DialogueChunk[];
    addedDialogues: DialogueChunk[];
    allDifferences: diff.Change[];
  } {
    const previousContent = this.readPreviousFileCache(filePath);
    const currentDialogues = WebGALScriptCompiler.parseScript(filePath, configuredCharacters);
    const currentDialoguesWithIds = this.addDialogueIds(currentDialogues);
    const previousDialogues = this.getCachedDialogues(filePath);

    // 文本级别的差异
    const textDifferences = diff.diffLines(previousContent, currentContent);
    
    // 对话级别的差异 - 使用角色名+对话内容+id作为key
    const previousDialogueMap = new Map<string, DialogueChunk>();
    const currentDialogueMap = new Map<string, DialogueChunk>();

    // 构建对话映射 (使用角色名+对话内容+id作为key来区分重复对话)
    for (const dialogue of previousDialogues) {
      const key = `${dialogue.character}:${dialogue.text}:${dialogue.id || 0}`;
      previousDialogueMap.set(key, dialogue);
    }

    for (const dialogue of currentDialoguesWithIds) {
      const key = `${dialogue.character}:${dialogue.text}:${dialogue.id || 0}`;
      currentDialogueMap.set(key, dialogue);
    }

    // 找出删除的对话
    const deletedDialogues: DialogueChunk[] = [];
    for (const [key, dialogue] of previousDialogueMap) {
      if (!currentDialogueMap.has(key)) {
        deletedDialogues.push(dialogue);
      }
    }

    // 找出新增的对话
    const addedDialogues: DialogueChunk[] = [];
    for (const [key, dialogue] of currentDialogueMap) {
      if (!previousDialogueMap.has(key)) {
        addedDialogues.push(dialogue);
      }
    }

    const hasChanges = deletedDialogues.length > 0 || addedDialogues.length > 0;

    return {
      hasChanges,
      deletedDialogues,
      addedDialogues,
      allDifferences: textDifferences
    };
  }

  /**
   * 清除特定文件的缓存
   * @param filePath 要清除缓存的文件路径
   */
  clearFileCache(filePath: string): void {
    try {
      const cacheFilePath = this.getCacheFilePath(filePath);
      if (fs.existsSync(cacheFilePath)) {
        fs.unlinkSync(cacheFilePath);
        console.error(`🗑️ 清除缓存文件: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.error(`Failed to clear cache for ${filePath}:`, error);
    }
  }

  /**
   * 清理缓存目录
   * @param maxAge 最大保存时间（毫秒），默认7天
   */
  cleanupCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    try {
      const files = fs.readdirSync(this.cacheDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.error(`Cleaned up old cache file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
    }
  }

  /**
   * 获取缓存目录大小
   * @returns 缓存目录大小（字节）
   */
  getCacheSize(): number {
    try {
      let totalSize = 0;
      const files = fs.readdirSync(this.cacheDir);
      
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      }
      
      return totalSize;
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }
} 