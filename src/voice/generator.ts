import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { DialogueChunk, WebGALScriptCompiler } from './compiler.js';
import { checkTranslatorService, setCharacterStyle } from '../translate/index.js';
import { GPTSoVITSAPI } from './request.js';
import { workDir } from '../config.js';
import { VoiceConfigManager, CharacterVoiceConfig } from './config.js';
import { BackupManager } from './backup.js';
import { ContextExtractor } from './context.js';
import { ParallelProcessor } from './parallel-processor.js';
import { UniversalAIService } from '../translate/ai-service.js';
import { logger } from '../logger.js';

export interface VoiceTask {
  character: string;
  originalText: string;
  targetText: string;
  audioFileName: string;
  refAudioPath?: string;
  refText?: string;
  contentHash?: string; // 添加内容哈希字段
}

export class VoiceGenerator {
  private api: GPTSoVITSAPI;
  private audioOutputDir: string;
  private configManager: VoiceConfigManager;
  private backupManager: BackupManager;

  constructor() {
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
      logger.error('加载角色语言特色失败:', error);
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
        logger.info(`删除音频文件: ${audioFileName}`);
      } catch (error) {
        logger.error(`删除音频文件失败 ${audioFileName}:`, error);
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
    
    logger.info(`📋 创建语音任务，共 ${addedDialogues.length} 个对话`);

    for (const dialogue of addedDialogues) {
      const contentHash = this.generateContentHash(dialogue.character, dialogue.text);
      const audioFileName = this.generateAudioFileName(dialogue.character, dialogue.text);
      
      // 检查音频文件是否已存在
      if (this.audioFileExists(audioFileName)) {
        logger.info(`✅ 音频文件已存在，跳过任务: ${audioFileName}`);
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
        logger.info(`📝 创建任务: ${dialogue.character} - ${dialogue.text.substring(0, 20)}...`);
      } else {
        logger.info(`🔄 发现重复任务，已合并: ${dialogue.character} - ${dialogue.text.substring(0, 20)}...`);
      }
    }

    logger.info(`🎯 任务创建完成：原始 ${addedDialogues.length} 个对话，去重后 ${tasks.length} 个任务`);
    return tasks;
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
      logger.info(`检查 ${translateConfig.model_type} 服务可用性...`);
      
      // 对于新的AI服务，使用通用的服务检查
      if (translateConfig.model_type && translateConfig.model_type !== 'ollama' || !translateConfig.ollama_endpoint) {
        const aiService = new UniversalAIService();
        const isServiceAvailable = await aiService.checkAvailability(translateConfig);
        if (!isServiceAvailable) {
          logger.warn(`${translateConfig.model_type} 服务不可用，将跳过翻译步骤`);
          return [];
        }
      } else {
        // 兼容旧的Ollama检查方式
        const endpoint = translateConfig.base_url || translateConfig.ollama_endpoint;
        const isOllamaAvailable = await checkTranslatorService(endpoint);
        if (!isOllamaAvailable) {
          logger.warn('Ollama服务不可用，将跳过翻译步骤');
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
        logger.error(`❌ 角色 ${task.character} 未在 voice.config.json 中配置`);
      }
    }

    // 提取上下文信息
    const contextMap: Map<string, string> = new Map();
    if (allDialogues && allDialogues.length > 0 && this.configManager.isTranslateEnabled()) {
      logger.info('📖 提取对话上下文以提高翻译质量...');
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
      
      logger.info(`为 ${contextMap.size} 个对话提取了上下文信息`);
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
   * 主要的语音生成函数（优化版本 - 基于文件缓存）
   * @param fileName 脚本文件名（相对于工作目录/scene）
   * @param forceMode 强制模式，清理现有音频文件并重新生成所有语音
   */
  async generateVoice(fileName: string, forceMode: boolean = false): Promise<void> {
    const filePath = path.resolve(workDir,'scene', fileName);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`脚本文件不存在: ${filePath}`);
    }

    logger.info(`开始处理脚本文件: ${filePath}`);
    if (forceMode) {
      logger.info(`⚡ 强制模式：清理现有音频文件并重新生成所有语音`);
    }
    
    // 获取配置的角色列表
    const configuredCharacters = this.configManager.getAllCharacterNames();
    
    // 解析所有对话
    const allDialogues = WebGALScriptCompiler.parseScript(filePath, configuredCharacters);
    logger.info(`📖 解析到 ${allDialogues.length} 条对话`);
    
    if (allDialogues.length === 0) {
      logger.info('没有找到需要处理的对话');
      return;
    }

    let needVoiceDialogues: DialogueChunk[] = [];

    if (forceMode) {
      // 强制模式：清理所有相关的音频文件
      logger.info('🧹 强制模式：清理现有音频文件...');
      for (const dialogue of allDialogues) {
        const audioFileName = this.generateAudioFileName(dialogue.character, dialogue.text);
        if (this.audioFileExists(audioFileName)) {
          this.deleteAudioFile(audioFileName);
        }
      }
      
      // 所有对话都需要重新生成
      needVoiceDialogues = allDialogues;
      logger.info(`强制模式：将重新生成 ${needVoiceDialogues.length} 条对话的语音`);
    } else {
      // 正常模式：筛选出没有音频文件的对话
      logger.info('🔍 检查音频缓存状态...');
      for (const dialogue of allDialogues) {
        const audioFileName = this.generateAudioFileName(dialogue.character, dialogue.text);
        if (!this.audioFileExists(audioFileName)) {
          needVoiceDialogues.push(dialogue);
        } else {
          logger.info(`✅ 音频已缓存: ${dialogue.character} - ${dialogue.text.substring(0, 20)}...`);
        }
      }
      
      logger.info(`检查完成：${allDialogues.length} 条对话中，${needVoiceDialogues.length} 条需要生成语音`);
    }

    // 如果没有需要生成语音的对话，直接更新脚本文件引用
    if (needVoiceDialogues.length === 0) {
      logger.info('🎉 所有对话都已有音频缓存，只需更新脚本文件引用');
      this.updateScriptFileReferences(filePath, allDialogues);
      return;
    }

    // 创建语音生成任务
    const voiceTasks = this.createVoiceTasks(needVoiceDialogues);
    
    if (voiceTasks.length === 0) {
      logger.info('没有有效的语音生成任务');
      return;
    }

    // 使用并行处理器处理翻译和语音合成
    const successfulTasks = await this.processTasksParallel(voiceTasks, allDialogues);

    // 更新脚本文件 - 包含新生成的和已缓存的音频
    logger.info('📝 更新脚本文件引用...');
    this.updateScriptFileReferences(filePath, allDialogues, successfulTasks);

    logger.info(`🎉 语音生成完成！新生成 ${successfulTasks.length} 条，复用缓存 ${allDialogues.length - needVoiceDialogues.length} 条`);
  }

  /**
   * 更新脚本文件引用（新方法）
   * @param filePath 脚本文件路径
   * @param allDialogues 所有对话
   * @param successfulTasks 成功的语音任务（可选）
   */
  private updateScriptFileReferences(
    filePath: string, 
    allDialogues: DialogueChunk[], 
    successfulTasks?: VoiceTask[]
  ): void {
    // 创建任务映射
    const taskMap = new Map<string, VoiceTask>();
    if (successfulTasks) {
      for (const task of successfulTasks) {
        if (task.contentHash) {
          taskMap.set(task.contentHash, task);
        }
      }
    }

    // 更新所有对话的音频文件信息
    const updatedDialogues: DialogueChunk[] = [];
    
    for (const dialogue of allDialogues) {
      const contentHash = this.generateContentHash(dialogue.character, dialogue.text);
      let audioFileName: string | undefined;
      
      // 优先使用新生成的任务结果
      const task = taskMap.get(contentHash);
      if (task) {
        audioFileName = task.audioFileName;
      } else {
        // 检查是否有缓存的音频文件
        const cachedAudioFileName = this.generateAudioFileName(dialogue.character, dialogue.text);
        if (this.audioFileExists(cachedAudioFileName)) {
          audioFileName = cachedAudioFileName;
        }
      }
      
      // 创建更新后的对话块
      const updatedDialogue: DialogueChunk = {
        ...dialogue,
        audioFile: audioFileName,
        volume: audioFileName ? this.configManager.getDefaultVolume().toString() : dialogue.volume
      };
      
      updatedDialogues.push(updatedDialogue);
    }
    
    // 使用新的重构方法生成脚本内容
    const newContent = WebGALScriptCompiler.rebuildScript(filePath, updatedDialogues);
    
    // 创建备份
    try {
      const fileName = path.basename(filePath);
      this.backupManager.createBackup(filePath);
      this.backupManager.cleanOldBackups(fileName, 5);
    } catch (error) {
      logger.error('创建备份时出错:', error);
    }

    // 写入新内容
    fs.writeFileSync(filePath, newContent);
    logger.info(`✅ 更新脚本文件: ${filePath}`);
  }
} 