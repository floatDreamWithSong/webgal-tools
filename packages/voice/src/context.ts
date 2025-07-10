import { DialogueChunk } from './compiler.js';

export interface ContextInfo {
  previousDialogues: DialogueChunk[];
  nextDialogues: DialogueChunk[];
  contextText: string;
}

export class ContextExtractor {
  /**
   * 提取对话的上下文信息
   * @param allDialogues 所有对话列表
   * @param currentIndex 当前对话的索引
   * @param contextSize 上下文大小（前后各取多少条对话），默认为2
   * @returns 上下文信息
   */
  static extractContext(
    allDialogues: DialogueChunk[], 
    currentIndex: number, 
    contextSize: number = 2
  ): ContextInfo {
    const previousDialogues: DialogueChunk[] = [];
    const nextDialogues: DialogueChunk[] = [];

    // 提取前面的对话
    const startIndex = Math.max(0, currentIndex - contextSize);
    for (let i = startIndex; i < currentIndex; i++) {
      previousDialogues.push(allDialogues[i]);
    }

    // 提取后面的对话
    const endIndex = Math.min(allDialogues.length, currentIndex + contextSize + 1);
    for (let i = currentIndex + 1; i < endIndex; i++) {
      nextDialogues.push(allDialogues[i]);
    }

    // 构建上下文文本
    const contextText = this.buildContextText(previousDialogues, nextDialogues);

    return {
      previousDialogues,
      nextDialogues,
      contextText
    };
  }

  /**
   * 构建上下文文本描述
   * @param previousDialogues 前面的对话
   * @param nextDialogues 后面的对话
   * @returns 上下文文本
   */
  private static buildContextText(
    previousDialogues: DialogueChunk[], 
    nextDialogues: DialogueChunk[]
  ): string {
    const contextParts: string[] = [];

    if (previousDialogues.length > 0) {
      contextParts.push("前面的对话：");
      previousDialogues.forEach((dialogue, index) => {
        contextParts.push(`${index + 1}. ${dialogue.character}: ${dialogue.text}`);
      });
    }

    if (nextDialogues.length > 0) {
      if (contextParts.length > 0) {
        contextParts.push("");
      }
      contextParts.push("后面的对话：");
      nextDialogues.forEach((dialogue, index) => {
        contextParts.push(`${index + 1}. ${dialogue.character}: ${dialogue.text}`);
      });
    }

    return contextParts.join("\n");
  }

  /**
   * 为翻译任务批量提取上下文
   * @param allDialogues 所有对话列表
   * @param targetDialogues 需要翻译的对话列表
   * @param contextSize 上下文大小
   * @returns 对话索引到上下文的映射
   */
  static extractBatchContext(
    allDialogues: DialogueChunk[],
    targetDialogues: DialogueChunk[],
    contextSize: number = 2
  ): Map<string, ContextInfo> {
    const contextMap = new Map<string, ContextInfo>();

    // 创建对话到索引的映射
    const dialogueIndexMap = new Map<string, number>();
    allDialogues.forEach((dialogue, index) => {
      const key = `${dialogue.character}:${dialogue.text}:${dialogue.lineNumber}`;
      dialogueIndexMap.set(key, index);
    });

    // 为每个目标对话提取上下文
    targetDialogues.forEach(dialogue => {
      const key = `${dialogue.character}:${dialogue.text}:${dialogue.lineNumber}`;
      const index = dialogueIndexMap.get(key);
      
      if (index !== undefined) {
        const context = this.extractContext(allDialogues, index, contextSize);
        contextMap.set(key, context);
      }
    });

    return contextMap;
  }

  /**
   * 智能上下文提取 - 根据对话内容判断是否需要更多上下文
   * @param dialogue 当前对话
   * @param allDialogues 所有对话列表
   * @param currentIndex 当前对话索引
   * @returns 上下文信息
   */
  static smartExtractContext(
    dialogue: DialogueChunk,
    allDialogues: DialogueChunk[],
    currentIndex: number
  ): ContextInfo {
    let contextSize = 2; // 默认上下文大小

    // 检查是否包含代词或指示词，如果有则需要更多上下文
    const needsMoreContext = this.needsMoreContext(dialogue.text);
    if (needsMoreContext) {
      contextSize = 4; // 增加上下文大小
    }

    // 检查是否是对话的开始或结束
    if (currentIndex === 0) {
      // 对话开始，只需要后面的上下文
      contextSize = Math.min(contextSize, 3);
    } else if (currentIndex === allDialogues.length - 1) {
      // 对话结束，只需要前面的上下文
      contextSize = Math.min(contextSize, 3);
    }

    return this.extractContext(allDialogues, currentIndex, contextSize);
  }

  /**
   * 判断对话是否需要更多上下文
   * @param text 对话文本
   * @returns 是否需要更多上下文
   */
  private static needsMoreContext(text: string): boolean {
    // 中文代词和指示词
    const chinesePronouns = [
      '这', '那', '它', '他', '她', '这个', '那个', '这样', '那样',
      '这里', '那里', '刚才', '刚刚', '之前', '刚说', '上面', '前面'
    ];

    // 英文代词和指示词
    const englishPronouns = [
      'this', 'that', 'it', 'he', 'she', 'they', 'them', 'here', 'there',
      'just', 'before', 'earlier', 'above', 'previously'
    ];

    // 日文代词和指示词
    const japanesePronouns = [
      'これ', 'それ', 'あれ', 'ここ', 'そこ', 'あそこ', 'さっき', '先ほど',
      '彼', '彼女', '彼ら', 'この', 'その', 'あの'
    ];

    const allPronouns = [...chinesePronouns, ...englishPronouns, ...japanesePronouns];

    return allPronouns.some(pronoun => text.includes(pronoun));
  }
} 