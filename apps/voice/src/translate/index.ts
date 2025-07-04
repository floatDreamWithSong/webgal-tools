import { generateText, LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createCohere } from '@ai-sdk/cohere';
import { createOllama } from 'ollama-ai-provider';
import { TranslateConfig, CharacterVoiceConfig } from '../config.js';
import { logger } from '@webgal-mcp/logger';

/**
 * 角色语言特色配置存储
 */
const characterStyles = new Map<string, string>();

/**
 * 统一翻译服务类
 */
export class TranslateService {
  private modelCache = new Map<string, LanguageModel>();

  /**
   * 获取或创建AI模型实例
   */
  private getModel(config: TranslateConfig): LanguageModel {
    const cacheKey = `${config.model_type}:${config.base_url}:${config.model_name}`;
    
    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey)!;
    }

    let model: LanguageModel;

    switch (config.model_type) {
      case 'ollama':
        const ollamaProvider = createOllama({
          baseURL: config.base_url,
        });
        model = ollamaProvider(config.model_name);
        break;

      case 'openai':
        if (!config.api_key) {
          throw new Error('OpenAI 需要提供 api_key');
        }
        const openaiProvider = createOpenAI({
          baseURL: config.base_url !== 'https://api.openai.com/v1' ? config.base_url : undefined,
          apiKey: config.api_key,
        });
        model = openaiProvider(config.model_name);
        break;

      case 'anthropic':
        if (!config.api_key) {
          throw new Error('Anthropic 需要提供 api_key');
        }
        const anthropicProvider = createAnthropic({
          baseURL: config.base_url !== 'https://api.anthropic.com' ? config.base_url : undefined,
          apiKey: config.api_key,
        });
        model = anthropicProvider(config.model_name);
        break;

      case 'google':
        if (!config.api_key) {
          throw new Error('Google 需要提供 api_key');
        }
        const googleProvider = createGoogleGenerativeAI({
          baseURL: config.base_url !== 'https://generativelanguage.googleapis.com/v1beta' ? config.base_url : undefined,
          apiKey: config.api_key,
        });
        model = googleProvider(config.model_name);
        break;

      case 'mistral':
        if (!config.api_key) {
          throw new Error('Mistral 需要提供 api_key');
        }
        const mistralProvider = createMistral({
          baseURL: config.base_url !== 'https://api.mistral.ai/v1' ? config.base_url : undefined,
          apiKey: config.api_key,
        });
        model = mistralProvider(config.model_name);
        break;

      case 'cohere':
        if (!config.api_key) {
          throw new Error('Cohere 需要提供 api_key');
        }
        const cohereProvider = createCohere({
          baseURL: config.base_url !== 'https://api.cohere.ai/v1' ? config.base_url : undefined,
          apiKey: config.api_key,
        });
        model = cohereProvider(config.model_name);
        break;

      case 'custom':
        // 对于自定义供应商，尝试使用通用的OpenAI兼容格式
        const customProvider = createOpenAI({
          baseURL: config.base_url,
          apiKey: config.api_key || 'dummy-key',
        });
        model = customProvider(config.model_name);
        break;

      default:
        throw new Error(`不支持的模型类型: ${config.model_type}`);
    }

    this.modelCache.set(cacheKey, model);
    return model;
  }

  /**
   * 获取角色的语言特色
   */
  private getCharacterStyle(character: string): string {
    return characterStyles.get(character) || '保持角色原有的语言风格和语气';
  }

  /**
   * 构建翻译提示词
   */
  private buildTranslatePrompt(
    character: string,
    text: string,
    targetLanguage: string,
    context?: string,
    globalPrompt?: string,
    characterPrompt?: string
  ): string {
    const characterStyle = this.getCharacterStyle(character);
    
    let prompt = `你是一个专业的翻译助手，专门负责将游戏对话翻译成${targetLanguage}。

翻译规则：
1. 只输出翻译目标句子被翻译后的内容，不要包含任何解释、注释或额外文字，错误示例: “你好！（nihao!）”
2. 保持原文的情感色彩和语气，不要修改目标语句的意思。错误示例：“你好!” -> “こんにちは、元気ですか？” 正确示例： “你好!” -> “こんにちは!”
3. 翻译要自然流畅，符合${targetLanguage}的表达习惯
4. 用户如果提供了信息，则一定要遵守用户的意思：
示例： 用户提示：若叶（わかば）睦（むつみ）
用户目标： 若叶同学?
分析：这里直接叫同学的姓，说明并不是很亲近的人，应该使用さん来保证礼貌
用户提供了若叶（わかば），最终翻译为：わかばさん?
`;

    // 添加角色信息
    prompt += `\n\n
- 正在说话的人：${character}
`;

    // 添加角色特定的提示词
    if (characterPrompt) {
      prompt += `\n- 说话的人的专属说明：${characterPrompt}`;
    }

    // 添加全局提示词
    if (globalPrompt) {
      prompt += `\n\n全局翻译指导：\n${globalPrompt}`;
    }

    // 添加上下文信息
    if (context) {
      prompt += `\n\n上下文信息：\n${context}`;
    }

    prompt += `\n\n请翻译以下文本：\n${text}`;
    logger.debug(prompt)
    return prompt;
  }

  /**
   * 翻译文本
   */
  async translate(
    character: string,
    speech: string,
    targetLanguage: string,
    config: TranslateConfig,
    characterConfig?: CharacterVoiceConfig,
    context?: string
  ): Promise<string> {
    if (!targetLanguage) {
      throw new Error('未提供翻译目标语言');
    }

    try {
      const model = this.getModel(config);
      const prompt = this.buildTranslatePrompt(
        character,
        speech,
        targetLanguage,
        context,
        config.additional_prompt,
        characterConfig?.prompt
      );

      const result = await generateText({
        model,
        prompt,
        temperature: 0.3, // 使用较低的温度以获得更一致的翻译
        maxTokens: 1000,
      });

      let translatedText = result.text.trim();
      
      if (!translatedText) {
        throw new Error('翻译结果为空');
      }

      // 清理响应内容
      this.cleanupTranslationResult(translatedText);

      // 移除可能的思考标签内容
      if (translatedText.includes('<think>')) {
        translatedText = (translatedText.split('</think>')[1] ?? '').trim();
      }

      // 移除开头和结尾的引号
      if ((translatedText.startsWith('"') && translatedText.endsWith('"')) ||
          (translatedText.startsWith('"') && translatedText.endsWith('"'))) {
        translatedText = translatedText.slice(1, -1);
      }

      const hasAdditionalInfo = context || config.additional_prompt || characterConfig?.prompt;
      if (hasAdditionalInfo) {
        logger.info(`[翻译+增强] ${character}: "${speech}" -> "${translatedText}"`);
      } else {
        logger.info(`[翻译] ${character}: "${speech}" -> "${translatedText}"`);
      }
      
      return translatedText;
    } catch (error) {
      logger.error(`翻译失败 [${config.model_type}] ${character}:`, error);
      logger.error(`回退到原文: "${speech}"`);
      return speech;
    }
  }

  /**
   * 清理翻译结果
   */
  private cleanupTranslationResult(text: string): string {
    return text.trim()
      .replace(/^["'""]|["'""]$/g, '') // 移除首尾引号
      .replace(/\n+/g, ' ') // 将多个换行符替换为单个空格
      .trim();
  }

  /**
   * 检查服务可用性
   */
  async checkAvailability(config: TranslateConfig): Promise<boolean> {
    try {
      const model = this.getModel(config);
      
      // 发送一个简单的测试请求
      const result = await generateText({
        model,
        prompt: '请回复"测试成功"',
        maxTokens: 100,
      });
      
      logger.info(`${config.model_type} 测试消息: ${result.text.trim()}`);
      return result.text.length > 2;
    } catch (error) {
      logger.error(`服务可用性检查失败 [${config.model_type}]:`, error);
      return false;
    }
  }

  /**
   * 清理模型缓存
   */
  clearCache(): void {
    this.modelCache.clear();
  }

  /**
   * 设置角色语言特色
   */
  setCharacterStyle(character: string, style: string): void {
    characterStyles.set(character, style);
  }

  /**
   * 获取所有角色样式
   */
  getAllCharacterStyles(): Map<string, string> {
    return new Map(characterStyles);
  }

  /**
   * 移除角色样式
   */
  removeCharacterStyle(character: string): void {
    characterStyles.delete(character);
  }
}

// 创建单例实例
const translateService = new TranslateService();

// 导出便利函数以保持向后兼容
export async function translate(
  character: string, 
  speech: string, 
  targetLanguage: string, 
  config: TranslateConfig, 
  context?: string
): Promise<string> {
  return translateService.translate(character, speech, targetLanguage, config, undefined, context);
}

export function setCharacterStyle(character: string, style: string): void {
  translateService.setCharacterStyle(character, style);
}

// 已废弃：使用 translateService.checkAvailability() 替代
export async function checkTranslatorService(config: TranslateConfig): Promise<boolean> {
  return translateService.checkAvailability(config);
}

// 导出服务实例和类型
export { translateService };
