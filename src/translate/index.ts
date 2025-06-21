import fetch from 'node-fetch';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

/**
 * 角色语言特色配置
 * TODO: 这个可以从配置文件或数据库中读取
 */
const characterStyles = new Map<string, string>([
  ['default', '保持角色原有的语言风格和语气']
]);

/**
 * 获取角色的语言特色
 * @param character 角色名
 * @returns 角色语言特色描述
 */
function getCharacterStyle(character: string): string {
  return characterStyles.get(character) || characterStyles.get('default') || '保持自然的语言风格';
}

/**
 * 构建翻译的系统提示词
 * @param character 角色名
 * @param targetLanguage 目标语言
 * @param context 上下文信息
 * @param additionalPrompt 用户自定义的额外提示词
 * @returns 系统提示词
 */
function buildTranslatePrompt(character: string, targetLanguage: string, context?: string, additionalPrompt?: string): string {
  const characterStyle = getCharacterStyle(character);
  
  let prompt = `你是一个专业的翻译助手，专门负责将游戏对话翻译成${targetLanguage}。

规则：
1. 只输出翻译后的内容，不要包含任何解释、注释或额外文字
2. 保持原文的情感色彩和语气，但是也可以结合上下文理解对话的含义和情境进行合理少量扩展
3. 角色${character}的人物特色：${characterStyle}
4. 翻译要自然流畅，符合${targetLanguage}的表达习惯
5. 保持原文的长度适中，避免过长或过短
`;

  // 添加用户自定义的额外提示词信息
  if (additionalPrompt) {
    prompt += `

额外信息：
${additionalPrompt}`;
  }

  if (context) {
    prompt += `

上下文信息：
${context}

请根据上述信息翻译以下对话：`;
  } else {
    prompt += `

请翻译以下内容：`;
  }

  return prompt;
}

import { TranslateConfig } from '../voice/config.js';

/**
 * 调用Ollama API进行翻译
 * @param character 角色名
 * @param speech 对话内容
 * @param targetLanguage 目标语言
 * @param config 翻译配置
 * @param context 上下文信息
 * @returns 翻译后的内容
 */
export async function translate(character: string, speech: string, targetLanguage: string, config: TranslateConfig, context?: string): Promise<string> {
  if (!targetLanguage) {
    throw new Error('Translation target language not provided.');
  }

  try {
    const systemPrompt = buildTranslatePrompt(character, targetLanguage, context, config.additional_prompt);
    const fullPrompt = `${systemPrompt}\n\n"${speech}"`;

    const response = await fetch(`${config.ollama_endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model_name,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.3, // 较低的温度以获得更一致的翻译
          top_p: 0.9,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as OllamaResponse;
    
    if (!data.response) {
      throw new Error('Empty response from Ollama API');
    }

    // 清理响应内容，移除可能的引号和多余空白
    let translatedText = data.response.trim();
    
    // 移除开头和结尾的引号
    if ((translatedText.startsWith('"') && translatedText.endsWith('"')) ||
        (translatedText.startsWith('"') && translatedText.endsWith('"'))) {
      translatedText = translatedText.slice(1, -1);
    }
    if(translatedText.includes('<think>')){
      // 输出的思考内容移除
      translatedText = (translatedText.split('</think>')[1] ?? '').trim()
    }

    const hasAdditionalInfo = context || config.additional_prompt;
    if (hasAdditionalInfo) {
      console.error(`[翻译+增强] ${character}: "${speech}" -> "${translatedText}"`);
    } else {
      console.error(`[翻译] ${character}: "${speech}" -> "${translatedText}"`);
    }
    
    return translatedText;
  } catch (error) {
    console.error(`Translation failed for character ${character}:`, error);
    // 如果翻译失败，返回原文
    console.error(`Falling back to original text: "${speech}"`);
    return speech;
  }
}

/**
 * 批量翻译对话
 * @param dialogues 对话数组，格式为 [[角色名, 对话内容, 音频文件名, 目标语言], ...]
 * @param config 翻译配置
 * @returns 翻译后的对话数组
 */
export async function batchTranslate(dialogues: [string, string, string, string][], config: TranslateConfig): Promise<[string, string, string][]> {
  const results: [string, string, string][] = [];
  
  // 按角色分组以提高效率
  const groupedByCharacter = new Map<string, Array<{ index: number, dialogue: [string, string, string, string] }>>();
  
  dialogues.forEach((dialogue, index) => {
    const character = dialogue[0];
    if (!groupedByCharacter.has(character)) {
      groupedByCharacter.set(character, []);
    }
    groupedByCharacter.get(character)!.push({ index, dialogue });
  });

  // 为每个角色依次处理翻译
  for (const [character, items] of groupedByCharacter) {
    console.error(`开始翻译角色 ${character} 的对话，共 ${items.length} 条...`);
    
    for (const item of items) {
      const [charName, speech, audioFile, targetLanguage] = item.dialogue;
      const translatedSpeech = await translate(charName, speech, targetLanguage, config);
      results[item.index] = [charName, translatedSpeech, audioFile];
      
      // 添加小延迟避免API请求过快
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * 设置角色语言特色
 * @param character 角色名
 * @param style 语言特色描述
 */
export function setCharacterStyle(character: string, style: string): void {
  characterStyles.set(character, style);
}

/**
 * 检查Ollama服务是否可用
 * @param endpoint Ollama服务端点
 * @returns 是否可用
 */
export async function checkTranslatorService(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${endpoint}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}
