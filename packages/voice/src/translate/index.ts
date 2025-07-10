import { generateText, LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createCohere } from '@ai-sdk/cohere';
import { createOllama } from 'ollama-ai-provider';
import { TranslateConfig, CharacterVoiceConfig } from '../config.js';
import { ScannedModelFiles, EmotionRecognitionResult, ModelSelectionResponse } from '@webgal-tools/config';
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
  private currentIndexMaps?: {
    modelGroups: Map<number, { gpt: string; sovits: string }>;
    refAudio: Map<number, string>;
  };

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
        logger.info(`🔍 使用自定义模型: ${config.model_name}`);
        logger.info(`🔍 使用自定义模型: ${config.base_url}`);
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
   * 获取通用翻译规则
   * 提取两个提示词中共同的翻译规则部分
   */
  private getCommonTranslationRules(targetLanguage: string): string {
    return `
-   **全部翻译**：无论是口癖、拟声词、专有名词等，都必须翻译为目标语言的表达方式，不允许保留原文或夹杂原文。
    -   错误示例："嘿嘿嘿" -> "嘿嘿嘿"
    -   正确示例："嘿嘿嘿" -> "ふふふ" 或 "ほほほ" 或 "hehehe"
    -   错误示例："老大" -> "老大"
    -   正确示例："老大" -> "ボス" 或 "Boss"
    - 如果你确实不会翻译，并且这些词汇无关语义，那么你还可以将这些词汇移除，但必须保证不改变原文的意义
-   **疑问句处理**：疑问句翻译时要注意保持疑问语气，可以使用目标语言的疑问词、语调或语气词。
    -   正确示例："你要去哪里？" -> "どこに行くの？"（日语中加了疑问语气词"の"）
    -   正确示例："真的吗？" -> "本当？" 或 "Really?"（保持疑问语气）
    -   错误示例："你要去哪里？" -> "どこに行く"（缺少疑问语气）
-   **感叹句处理**：感叹句翻译时要保持强烈的情感表达，可以使用感叹词、强调语气或感叹号。
    -   正确示例："太棒了！" -> "すごい！" 或 "Amazing!"
    -   正确示例："好痛！" -> "痛い！" 或 "Ouch!"
    -   错误示例："太棒了！" -> "すごい"（缺少感叹语气）
-   **语气词适配**：根据目标语言的特点，适当调整语气词的使用。
    -   日语：可以使用"ね"、"よ"、"わ"、"さ"等语气词
    -   英语：可以使用"you know"、"well"、"oh"等
    -   中文：可以使用"呢"、"吧"、"啊"等
`;
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
    -   原文："你好!"
    -   错误翻译："你好吗?"
    -   正确翻译："Hello!"
3.  **流畅自然**：译文需符合${targetLanguage}的语言习惯。
4.  **遵循角色设定**：严格遵守提供的角色信息和语言风格。
5.  **参考示例**:
    - 用户提示: 若叶（わかば）睦（むつみ）
    - 用户目标: 若叶同学?
    - 分析: 这里直接叫同学的姓，说明并不是很亲近的人，应该使用さん来保证礼貌
    - 最终翻译: わかばさん?
${this.getCommonTranslationRules(targetLanguage)}
7.  **适度润色**：可以选择性地添加目标语言常用的语气词或语气助词，以提升译文的自然度和口语感，但必须保证不改变原文的意义。
    -   正确示例："快点！" -> "早くね！"（日语中加了语气词"ね"更自然）
    -   错误示例："快点！" -> "你最好快点，不然我就生气了！"（添加了原文没有的威胁语气，改变了原意）
11. **标点符号使用**：根据语气和情感使用合适的标点符号来调制语气，增强表达效果。
    -   **疑问句**：使用问号"？"或"?"，表示疑问、困惑、惊讶等
    -   **感叹句**：使用感叹号"！"或"!"，表示强烈情感、惊讶、愤怒、兴奋等
    -   **省略号**：使用"..."或"…"，表示犹豫、思考、未完待续等
    -   **破折号**：使用"—"或"-"，表示转折、强调、停顿等
    -   **正确示例**：
        - "真的吗？" → "本当？"（疑问）
        - "太棒了！" → "すごい！"（兴奋）
        - "那个..." → "あの..."（犹豫）
        - "哼—" → "ふん—"（不屑）
    -   **错误示例**：
        - "真的吗？" → "本当"（缺少问号，失去疑问语气）
        - "太棒了！" → "すごい"（缺少感叹号，失去兴奋感）

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

    // 创建模型组索引映射
    const modelGroupIndexMap = new Map<number, { gpt: string; sovits: string }>();
    const refAudioIndexMap = new Map<number, string>();

    // 按basename分组GPT和SoVITS模型
    const modelGroups = new Map<string, { gpt: string; sovits: string }>();
    
    // 遍历GPT文件，寻找匹配的SoVITS文件
    for (const gptFile of scannedFiles.gpt_files) {
      const gptBasename = path.basename(gptFile, path.extname(gptFile));
      
      // 寻找对应的SoVITS文件
      const matchingSovits = scannedFiles.sovits_files.find(sovitsFile => {
        const sovitsBasename = path.basename(sovitsFile, path.extname(sovitsFile));
        return gptBasename === sovitsBasename;
      });
      
      if (matchingSovits) {
        modelGroups.set(gptBasename, {
          gpt: gptFile,
          sovits: matchingSovits
        });
      }
    }
    
    // 为未匹配的GPT文件创建单独的组
    for (const gptFile of scannedFiles.gpt_files) {
      const gptBasename = path.basename(gptFile, path.extname(gptFile));
      if (!modelGroups.has(gptBasename)) {
        modelGroups.set(gptBasename, {
          gpt: gptFile,
          sovits: scannedFiles.sovits_files[0] || '' // 使用第一个SoVITS文件作为默认
        });
      }
    }
    
    // 为未匹配的SoVITS文件创建单独的组
    for (const sovitsFile of scannedFiles.sovits_files) {
      const sovitsBasename = path.basename(sovitsFile, path.extname(sovitsFile));
      if (!modelGroups.has(sovitsBasename)) {
        modelGroups.set(sovitsBasename, {
          gpt: scannedFiles.gpt_files[0] || '', // 使用第一个GPT文件作为默认
          sovits: sovitsFile
        });
      }
    }

    // 创建模型组列表
    const modelGroupsList = Array.from(modelGroups.entries()).map(([basename, files], index) => {
      const groupIndex = index + 1;
      modelGroupIndexMap.set(groupIndex, files);
      return `${groupIndex}. \`${basename}\` (GPT: ${path.basename(files.gpt)}, SoVITS: ${path.basename(files.sovits)})`;
    }).join('\n');

    // 为参考音频文件创建索引
    const refAudioFilesList = scannedFiles.ref_audio_files.map((f, index) => {
      const fileIndex = index + 1;
      refAudioIndexMap.set(fileIndex, f);
      return `${fileIndex}. \`${f}\``;
    }).join('\n');

    // 存储索引映射到实例中，供后续使用
    this.currentIndexMaps = {
      modelGroups: modelGroupIndexMap,
      refAudio: refAudioIndexMap
    };

    let prompt = `你是一位专业的AI语音生成助手。你的任务是分析一段游戏对话，将其翻译成${targetLanguage}，然后根据对话内容和情感，从提供的文件列表中选择最合适的语音模型来生成音频。

## 任务流程
1.  **分析**: 理解 <待处理文本> 的内容、上下文和情感。
2.  **翻译**: 将文本翻译成${targetLanguage}。
3.  **选择**: 从 <可用模型文件> 列表中，为翻译后的文本选择最匹配的模型组索引号和参考音频索引号。
4.  **输出**: 以一个完整的JSON对象的形式返回结果，不要有任何其他多余的文字。

## 可用模型文件
### 模型组 (GPT + SoVITS)
${modelGroupsList || '无'}

### 参考音频
${refAudioFilesList || '无'}

## 背景信息
-   **当前说话角色**: ${character}
-   **角色语言风格**: ${characterStyle}
${context ? `-   **对话上下文**: \n${context}\n` : ''}
${globalPrompt ? `
## 全局翻译与选择指南
${globalPrompt}
` : ''}
## 模型选择逻辑
-   **情感匹配**: 分析文本情感（如：开心、悲伤、愤怒、惊讶、中性、紧张、温柔、兴奋等），选择模型组名称中最能体现该情感的模型。
-   **内容匹配**: 如果模型组名称包含场景或状态信息，请匹配文本内容。
${this.getCommonTranslationRules(targetLanguage)}
-   **备用方案**: 如果没有明显匹配项，选择一个看起来最通用、最中性的模型组。
-   **示例分析**:
    -   **日常对话**: "要一起吃午饭吗？" -> 情绪: 中性, 日常。可选择通用模型或带有 "normal"、"neutral" 字样的模型组。
    -   **悲伤情绪**: "我的外卖被偷了..." -> 情绪: 悲伤, 沮丧。应选择带有 "sad"、"sorrow"、"cry" 等字样的模型组。
    -   **愤怒情绪**: "谁敢这么欺负咱们老大！" -> 情绪: 愤怒, 激动。应选择带有 "angry"、"rage"、"mad" 等字样的模型组。
    -   **开心情绪**: "哇！我中奖了！" -> 情绪: 开心, 兴奋。应选择带有 "happy"、"joy"、"excited" 等字样的模型组。
    -   **惊讶情绪**: "什么？你说的是真的吗？" -> 情绪: 惊讶, 震惊。应选择带有 "surprised"、"shock"、"amazed" 等字样的模型组。
    -   **温柔情绪**: "别担心，一切都会好起来的。" -> 情绪: 温柔, 安慰。应选择带有 "gentle"、"soft"、"comfort" 等字样的模型组。
    -   **紧张情绪**: "快跑！后面有人追来了！" -> 情绪: 紧张, 恐惧。应选择带有 "nervous"、"fear"、"panic" 等字样的模型组。
    -   **害羞情绪**: "那个...我可以和你一起吗？" -> 情绪: 害羞, 腼腆。应选择带有 "shy"、"timid"、"bashful" 等字样的模型组。
    -   **傲慢情绪**: "哼，就凭你也配？" -> 情绪: 傲慢, 轻蔑。应选择带有 "arrogant"、"proud"、"contempt" 等字样的模型组。
    -   **疑惑情绪**: "咦？这是怎么回事？" -> 情绪: 疑惑, 困惑。应选择带有 "confused"、"puzzled"、"wonder" 等字样的模型组。

## 待处理文本
"${text}"

## 输出格式必须为json
{
  "model_group_index": 选择的模型组索引号（数字）, 
  "ref_audio_index": 选择的参考音频索引号（数字）, 
  "translated_text": "翻译后的文本",
  "emotion": "对所分析文本情绪的简短描述（例如：开心）"
}
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
        temperature: config.temperature ?? 0.3, // 使用配置的温度参数，默认0.3
        maxTokens: config.max_tokens ?? 512, // 使用配置的最大token数，默认512
      });
      logger.debug('输出token: ', result.usage.completionTokens)
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
      let selectionResult: ModelSelectionResponse;

      try {
        selectionResult = JSON.parse(jsonText);
      } catch (parseError) {
        throw new Error(`JSON解析失败: ${parseError}`);
      }

      // 验证响应结构
      if (!selectionResult.model_group_index || !selectionResult.ref_audio_index || 
          !selectionResult.translated_text || !selectionResult.emotion) {
        throw new Error('响应JSON缺少必要的字段');
      }

      // 检查索引映射是否存在
      if (!this.currentIndexMaps) {
        throw new Error('索引映射未初始化');
      }

      // 使用索引映射获取模型组和参考音频路径
      const modelGroup = this.currentIndexMaps.modelGroups.get(selectionResult.model_group_index);
      const refAudioPath = this.currentIndexMaps.refAudio.get(selectionResult.ref_audio_index);

      if (!modelGroup || !refAudioPath) {
        throw new Error('无法通过索引找到对应的文件路径');
      }

      // 使用智能路径匹配验证选择的文件
      const matchedGpt = this.findBestMatchingPath(modelGroup.gpt, scannedFiles.gpt_files);
      const matchedSovits = this.findBestMatchingPath(modelGroup.sovits, scannedFiles.sovits_files);
      const matchedRefAudio = this.findBestMatchingPath(refAudioPath, scannedFiles.ref_audio_files);

      // 构建最终结果
      const finalResult: EmotionRecognitionResult = {
        gpt: matchedGpt || scannedFiles.gpt_files[0] || '',
        sovits: matchedSovits || scannedFiles.sovits_files[0] || '',
        ref_audio: matchedRefAudio || scannedFiles.ref_audio_files[0] || '',
        translated_text: selectionResult.translated_text,
        emotion: selectionResult.emotion
      };

      // 记录匹配信息
      if (matchedGpt && matchedGpt !== modelGroup.gpt) {
        logger.info(`GPT路径匹配: "${modelGroup.gpt}" -> "${matchedGpt}"`);
      }
      if (matchedSovits && matchedSovits !== modelGroup.sovits) {
        logger.info(`SoVITS路径匹配: "${modelGroup.sovits}" -> "${matchedSovits}"`);
      }
      if (matchedRefAudio && matchedRefAudio !== refAudioPath) {
        logger.info(`参考音频路径匹配: "${refAudioPath}" -> "${matchedRefAudio}"`);
      }

      if (!matchedGpt) {
        logger.warn(`无法匹配GPT文件: ${modelGroup.gpt}，使用第一个可用文件`);
      }
      if (!matchedSovits) {
        logger.warn(`无法匹配SoVITS文件: ${modelGroup.sovits}，使用第一个可用文件`);
      }
      if (!matchedRefAudio) {
        logger.warn(`无法匹配参考音频文件: ${refAudioPath}，使用第一个可用文件`);
      }

      logger.info(`[模型选择] ${character}: "${speech}" -> 情绪:${finalResult.emotion}, 翻译:"${finalResult.translated_text}"`);
      
      return finalResult;
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
        temperature: config.temperature ?? 0.3, // 使用配置的温度参数，默认0.3
        maxTokens: config.max_tokens ?? 1000, // 使用配置的最大token数，默认1000
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
