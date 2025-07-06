import { ITranslationService, ITranslationServiceFactory } from './interface.js';
import { NoTranslationService, StaticTranslationService, AutoEmotionTranslationService, EmotionOnlyTranslationService } from './implementations.js';
import { TranslateConfig, CharacterVoiceConfig } from '../config.js';
import { TranslateService } from './index.js';

/**
 * 翻译服务工厂
 * 根据配置自动选择合适的翻译服务实现
 */
export class TranslationServiceFactory implements ITranslationServiceFactory {
  private translateService: TranslateService;
  private gptSovitsPath: string;

  constructor(gptSovitsPath: string) {
    this.translateService = new TranslateService();
    this.gptSovitsPath = gptSovitsPath;
  }

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
  ): ITranslationService {
    // 使用传入的路径或默认路径
    const effectiveGptSovitsPath = gptSovitsPath || this.gptSovitsPath;

    // 检查是否为自动模式
    const isAutoMode = characterConfig.auto === true;
    
    // 检查是否需要翻译
    const needsTranslation = globalTranslateConfig.check && characterConfig.translate_to;
    
    if (isAutoMode) {
      if (needsTranslation) {
        // 情况3：自动情绪识别翻译模式
        // 用户启用翻译且角色配置了auto为true
        return new AutoEmotionTranslationService(this.translateService, effectiveGptSovitsPath);
      } else {
        // 情况4：纯情绪识别模式（新增）
        // 用户禁用翻译但角色配置了auto为true
        return new EmotionOnlyTranslationService(this.translateService, effectiveGptSovitsPath);
      }
    } else {
      if (needsTranslation) {
        // 情况2：静态翻译模式
        // 用户启用翻译且角色配置了auto为false或没有设置
        return new StaticTranslationService(this.translateService);
      } else {
        // 情况1：空白翻译模式
        // 用户禁用翻译且角色没有设置翻译目标语言
        return new NoTranslationService();
      }
    }
  }

  /**
   * 获取翻译服务实例（用于其他功能）
   */
  getTranslateService(): TranslateService {
    return this.translateService;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.translateService.clearCache();
  }
} 