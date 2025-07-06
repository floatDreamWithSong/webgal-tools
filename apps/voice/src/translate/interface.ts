import { TranslateConfig, CharacterVoiceConfig } from '../config.js';
import { ScannedModelFiles, EmotionRecognitionResult } from '@webgal-tools/config';

/**
 * 翻译服务接口
 * 定义统一的翻译服务契约，用于解耦语音合成和翻译服务
 */
export interface ITranslationService {
  /**
   * 翻译文本
   * @param character 角色名
   * @param originalText 原始文本
   * @param targetLanguage 目标语言
   * @param config 翻译配置
   * @param characterConfig 角色配置
   * @param context 上下文信息
   * @returns 翻译结果
   */
  translate(
    character: string,
    originalText: string,
    targetLanguage: string,
    config: TranslateConfig,
    characterConfig?: CharacterVoiceConfig,
    context?: string
  ): Promise<TranslationResult>;
}

/**
 * 翻译结果接口
 */
export interface TranslationResult {
  /** 翻译后的文本 */
  translatedText: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息（如果有） */
  error?: string;
  /** 是否为自动模式 */
  isAutoMode: boolean;
  /** 情绪识别结果（仅自动模式） */
  emotionResult?: EmotionRecognitionResult;
}

/**
 * 翻译服务工厂接口
 */
export interface ITranslationServiceFactory {
  /**
   * 创建翻译服务实例
   * @param character 角色名
   * @param characterConfig 角色配置
   * @param globalTranslateConfig 全局翻译配置
   * @param gptSovitsPath GPT-SoVITS路径（用于自动模式）
   * @returns 翻译服务实例
   */
  createTranslationService(
    character: string,
    characterConfig: CharacterVoiceConfig,
    globalTranslateConfig: TranslateConfig,
    gptSovitsPath?: string
  ): ITranslationService;
} 