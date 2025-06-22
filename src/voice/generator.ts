import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { DialogueChunk, WebGALScriptCompiler } from './compiler.js';
import { ScriptCache } from './cache.js';
import { checkTranslatorService, setCharacterStyle } from '../translate/index.js';
import { GPTSoVITSAPI } from './request.js';
import { workDir } from '../config.js';
import { VoiceConfigManager, CharacterVoiceConfig } from './config.js';
import { BackupManager } from './backup.js';
import { ContextExtractor } from './context.js';
import { ParallelProcessor } from './parallel-processor.js';
import { UniversalAIService } from '../translate/ai-service.js';

export interface VoiceTask {
  character: string;
  originalText: string;
  targetText: string;
  audioFileName: string;
  refAudioPath?: string;
  refText?: string;
  contentHash?: string; // 添加内容哈希字段
}

interface DeleteTask {
  audioFileName: string;
  filePath: string;
}

export class VoiceGenerator {
  private cache: ScriptCache;
  private api: GPTSoVITSAPI;
  private audioOutputDir: string;
  private configManager: VoiceConfigManager;
  private backupManager: BackupManager;

  constructor() {
    this.cache = new ScriptCache(workDir);
    this.configManager = new VoiceConfigManager(workDir);
    this.backupManager = new BackupManager(workDir);
    this.api = new GPTSoVITSAPI(
      this.configManager.getGptSovitsUrl(), 
      this.configManager.getModelVersion()
    );
    this.audioOutputDir = path.join(workDir,'vocal');
    this.ensureAudioDir();
    this.initializeCharacterStyles();
  }

  /**
   * 初始化角色语言特色
   */
  private initializeCharacterStyles(): void {
    try {
      const config = this.configManager.loadConfig();
      for (const character of config.characters) {
        if (character.prompt) {
          setCharacterStyle(character.character_name, character.prompt);
        }
      }
    } catch (error) {
      console.error('加载角色语言特色失败:', error);
    }
  }

  private ensureAudioDir(): void {
    if (!fs.existsSync(this.audioOutputDir)) {
      fs.mkdirSync(this.audioOutputDir, { recursive: true });
    }
  }

  /**
   * 生成基于内容的音频文件名
   * @param character 角色名
   * @param text 对话内容
   * @returns 音频文件名
   */
  private generateAudioFileName(character: string, text: string): string {
    // 使用角色名和对话内容生成哈希
    const contentHash = createHash('md5')
      .update(`${character}:${text}`)
      .digest('hex')
      .substring(0, 12); // 取前12位作为文件名
    
    return `${character}_${contentHash}.wav`;
  }

  /**
   * 检查音频文件是否已存在
   * @param audioFileName 音频文件名
   * @returns 文件是否存在
   */
  private audioFileExists(audioFileName: string): boolean {
    const audioPath = path.join(this.audioOutputDir, audioFileName);
    return fs.existsSync(audioPath);
  }

  /**
   * 生成内容哈希
   * @param character 角色名
   * @param text 对话内容
   * @returns 内容哈希
   */
  private generateContentHash(character: string, text: string): string {
    return createHash('md5')
      .update(`${character}:${text}`)
      .digest('hex')
      .substring(0, 12);
  }

  /**
   * 删除音频文件
   * @param audioFileName 音频文件名
   */
  private deleteAudioFile(audioFileName: string): void {
    if (!audioFileName.trim()) return;
    
    const audioPath = path.join(this.audioOutputDir, audioFileName);
    if (fs.existsSync(audioPath)) {
      try {
        fs.unlinkSync(audioPath);
        console.error(`删除音频文件: ${audioFileName}`);
      } catch (error) {
        console.error(`删除音频文件失败 ${audioFileName}:`, error);
      }
    }
  }

  /**
   * 处理删除任务（优化版本）
   * @param deletedDialogues 已删除的对话
   */
  private processDeletionTasks(deletedDialogues: DialogueChunk[]): void {
    console.error(`处理删除任务，共 ${deletedDialogues.length} 个`);
    
    for (const dialogue of deletedDialogues) {
      // 优先使用已有的audioFile字段
      if (dialogue.audioFile) {
        this.deleteAudioFile(dialogue.audioFile);
      } else {
        // 如果没有audioFile字段，根据内容哈希生成文件名并尝试删除
        const audioFileName = this.generateAudioFileName(dialogue.character, dialogue.text);
        if (this.audioFileExists(audioFileName)) {
          this.deleteAudioFile(audioFileName);
        }
      }
    }
  }

  /**
   * 创建语音生成任务（优化版本）
   * @param addedDialogues 新增的对话
   * @returns 去重后的语音任务数组
   */
  private createVoiceTasks(addedDialogues: DialogueChunk[]): VoiceTask[] {
    const tasks: VoiceTask[] = [];
    const uniqueTasks = new Map<string, VoiceTask>(); // 用于去重的映射
    
    console.error(`📋 创建语音任务，共 ${addedDialogues.length} 个对话`);

    for (const dialogue of addedDialogues) {
      const contentHash = this.generateContentHash(dialogue.character, dialogue.text);
      const audioFileName = this.generateAudioFileName(dialogue.character, dialogue.text);
      
      // 检查音频文件是否已存在
      if (this.audioFileExists(audioFileName)) {
        console.error(`✅ 音频文件已存在，跳过任务: ${audioFileName}`);
        continue;
      }
      
      // 使用内容哈希作为去重key
      const taskKey = contentHash;
      
      if (!uniqueTasks.has(taskKey)) {
        const task: VoiceTask = {
          character: dialogue.character,
          originalText: dialogue.text,
          targetText: dialogue.text, // 如果需要翻译，后面会更新
          audioFileName,
          contentHash
        };
        
        uniqueTasks.set(taskKey, task);
        tasks.push(task);
        console.error(`📝 创建任务: ${dialogue.character} - ${dialogue.text.substring(0, 20)}...`);
      } else {
        console.error(`🔄 发现重复任务，已合并: ${dialogue.character} - ${dialogue.text.substring(0, 20)}...`);
      }
    }

    console.error(`🎯 任务创建完成：原始 ${addedDialogues.length} 个对话，去重后 ${tasks.length} 个任务`);
    return tasks;
  }

  /**
   * 按角色分组任务
   * @param tasks 任务数组
   * @returns 按角色分组的任务映射
   */
  private groupTasksByCharacter(tasks: VoiceTask[]): Map<string, VoiceTask[]> {
    const grouped = new Map<string, VoiceTask[]>();
    
    for (const task of tasks) {
      if (!grouped.has(task.character)) {
        grouped.set(task.character, []);
      }
      grouped.get(task.character)!.push(task);
    }
    
    return grouped;
  }

  /**
   * 使用并行处理器处理翻译和语音合成任务
   * @param tasks 语音任务数组
   * @param allDialogues 所有对话（用于提取上下文）
   * @returns 成功处理的任务数组
   */
  private async processTasksParallel(tasks: VoiceTask[], allDialogues?: DialogueChunk[]): Promise<VoiceTask[]> {
    if (tasks.length === 0) {
      return [];
    }

    // 检查翻译服务可用性
    if (this.configManager.isTranslateEnabled()) {
      const translateConfig = this.configManager.getTranslateConfig();
      console.error(`检查 ${translateConfig.model_type} 服务可用性...`);
      
      // 对于新的AI服务，使用通用的服务检查
      if (translateConfig.model_type && translateConfig.model_type !== 'ollama' || !translateConfig.ollama_endpoint) {
        const aiService = new UniversalAIService();
        const isServiceAvailable = await aiService.checkAvailability(translateConfig);
        if (!isServiceAvailable) {
          console.error(`${translateConfig.model_type} 服务不可用，将跳过翻译步骤`);
          return [];
        }
      } else {
        // 兼容旧的Ollama检查方式
        const endpoint = translateConfig.base_url || translateConfig.ollama_endpoint;
        const isOllamaAvailable = await checkTranslatorService(endpoint);
        if (!isOllamaAvailable) {
          console.error('Ollama服务不可用，将跳过翻译步骤');
          return [];
        }
      }
    }

    // 准备角色配置映射
    const characterConfigs = new Map<string, CharacterVoiceConfig>();
    for (const task of tasks) {
      const config = this.configManager.getCharacterConfig(task.character);
      if (config) {
        characterConfigs.set(task.character, config);
      } else {
        console.error(`❌ 角色 ${task.character} 未在 voice.config.json 中配置`);
      }
    }

    // 提取上下文信息
    let contextMap: Map<string, string> = new Map();
    if (allDialogues && allDialogues.length > 0 && this.configManager.isTranslateEnabled()) {
      console.error('📖 提取对话上下文以提高翻译质量...');
      const translateConfig = this.configManager.getTranslateConfig();
      
      for (const task of tasks) {
        const dialogueIndex = allDialogues.findIndex(d => 
          d.character === task.character && d.text === task.originalText
        );
        
        if (dialogueIndex !== -1) {
          const contextSize = translateConfig.context_size || 2;
          const contextInfo = ContextExtractor.extractContext(allDialogues, dialogueIndex, contextSize);
          
          if (contextInfo.contextText) {
            const taskKey = `${task.character}:${task.originalText}`;
            contextMap.set(taskKey, contextInfo.contextText);
          }
        }
      }
      
      console.error(`为 ${contextMap.size} 个对话提取了上下文信息`);
    }

    // 使用并行处理器
    const processor = new ParallelProcessor(this.api, this.audioOutputDir);
    
    try {
      const translateConfig = this.configManager.getTranslateConfig();
      const successfulTasks = await processor.processTasksParallel(
        tasks,
        characterConfigs,
        translateConfig,
        contextMap
      );
      
      return successfulTasks;
    } finally {
      processor.cleanup();
    }
  }

  /**
   * 更新脚本文件（优化版本）
   * @param filePath 脚本文件路径
   * @param addedDialogues 新增的对话
   * @param successfulTasks 成功的语音任务
   */
  private updateScriptFile(
    filePath: string, 
    addedDialogues: DialogueChunk[], 
    successfulTasks: VoiceTask[]
  ): void {
    // 创建任务映射，使用内容哈希作为key
    const taskMap = new Map<string, VoiceTask>();
    for (const task of successfulTasks) {
      if (task.contentHash) {
        taskMap.set(task.contentHash, task);
      }
    }

    // 更新对话数据
    const updatedDialogues = addedDialogues.map(dialogue => {
      const contentHash = this.generateContentHash(dialogue.character, dialogue.text);
      const task = taskMap.get(contentHash);
      
      if (task) {
        return {
          ...dialogue,
          audioFile: task.audioFileName,
          volume: this.configManager.getDefaultVolume().toString()
        };
      } else {
        // 如果没有找到对应的任务，检查音频文件是否已存在
        const audioFileName = this.generateAudioFileName(dialogue.character, dialogue.text);
        if (this.audioFileExists(audioFileName)) {
          console.error(`🔗 使用已存在的音频文件: ${audioFileName}`);
          return {
            ...dialogue,
            audioFile: audioFileName,
            volume: this.configManager.getDefaultVolume().toString()
          };
        }
      }
      
      return dialogue;
    });

    // 读取原始文件内容
    const originalContent = fs.readFileSync(filePath, 'utf-8');
    const originalLines = originalContent.split('\n');
    
    // 更新对应的行
    for (const dialogue of updatedDialogues) {
      if (dialogue.audioFile) {
        const lineIndex = dialogue.lineNumber - 1;
        if (lineIndex >= 0 && lineIndex < originalLines.length) {
          let newLine = `${dialogue.character}:${dialogue.text}`;
          newLine += ` -${dialogue.audioFile}`;
          if (dialogue.volume) {
            newLine += ` -volume=${dialogue.volume}`;
          }
          newLine += ';';
          originalLines[lineIndex] = newLine;
        }
      }
    }
    
    const newContent = originalLines.join('\n');
    
    // 使用备份管理器创建备份
    try {
      const fileName = path.basename(filePath);
      this.backupManager.createBackup(filePath);
      // 清理旧备份，保留最近的5个
      this.backupManager.cleanOldBackups(fileName, 5);
    } catch (error) {
      console.error('创建备份时出错:', error);
    }

    // 写入新内容
    fs.writeFileSync(filePath, newContent);
    console.error(`✅ 更新脚本文件: ${filePath}`);
  }

  /**
   * 主要的语音生成函数
   * @param fileName 脚本文件名（相对于工作目录/scene）
   * @param forceMode 强制模式，跳过缓存差异检测
   */
  async generateVoice(fileName: string, forceMode: boolean = false): Promise<void> {
    const filePath = path.resolve(workDir,'scene', fileName);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`脚本文件不存在: ${filePath}`);
    }

    console.error(`开始处理脚本文件: ${filePath}`);
    if (forceMode) {
      console.error(`⚡ 强制模式：跳过缓存差异检测，重新生成所有语音`);
    }

    // 读取当前文件内容
    const currentContent = fs.readFileSync(filePath, 'utf-8');
    
    // 获取配置的角色列表
    const configuredCharacters = this.configManager.getAllCharacterNames();
    
    let addedDialogues: DialogueChunk[];
    let deletedDialogues: DialogueChunk[] = [];
    
    if (forceMode) {
      // 强制模式：先读取缓存信息，清理音频文件，然后删除缓存
      console.error('⚡ 强制模式：读取缓存信息并清理现有音频文件');
      
      // 先读取缓存中的对话信息，获取音频文件列表
      const cachedDialogues = this.cache.getCachedDialogues(filePath);
      if (cachedDialogues.length > 0) {
        console.error(`🧹 清理 ${cachedDialogues.length} 个缓存对话的音频文件...`);
        for (const dialogue of cachedDialogues) {
          if (dialogue.audioFile) {
            this.deleteAudioFile(dialogue.audioFile);
          }
        }
      }
      
      // 清除缓存数据
      console.error('🗑️ 清除缓存数据');
      this.cache.clearFileCache(filePath);
      
      // 解析所有对话作为新增对话
      addedDialogues = WebGALScriptCompiler.parseScriptContent(currentContent, configuredCharacters);
      console.error(`强制模式：将处理 ${addedDialogues.length} 条对话`);
    } else {
      // 正常模式：比较差异
      const comparison = this.cache.compareContent(filePath, currentContent, configuredCharacters);
      
      if (!comparison.hasChanges) {
        console.error('脚本内容没有变化，无需处理');
        return;
      }

      console.error(`检测到变化: 删除 ${comparison.deletedDialogues.length} 条，新增 ${comparison.addedDialogues.length} 条对话`);
      
      addedDialogues = comparison.addedDialogues;
      deletedDialogues = comparison.deletedDialogues;
      
      // 处理删除任务
      this.processDeletionTasks(deletedDialogues);
    }

    // 创建语音生成任务
    let voiceTasks = this.createVoiceTasks(addedDialogues);
    
    if (voiceTasks.length === 0) {
      console.error('没有需要生成语音的新对话');
      if (!forceMode) {
        // 更新缓存
        this.cache.saveFileCache(filePath, currentContent, configuredCharacters);
      }
      return;
    }

    // 获取所有对话用于上下文提取
    let allDialogues: DialogueChunk[] = [];
    if (this.configManager.isTranslateEnabled()) {
      const configuredCharacters = this.configManager.getAllCharacterNames();
      allDialogues = WebGALScriptCompiler.parseScriptContent(currentContent, configuredCharacters);
    }

    // 使用并行处理器处理翻译和语音合成
    const successfulTasks = await this.processTasksParallel(voiceTasks, allDialogues);

    // 更新脚本文件
    if (successfulTasks.length > 0) {
      this.updateScriptFile(filePath, addedDialogues, successfulTasks);
    }

    // 更新缓存
    const finalContent = fs.readFileSync(filePath, 'utf-8');
    this.cache.saveFileCache(filePath, finalContent, configuredCharacters);

    console.error(`🎉 语音生成完成！处理了 ${successfulTasks.length} 条对话`);
  }
} 