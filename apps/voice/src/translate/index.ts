import { generateText, LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createCohere } from '@ai-sdk/cohere';
import { createOllama } from 'ollama-ai-provider';
import { TranslateConfig, CharacterVoiceConfig } from '../config.js';
import { ScannedModelFiles, EmotionRecognitionResult } from '@webgal-tools/config';
import { logger } from '@webgal-tools/logger';
import path from 'node:path';

// 导出新的接口和实现
export * from './interface.js';
export * from './implementations.js';
export * from './factory.js';

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
    
    let prompt = `你是一位专业的游戏翻译专家，任务是将游戏对话精准地翻译成${targetLanguage}。

## 翻译目标
将 <待翻译文本> 的内容翻译成${targetLanguage}。

## 核心翻译准则
1.  **纯净输出**：只返回翻译后的文本，不包含任何原文、解释、注释或额外符号。
    -   错误示例：\`你好！（Hello!）\`
    -   正确示例：\`Hello!\`
2.  **忠实原文**：保持原文的语气、情感和风格。不要添加或删减信息。
    -   原文：“你好!”
    -   错误翻译：“你好吗?”
    -   正确翻译：“Hello!”
3.  **流畅自然**：译文需符合${targetLanguage}的语言习惯。
4.  **遵循角色设定**：严格遵守提供的角色信息和语言风格。
5.  **参考示例**:
    - 用户提示: 若叶（わかば）睦（むつみ）
    - 用户目标: 若叶同学?
    - 分析: 这里直接叫同学的姓，说明并不是很亲近的人，应该使用さん来保证礼貌
    - 最终翻译: わかばさん?

## 背景信息
-   **当前说话角色**: ${character}
-   **角色语言风格**: ${characterStyle}
${context ? `-   **对话上下文**: \n${context}\n` : ''}
${globalPrompt ? `
## 全局翻译指南
${globalPrompt}
` : ''}
## 待翻译文本
${text}
`;
    logger.debug(prompt)
    return prompt;
  }

  /**
   * 构建模型选择提示词
   */
  private buildModelSelectionPrompt(
    character: string,
    text: string,
    targetLanguage: string,
    scannedFiles: ScannedModelFiles,
    context?: string,
    globalPrompt?: string,
    characterPrompt?: string
  ): string {
    const characterStyle = this.getCharacterStyle(character);

    let prompt = `你是一位专业的AI语音生成助手。你的任务是分析一段游戏对话，将其翻译成${targetLanguage}，然后根据对话内容和情感，从提供的文件列表中选择最合适的语音模型来生成音频。

## 任务流程
1.  **分析**: 理解 <待处理文本> 的内容、上下文和情感。
2.  **翻译**: 将文本翻译成${targetLanguage}。
3.  **选择**: 从 <可用模型文件> 列表中，为翻译后的文本选择最匹配的 \`gpt\`、\`sovits\` 和 \`ref_audio\` 文件。
4.  **输出**: 以一个完整的JSON对象的形式返回结果，不要有任何其他多余的文字。

## 可用模型文件
### GPT 模型 (.ckpt)
${scannedFiles.gpt_files.map(f => `- \`${f}\``).join('\n') || '无'}

### SoVITS 模型 (.pth)
${scannedFiles.sovits_files.map(f => `- \`${f}\``).join('\n') || '无'}

### 参考音频
${scannedFiles.ref_audio_files.map(f => `- \`${f}\``).join('\n') || '无'}

## 背景信息
-   **当前说话角色**: ${character}
-   **角色语言风格**: ${characterStyle}
${context ? `-   **对话上下文**: \n${context}\n` : ''}
${globalPrompt ? `
## 全局翻译与选择指南
${globalPrompt}
` : ''}
## 模型选择逻辑
-   **情感匹配**: 分析文本情感（如：开心、悲伤、愤怒、惊讶、中性），选择文件名中最能体现该情感的模型。
-   **内容匹配**: 如果文件名包含场景或状态信息，请匹配文本内容。
-   **备用方案**: 如果没有明显匹配项，选择一个文件名看起来最通用、最中性的模型。
-   **示例分析**:
    -   "要一起吃午饭吗？" -> 情绪: 中性, 日常。可选择通用模型。
    -   "我的外卖被偷了..." -> 情绪: 悲伤, 沮丧。应选择带有 "sad" 或 "sorrow" 等字样的模型。
    -   "谁敢这么欺负咱们老大！" -> 情绪: 愤怒, 激动。应选择带有 "angry" 或 "rage" 等字样的模型。

## 待处理文本
"${text}"

## 输出格式
请严格按照以下JSON格式返回，确保它是一个有效的JSON对象，并放置在json代码块中：
\`\`\`json
{
  "gpt": "从列表中选择的 .ckpt 文件路径",
  "sovits": "从列表中选择的 .pth 文件路径",
  "ref_audio": "从列表中选择的参考音频路径",
  "translated_text": "翻译后的文本",
  "emotion": "对所分析文本情绪的简短描述（例如：开心）"
}
\`\`\`
`;

    logger.debug(prompt);
    return prompt;
  }

  /**
   * 智能路径匹配函数
   * 处理AI返回的路径与扫描结果路径的匹配问题
   */
  private findBestMatchingPath(aiPath: string, scannedPaths: string[]): string | null {
    if (!aiPath || scannedPaths.length === 0) {
      return null;
    }

    // 标准化路径分隔符
    const normalizedAiPath = aiPath.replace(/\\/g, '/').toLowerCase();
    const normalizedScannedPaths = scannedPaths.map(p => p.replace(/\\/g, '/').toLowerCase());

    // 1. 精确匹配
    const exactMatch = normalizedScannedPaths.find(p => p === normalizedAiPath);
    if (exactMatch) {
      return scannedPaths[normalizedScannedPaths.indexOf(exactMatch)];
    }

    // 2. 文件名匹配（忽略路径）
    const aiFileName = path.basename(normalizedAiPath);
    const fileNameMatch = normalizedScannedPaths.find(p => path.basename(p) === aiFileName);
    if (fileNameMatch) {
      return scannedPaths[normalizedScannedPaths.indexOf(fileNameMatch)];
    }

    // 3. 模糊匹配（包含关系）
    const fuzzyMatches = normalizedScannedPaths.filter(p => 
      p.includes(aiFileName) || aiFileName.includes(path.basename(p))
    );
    if (fuzzyMatches.length > 0) {
      // 选择最长的匹配（通常更具体）
      const bestMatch = fuzzyMatches.reduce((a, b) => a.length > b.length ? a : b);
      return scannedPaths[normalizedScannedPaths.indexOf(bestMatch)];
    }

    // 4. 部分路径匹配
    const aiPathParts = normalizedAiPath.split('/').filter(p => p.length > 0);
    const pathMatches = normalizedScannedPaths.filter(p => {
      const scannedParts = p.split('/').filter(sp => sp.length > 0);
      return aiPathParts.some(part => scannedParts.includes(part));
    });
    
    if (pathMatches.length > 0) {
      // 选择匹配度最高的
      const bestMatch = pathMatches.reduce((a, b) => {
        const aScore = aiPathParts.filter(part => a.includes(part)).length;
        const bScore = aiPathParts.filter(part => b.includes(part)).length;
        return aScore > bScore ? a : b;
      });
      return scannedPaths[normalizedScannedPaths.indexOf(bestMatch)];
    }

    return null;
  }

  /**
   * 模型选择和翻译
   */
  async selectModelAndTranslate(
    character: string,
    speech: string,
    targetLanguage: string,
    scannedFiles: ScannedModelFiles,
    config: TranslateConfig,
    characterConfig?: CharacterVoiceConfig,
    context?: string
  ): Promise<EmotionRecognitionResult> {
    if (!targetLanguage) {
      throw new Error('未提供翻译目标语言');
    }

    try {
      const model = this.getModel(config);
      const prompt = this.buildModelSelectionPrompt(
        character,
        speech,
        targetLanguage,
        scannedFiles,
        context,
        config.additional_prompt,
        characterConfig?.prompt
      );

      const result = await generateText({
        model,
        prompt,
        temperature: 0.3, // 使用较低的温度以获得更一致的结果
        maxTokens: 512, // 限制输出长度，一般来说 token 输出在30+左右，500token都接近20秒了。因此不能等待太久，而且一句话怎么可能几百个字...
      });

      let responseText = result.text.trim();
      
      if (!responseText) {
        throw new Error('模型选择结果为空');
      }
      logger.debug(responseText)
      // 提取JSON内容
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('响应中没有找到有效的JSON格式');
      }

      const jsonText = jsonMatch[0];
      let selectionResult: EmotionRecognitionResult;

      try {
        selectionResult = JSON.parse(jsonText);
      } catch (parseError) {
        throw new Error(`JSON解析失败: ${parseError}`);
      }

      // 验证响应结构
      if (!selectionResult.gpt || !selectionResult.sovits || !selectionResult.ref_audio || 
          !selectionResult.translated_text || !selectionResult.emotion) {
        throw new Error('响应JSON缺少必要的字段');
      }

      // 使用智能路径匹配验证选择的文件
      const matchedGpt = this.findBestMatchingPath(selectionResult.gpt, scannedFiles.gpt_files);
      if (matchedGpt) {
        if (matchedGpt !== selectionResult.gpt) {
          logger.info(`GPT路径匹配: "${selectionResult.gpt}" -> "${matchedGpt}"`);
        }
        selectionResult.gpt = matchedGpt;
      } else {
        logger.warn(`无法匹配GPT文件: ${selectionResult.gpt}，使用第一个可用文件`);
        selectionResult.gpt = scannedFiles.gpt_files[0];
      }

      const matchedSovits = this.findBestMatchingPath(selectionResult.sovits, scannedFiles.sovits_files);
      if (matchedSovits) {
        if (matchedSovits !== selectionResult.sovits) {
          logger.info(`SoVITS路径匹配: "${selectionResult.sovits}" -> "${matchedSovits}"`);
        }
        selectionResult.sovits = matchedSovits;
      } else {
        logger.warn(`无法匹配SoVITS文件: ${selectionResult.sovits}，使用第一个可用文件`);
        selectionResult.sovits = scannedFiles.sovits_files[0];
      }

      const matchedRefAudio = this.findBestMatchingPath(selectionResult.ref_audio, scannedFiles.ref_audio_files);
      if (matchedRefAudio) {
        if (matchedRefAudio !== selectionResult.ref_audio) {
          logger.info(`参考音频路径匹配: "${selectionResult.ref_audio}" -> "${matchedRefAudio}"`);
        }
        selectionResult.ref_audio = matchedRefAudio;
      } else {
        logger.warn(`无法匹配参考音频文件: ${selectionResult.ref_audio}，使用第一个可用文件`);
        selectionResult.ref_audio = scannedFiles.ref_audio_files[0];
      }

      logger.info(`[模型选择] ${character}: "${speech}" -> 情绪:${selectionResult.emotion}, 翻译:"${selectionResult.translated_text}"`);
      
      return selectionResult;
    } catch (error) {
      logger.error(`模型选择失败 [${config.model_type}] ${character}:`, error);
      
      // 回退方案：使用默认选择
      const fallbackResult: EmotionRecognitionResult = {
        gpt: scannedFiles.gpt_files[0] || '',
        sovits: scannedFiles.sovits_files[0] || '',
        ref_audio: scannedFiles.ref_audio_files[0] || '',
        translated_text: speech, // 回退到原文
        emotion: 'neutral'
      };

      // 检查回退方案是否有效
      if (!fallbackResult.gpt || !fallbackResult.sovits || !fallbackResult.ref_audio) {
        logger.error(`回退方案无效：缺少必要的模型文件`);
        logger.error(`可用GPT文件: ${scannedFiles.gpt_files.length}个`);
        logger.error(`可用SoVITS文件: ${scannedFiles.sovits_files.length}个`);
        logger.error(`可用参考音频文件: ${scannedFiles.ref_audio_files.length}个`);
        throw new Error('没有可用的模型文件进行回退');
      }

      logger.warn(`使用回退方案: ${JSON.stringify(fallbackResult)}`);
      return fallbackResult;
    }
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
