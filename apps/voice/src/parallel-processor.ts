import path from 'path';
import { VoiceTask } from './generator.js';
import { TranslateConfig, CharacterVoiceConfig } from './config.js';
import { GPTSoVITSAPI } from './request.js';
import { 
  ITranslationService, 
  TranslationResult, 
  TranslationServiceFactory 
} from './translate/index.js';
import { getMaxTranslator } from '@webgal-tools/config';
import { logger } from '@webgal-tools/logger';
import { ModelScanner } from './model-scanner.js';
import { ScannedModelFiles, EmotionRecognitionResult } from '@webgal-tools/config';

interface TranslateTask {
  id: string;
  character: string;
  originalText: string;
  targetLanguage: string;
  audioFileName: string;
  context?: string;
  characterConfig?: CharacterVoiceConfig;
  translationService: ITranslationService; // 新增：翻译服务实例
}

interface TranslateResult {
  id: string;
  character: string;
  originalText: string;
  translatedText: string;
  audioFileName: string;
  success: boolean;
  error?: string;
  isAutoMode?: boolean;
  emotionResult?: EmotionRecognitionResult;
}

/**
 * 并发控制器 - 基于Promise而非多进程
 */
export class ParallelProcessor {
  private api: GPTSoVITSAPI;
  private audioOutputDir: string;
  private translationFactory: TranslationServiceFactory;
  private gptSovitsPath: string;

  // 状态跟踪
  private totalTasks = 0;
  private completedTranslateCount = 0;
  private completedVoiceCount = 0;
  private completedVoiceTasks: VoiceTask[] = [];

  // 语音合成队列和状态
  private voiceQueue: TranslateResult[] = [];
  private isVoiceSynthesizing = false;
  private currentCharacter: string | null = null;

  // 并发控制
  private maxConcurrency: number;
  private activeTranslations = 0;

  // 回调函数
  private onTranslateProgress?: (completed: number, total: number, result: TranslateResult) => void;
  private onVoiceProgress?: (completed: number, total: number, result: VoiceTask) => void;
  private onError?: (error: Error, task: TranslateTask | VoiceTask) => void;

  constructor(api: GPTSoVITSAPI, audioOutputDir: string, gptSovitsPath?: string) {
    this.api = api;
    this.audioOutputDir = audioOutputDir;
    this.gptSovitsPath = gptSovitsPath || '';
    this.translationFactory = new TranslationServiceFactory(this.gptSovitsPath);
    // 从配置获取最大并发数
    this.maxConcurrency = getMaxTranslator();
    logger.info(`🔧 最大并发数: ${this.maxConcurrency}`);
  }

  /**
   * 设置进度回调函数
   */
  setCallbacks(callbacks: {
    onTranslateProgress?: (completed: number, total: number, result: TranslateResult) => void;
    onVoiceProgress?: (completed: number, total: number, result: VoiceTask) => void;
    onError?: (error: Error, task: TranslateTask | VoiceTask) => void;
  }): void {
    this.onTranslateProgress = callbacks.onTranslateProgress;
    this.onVoiceProgress = callbacks.onVoiceProgress;
    this.onError = callbacks.onError;
  }

  /**
   * 限制并发执行的Promise工具函数
   */
  private async limitConcurrency<T>(
    tasks: (() => Promise<T>)[],
    limit: number,
    onProgress?: (completed: number, total: number, result: T) => void
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];
    let completed = 0;

    for (const task of tasks) {
      const promise = task().then((result) => {
        completed++;
        results.push(result);
        if (onProgress) {
          onProgress(completed, tasks.length, result);
        }
      });

      executing.push(promise);

      if (executing.length >= limit) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => 
          p === promise || (p as any)._isCompleted
        ), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * 执行单个翻译任务
   */
  private async translateSingleTask(
    task: TranslateTask,
    config: TranslateConfig
  ): Promise<TranslateResult> {
    try {
      logger.info(`🔄 开始翻译: ${task.character} - ${task.originalText.substring(0, 20)}...`);

      // 使用翻译服务接口进行翻译
      const translationResult = await task.translationService.translate(
        task.character,
        task.originalText,
        task.targetLanguage,
        config,
        task.characterConfig,
        task.context
      );

      const result: TranslateResult = {
        id: task.id,
        character: task.character,
        originalText: task.originalText,
        translatedText: translationResult.translatedText,
        audioFileName: task.audioFileName,
        success: translationResult.success,
        error: translationResult.error,
        isAutoMode: translationResult.isAutoMode,
        emotionResult: translationResult.emotionResult
      };

      if (translationResult.success) {
        logger.info(`✅ 翻译完成: ${task.character} - ${translationResult.translatedText.substring(0, 20)}...`);
      } else {
        logger.error(`❌ 翻译失败: ${task.character} - ${translationResult.error}`);
      }

      return result;

    } catch (error) {
      logger.error(`❌ 翻译任务执行失败 ${task.character}:`, error);
      
      const result: TranslateResult = {
        id: task.id,
        character: task.character,
        originalText: task.originalText,
        translatedText: task.originalText, // 失败时使用原文
        audioFileName: task.audioFileName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        isAutoMode: false
      };

      if (this.onError) {
        this.onError(error instanceof Error ? error : new Error(String(error)), task);
      }

      return result;
    }
  }

  /**
   * 并发执行翻译任务
   */
  private async translateTasks(
    tasks: TranslateTask[],
    config: TranslateConfig
  ): Promise<TranslateResult[]> {
    if (tasks.length === 0) {
      return [];
    }

    logger.info(`🚀 开始并发翻译 ${tasks.length} 个任务，最大并发数: ${this.maxConcurrency}`);

    const taskFunctions = tasks.map(task => 
      () => this.translateSingleTask(task, config)
    );

    return this.limitConcurrency(
      taskFunctions,
      this.maxConcurrency,
      (completed, total, result) => {
        this.completedTranslateCount = completed;
        if (this.onTranslateProgress) {
          this.onTranslateProgress(completed, total, result);
        }
        // 将翻译完成的任务加入语音合成队列
        this.enqueueVoiceSynthesis(result);
      }
    );
  }

  /**
   * 将翻译结果加入语音合成队列
   */
  private enqueueVoiceSynthesis(translateResult: TranslateResult): void {
    this.voiceQueue.push(translateResult);
    logger.info(`📋 加入语音合成队列: ${translateResult.character} (队列长度: ${this.voiceQueue.length})`);

    // 触发语音合成处理
    this.processVoiceQueue();
  }

  /**
   * 处理语音合成队列（保持单线程以避免模型切换冲突）
   */
  private async processVoiceQueue(): Promise<void> {
    if (this.isVoiceSynthesizing || this.voiceQueue.length === 0) {
      return;
    }

    this.isVoiceSynthesizing = true;

    while (this.voiceQueue.length > 0) {
      const translateResult = this.voiceQueue.shift()!;

      // 优先处理同一角色的任务
      if (this.currentCharacter && this.currentCharacter !== translateResult.character) {
        const sameCharacterIndex = this.voiceQueue.findIndex(task => task.character === this.currentCharacter);
        if (sameCharacterIndex !== -1) {
          this.voiceQueue.unshift(translateResult);
          const sameCharacterTask = this.voiceQueue.splice(sameCharacterIndex + 1, 1)[0];
          await this.synthesizeVoice(sameCharacterTask);
          continue;
        }
      }

      await this.synthesizeVoice(translateResult);
    }

    this.isVoiceSynthesizing = false;
  }

  /**
   * 执行语音合成
   */
  private async synthesizeVoice(translateResult: TranslateResult): Promise<void> {
    try {
      logger.info(`🎵 开始语音合成: ${translateResult.character} (队列剩余: ${this.voiceQueue.length})`);

      // 找到对应的角色配置
      const characterConfig = this.characterConfigs?.get(translateResult.character);
      if (!characterConfig) {
        throw new Error(`未找到角色配置: ${translateResult.character}`);
      }

      let finalCharacterConfig: CharacterVoiceConfig;
      let refAudioPath: string;
      let refText: string;

      if (translateResult.isAutoMode && translateResult.emotionResult) {
        // 自动模式：使用情绪识别结果
        const emotionResult = translateResult.emotionResult;
        
        // 创建临时的角色配置
        finalCharacterConfig = {
          ...characterConfig,
          gpt: emotionResult.gpt,
          sovits: emotionResult.sovits,
          ref_audio: emotionResult.ref_audio,
          ref_text: ModelScanner.extractRefTextFromAudioFileName(emotionResult.ref_audio)
        };

        refAudioPath = emotionResult.ref_audio;
        refText = ModelScanner.extractRefTextFromAudioFileName(emotionResult.ref_audio);
        
        logger.info(`🤖 [${translateResult.character}] 自动模式 - 使用情绪: ${emotionResult.emotion}`);
      } else {
        // 正常模式：使用原配置
        finalCharacterConfig = characterConfig;
        refAudioPath = characterConfig.ref_audio;
        refText = characterConfig.ref_text;
      }

      // 检查是否需要切换角色模型
      const modelKey = `${finalCharacterConfig.gpt}_${finalCharacterConfig.sovits}`;
      const currentModelKey = this.currentCharacter ? `${this.characterConfigs?.get(this.currentCharacter)?.gpt}_${this.characterConfigs?.get(this.currentCharacter)?.sovits}` : null;

      if (currentModelKey !== modelKey) {
        logger.info(`🔄 切换到角色模型: ${translateResult.character} (${finalCharacterConfig.gpt}/${finalCharacterConfig.sovits})`);

        await this.api.setGptModel(finalCharacterConfig.gpt);
        await this.api.setSovitsModel(
          finalCharacterConfig.sovits,
          finalCharacterConfig.inferrence_config?.prompt_language || '中文',
          finalCharacterConfig.inferrence_config?.text_language || '中文'
        );

        this.currentCharacter = translateResult.character;
      }

      // 生成语音
      const outputPath = await this.api.generateVoice(
        refAudioPath,
        refText,
        translateResult.translatedText,
        finalCharacterConfig.inferrence_config || {}
      );

      // 下载音频文件
      const finalAudioPath = path.join(this.audioOutputDir, translateResult.audioFileName);
      await this.api.downloadAudio(outputPath, finalAudioPath);

      // 创建完成的任务
      const completedTask: VoiceTask = {
        character: translateResult.character,
        originalText: translateResult.originalText,
        targetText: translateResult.translatedText,
        audioFileName: translateResult.audioFileName
      };

      this.completedVoiceTasks.push(completedTask);
      this.completedVoiceCount++;

      logger.info(`✅ 语音合成完成: ${translateResult.character} - ${translateResult.audioFileName}`);

      if (this.onVoiceProgress) {
        this.onVoiceProgress(this.completedVoiceCount, this.totalTasks, completedTask);
      }

    } catch (error) {
      logger.error(`❌ 语音合成失败 ${translateResult.character}:`, error);
      this.completedVoiceCount++;

      if (this.onError) {
        const voiceTask: VoiceTask = {
          character: translateResult.character,
          originalText: translateResult.originalText,
          targetText: translateResult.translatedText,
          audioFileName: translateResult.audioFileName
        };
        this.onError(error instanceof Error ? error : new Error(String(error)), voiceTask);
      }
    }
  }

  // 存储角色配置的引用
  private characterConfigs?: Map<string, CharacterVoiceConfig>;

  /**
   * 处理翻译和语音合成任务（重构版本 - 使用翻译服务接口）
   */
  async processTasksParallel(
    voiceTasks: VoiceTask[],
    characterConfigs: Map<string, CharacterVoiceConfig>,
    translateConfig: TranslateConfig,
    contextMap: Map<string, string>,
    gptSovitsPath?: string
  ): Promise<VoiceTask[]> {

    this.characterConfigs = characterConfigs;
    this.totalTasks = voiceTasks.length;
    this.completedTranslateCount = 0;
    this.completedVoiceCount = 0;
    this.completedVoiceTasks = [];
    this.voiceQueue = [];

    // 更新 gptSovitsPath 如果提供了
    if (gptSovitsPath) {
      this.gptSovitsPath = gptSovitsPath;
      this.translationFactory = new TranslationServiceFactory(this.gptSovitsPath);
    }

    if (this.totalTasks === 0) {
      return [];
    }

    logger.info(`🚀 开始并行处理 ${this.totalTasks} 个任务`);

    // 准备翻译任务
    const translateTasks: TranslateTask[] = [];
    const noTranslateTasks: TranslateResult[] = [];

    for (const task of voiceTasks) {
      const characterConfig = characterConfigs.get(task.character);
      if (!characterConfig) {
        logger.error(`❌ 角色 ${task.character} 未在配置中找到`);
        continue;
      }

      const taskId = `${task.character}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 使用工厂创建翻译服务实例
      const translationService = this.translationFactory.createTranslationService(
        task.character,
        characterConfig,
        translateConfig,
        this.gptSovitsPath
      );

      const translateTarget = characterConfig.translate_to;
      const isAutoMode = characterConfig.auto === true;
      
      // 检查是否需要处理（翻译或情绪识别）
      const needsProcessing = translateTarget || isAutoMode;
      
      if (needsProcessing) {
        // 需要翻译或情绪识别
        const taskKey = `${task.character}:${task.originalText}`;
        const context = contextMap.get(taskKey);

        const translateTask: TranslateTask = {
          id: taskId,
          character: task.character,
          originalText: task.originalText,
          targetLanguage: translateTarget || '中文', // 自动模式默认中文
          audioFileName: task.audioFileName,
          context,
          characterConfig,
          translationService // 使用工厂创建的翻译服务实例
        };

        translateTasks.push(translateTask);
        
        if (isAutoMode) {
          if (translateTarget) {
            logger.info(`🤖 创建自动情绪识别翻译任务: ${task.character} - ${task.originalText.substring(0, 20)}...`);
          } else {
            logger.info(`🎭 创建纯情绪识别任务: ${task.character} - ${task.originalText.substring(0, 20)}...`);
          }
        } else {
          logger.info(`📝 创建翻译任务: ${task.character} - ${task.originalText.substring(0, 20)}...`);
        }
      } else {
        // 不需要任何处理，直接使用原文
        const result: TranslateResult = {
          id: taskId,
          character: task.character,
          originalText: task.originalText,
          translatedText: task.originalText,
          audioFileName: task.audioFileName,
          success: true,
          isAutoMode: false
        };

        noTranslateTasks.push(result);
        logger.info(`✅ 无需处理任务: ${task.character} - ${task.originalText.substring(0, 20)}...`);
      }
    }

    // 先将不需要翻译的任务加入语音合成队列
    for (const result of noTranslateTasks) {
      this.enqueueVoiceSynthesis(result);
    }

    // 并发执行翻译任务（包括自动模式和普通模式）
    if (translateTasks.length > 0) {
      const autoModeCount = translateTasks.filter(t => t.characterConfig?.auto === true).length;
      const normalModeCount = translateTasks.length - autoModeCount;
      
      logger.info(`📊 开始并行处理翻译任务: 自动模式 ${autoModeCount} 个, 普通模式 ${normalModeCount} 个`);
      
      await this.translateTasks(translateTasks, translateConfig);
    }

    // 等待所有任务完成
    return new Promise((resolve) => {
      const checkCompletion = () => {
        if (this.completedVoiceCount >= this.totalTasks) {
          logger.info(`🎉 并行处理完成！成功处理 ${this.completedVoiceTasks.length}/${this.totalTasks} 个任务`);
          resolve(this.completedVoiceTasks);
        } else {
          setTimeout(checkCompletion, 100);
        }
      };

      checkCompletion();
    });
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 清理翻译服务缓存
    this.translationFactory.cleanup();
    logger.info('🛑 并行处理器资源已清理');
  }
} 