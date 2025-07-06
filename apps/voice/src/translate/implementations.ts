import { ITranslationService, TranslationResult } from './interface.js';
import { TranslateConfig, CharacterVoiceConfig } from '../config.js';
import { ScannedModelFiles, EmotionRecognitionResult } from '@webgal-tools/config';
import { logger } from '@webgal-tools/logger';
import path from 'path';
import { ModelScanner } from '../model-scanner.js';

/**
 * 空白翻译类
 * 当用户的配置的translate.check为false，或者角色的translate_to为空时使用
 * 不进行翻译，直接返回原文
 */
export class NoTranslationService implements ITranslationService {
  async translate(
    character: string,
    originalText: string,
    targetLanguage: string,
    config: TranslateConfig,
    characterConfig?: CharacterVoiceConfig,
    context?: string
  ): Promise<TranslationResult> {
    logger.info(`🚫 [${character}] 跳过翻译，使用原文: "${originalText}"`);
    
    return {
      translatedText: originalText,
      success: true,
      isAutoMode: false
    };
  }
}

/**
 * 静态翻译类
 * 当用户translate.check为true，且角色的配置设置了auto为false或没有设置时使用
 * 进行常规翻译，不进行情绪识别
 */
export class StaticTranslationService implements ITranslationService {
  private translateService: any; // 使用现有的TranslateService

  constructor(translateService: any) {
    this.translateService = translateService;
  }

  async translate(
    character: string,
    originalText: string,
    targetLanguage: string,
    config: TranslateConfig,
    characterConfig?: CharacterVoiceConfig,
    context?: string
  ): Promise<TranslationResult> {
    try {
      logger.info(`📝 [${character}] 开始静态翻译: "${originalText.substring(0, 20)}..."`);
      
      const translatedText = await this.translateService.translate(
        character,
        originalText,
        targetLanguage,
        config,
        characterConfig,
        context
      );

      logger.info(`✅ [${character}] 静态翻译完成: "${translatedText.substring(0, 20)}..."`);
      
      return {
        translatedText,
        success: true,
        isAutoMode: false
      };
    } catch (error) {
      logger.error(`❌ [${character}] 静态翻译失败:`, error);
      
      return {
        translatedText: originalText, // 失败时使用原文
        success: false,
        error: error instanceof Error ? error.message : String(error),
        isAutoMode: false
      };
    }
  }
}

/**
 * 自动情绪识别翻译类
 * 当用户translate.check为true，且角色的配置设置了auto为true时使用
 * 进行翻译和情绪识别，自动选择最合适的模型文件
 */
export class AutoEmotionTranslationService implements ITranslationService {
  private translateService: any; // 使用现有的TranslateService
  private gptSovitsPath: string;

  constructor(translateService: any, gptSovitsPath: string) {
    this.translateService = translateService;
    this.gptSovitsPath = gptSovitsPath;
  }

  async translate(
    character: string,
    originalText: string,
    targetLanguage: string,
    config: TranslateConfig,
    characterConfig?: CharacterVoiceConfig,
    context?: string
  ): Promise<TranslationResult> {
    try {
      logger.info(`🤖 [${character}] 开始自动情绪识别翻译: "${originalText.substring(0, 20)}..."`);
      
      if (!characterConfig) {
        throw new Error('自动模式需要角色配置');
      }

      // 构建文件夹路径
      const gptDir = path.resolve(this.gptSovitsPath, characterConfig.gpt);
      const sovitsDir = path.resolve(this.gptSovitsPath, characterConfig.sovits);
      const refAudioDir = characterConfig.ref_audio;

      // 扫描模型文件
      const scannedFiles = ModelScanner.scanModelFiles(this.gptSovitsPath, gptDir, sovitsDir, refAudioDir);

      // 检查是否有足够的文件
      if (scannedFiles.gpt_files.length === 0) {
        throw new Error(`未找到GPT模型文件在: ${gptDir}`);
      }
      if (scannedFiles.sovits_files.length === 0) {
        throw new Error(`未找到SoVITS模型文件在: ${sovitsDir}`);
      }
      if (scannedFiles.ref_audio_files.length === 0) {
        throw new Error(`未找到参考音频文件在: ${refAudioDir}`);
      }

      // 执行情绪识别和模型选择
      const emotionResult = await this.translateService.selectModelAndTranslate(
        character,
        originalText,
        targetLanguage,
        scannedFiles,
        config,
        characterConfig,
        context
      );

      logger.info(`✅ [${character}] 自动情绪识别翻译完成 - 情绪: ${emotionResult.emotion}, 翻译: "${emotionResult.translated_text.substring(0, 20)}..."`);
      
      return {
        translatedText: emotionResult.translated_text,
        success: true,
        isAutoMode: true,
        emotionResult
      };
    } catch (error) {
      logger.error(`❌ [${character}] 自动情绪识别翻译失败:`, error);
      
      return {
        translatedText: originalText, // 失败时使用原文
        success: false,
        error: error instanceof Error ? error.message : String(error),
        isAutoMode: true
      };
    }
  }
}

/**
 * 纯情绪识别翻译类
 * 当用户禁用翻译(translate.check为false)但启用动态情绪选择(auto为true)时使用
 * 不进行翻译，只进行情绪识别和模型文件选择
 */
export class EmotionOnlyTranslationService implements ITranslationService {
  private translateService: any; // 使用现有的TranslateService
  private gptSovitsPath: string;

  constructor(translateService: any, gptSovitsPath: string) {
    this.translateService = translateService;
    this.gptSovitsPath = gptSovitsPath;
  }

  async translate(
    character: string,
    originalText: string,
    targetLanguage: string,
    config: TranslateConfig,
    characterConfig?: CharacterVoiceConfig,
    context?: string
  ): Promise<TranslationResult> {
    try {
      logger.info(`🎭 [${character}] 开始纯情绪识别（无翻译）: "${originalText.substring(0, 20)}..."`);
      
      if (!characterConfig) {
        throw new Error('情绪识别模式需要角色配置');
      }

      // 构建文件夹路径
      const gptDir = path.resolve(this.gptSovitsPath, characterConfig.gpt);
      const sovitsDir = path.resolve(this.gptSovitsPath, characterConfig.sovits);
      const refAudioDir = characterConfig.ref_audio;

      // 扫描模型文件
      const scannedFiles = ModelScanner.scanModelFiles(this.gptSovitsPath, gptDir, sovitsDir, refAudioDir);

      // 检查是否有足够的文件
      if (scannedFiles.gpt_files.length === 0) {
        throw new Error(`未找到GPT模型文件在: ${gptDir}`);
      }
      if (scannedFiles.sovits_files.length === 0) {
        throw new Error(`未找到SoVITS模型文件在: ${sovitsDir}`);
      }
      if (scannedFiles.ref_audio_files.length === 0) {
        throw new Error(`未找到参考音频文件在: ${refAudioDir}`);
      }

      // 执行情绪识别和模型选择（不进行翻译）
      const emotionResult = await this.translateService.selectModelAndTranslate(
        character,
        originalText,
        '中文', // 使用中文作为目标语言，因为不进行翻译
        scannedFiles,
        config,
        characterConfig,
        context
      );

      logger.info(`✅ [${character}] 纯情绪识别完成 - 情绪: ${emotionResult.emotion}, 使用原文: "${originalText.substring(0, 20)}..."`);
      
      return {
        translatedText: originalText, // 使用原文，不翻译
        success: true,
        isAutoMode: true,
        emotionResult
      };
    } catch (error) {
      logger.error(`❌ [${character}] 纯情绪识别失败:`, error);
      
      return {
        translatedText: originalText, // 失败时使用原文
        success: false,
        error: error instanceof Error ? error.message : String(error),
        isAutoMode: true
      };
    }
  }
} 