import { generateText, LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createCohere } from '@ai-sdk/cohere';
import { createOllama } from 'ollama-ai-provider';
import { TranslateConfig } from '../voice/config.js';

export interface AITranslateService {
  translate(
    character: string,
    text: string,
    targetLanguage: string,
    config: TranslateConfig,
    context?: string
  ): Promise<string>;
}

export class UniversalAIService implements AITranslateService {
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
   * 构建翻译提示词
   */
  private buildTranslatePrompt(
    character: string,
    text: string,
    targetLanguage: string,
    context?: string,
    additionalPrompt?: string
  ): string {
    let prompt = `你是一个专业的翻译助手。请将以下文本翻译成${targetLanguage}。

翻译要求：
1. 保持原文的语气和情感
2. 确保翻译自然流畅
3. 保留原文的格式和标点
4. 直接输出翻译结果，不要添加任何解释

角色信息：${character}`;

    if (context) {
      prompt += `\n\n上下文信息：\n${context}`;
    }

    if (additionalPrompt) {
      prompt += `\n\n额外信息：\n${additionalPrompt}`;
    }

    prompt += `\n\n请翻译以下文本：\n${text}`;

    return prompt;
  }

  /**
   * 翻译文本
   */
  async translate(
    character: string,
    text: string,
    targetLanguage: string,
    config: TranslateConfig,
    context?: string
  ): Promise<string> {
    try {
      const model = this.getModel(config);
      const prompt = this.buildTranslatePrompt(
        character,
        text,
        targetLanguage,
        context,
        config.additional_prompt
      );

      const result = await generateText({
        model,
        prompt,
        temperature: 0.3, // 使用较低的温度以获得更一致的翻译
        maxTokens: 1000,
      });

      const translatedText = result.text.trim();
      
      if (!translatedText) {
        throw new Error('翻译结果为空');
      }

      return translatedText;
    } catch (error) {
      console.error(`AI翻译失败 [${config.model_type}]:`, error);
      throw error;
    }
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
      console.error(`${config.model_type} 测试消息:${result.text.trim()}`)
      return result.text.length > 2;
    } catch (error) {
      console.error(`服务可用性检查失败 [${config.model_type}]:`, error);
      return false;
    }
  }

  /**
   * 清理模型缓存
   */
  clearCache(): void {
    this.modelCache.clear();
  }
} 