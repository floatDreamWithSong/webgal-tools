import fs from 'fs';

export interface DialogueChunk {
  character: string;
  text: string;
  audioFile?: string;
  volume?: string;
  lineNumber: number;
  originalLine: string;
  id?: number; // 添加可选的id字段来区分重复对话
  statementId: number; // 语句ID，用于跟踪语句在文档中的位置
  otherArgs: string[]; // 其他参数
}

interface ParsedStatement {
  character: string;
  text: string;
  audioFile?: string;
  volume?: string;
  statementId: number;
  otherArgs: string[];
  originalStatement: string;
  lineNumber: number;
}

export class WebGALScriptCompiler {
  /**
   * 检查是否为空行
   * @param line 行内容
   * @returns 是否为空行
   */
  private static isEmptyLine(line: string): boolean {
    return !line || line.trim() === '';
  }

  /**
   * 解析WebGAL脚本内容为语句数组
   * @param content 脚本内容
   * @returns 语句数组及其行号信息
   */
  private static parseStatements(content: string): Array<{statement: string, lineNumber: number}> {
    const lines = content.split('\n');
    const statements: Array<{statement: string, lineNumber: number}> = [];
    let reduce: string | undefined = undefined;
    let startLineNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      line = line.trim();
      
      if (this.isEmptyLine(line)) {
        // 忽略空白行
        continue;
      }
      
      // 本行未结束（不包含分号）
      if (!line.includes(';')) {
        if (reduce === undefined) {
          reduce = line + '\n';
          startLineNumber = i + 1;
        } else {
          reduce += line + '\n';
        }
        continue;
      }
      
      // 一行注释（以分号开头）
      if (line.startsWith(';')) {
        continue;
      }
      
      if (line.endsWith(';')) {
        // 单行语句
        if (reduce === undefined) {
          statements.push({
            statement: line,
            lineNumber: i + 1
          });
          continue;
        }
        // 多行语句
        statements.push({
          statement: reduce + line,
          lineNumber: startLineNumber
        });
        reduce = undefined;
        continue;
      }
      
      // 语句末尾带有注释，例如 A: text ; 注释
      const statementPart = line.split(';')[0];
      
      // 单行语句
      if (reduce === undefined) {
        statements.push({
          statement: statementPart,
          lineNumber: i + 1
        });
        continue;
      }
      
      // 多行语句
      statements.push({
        statement: reduce + statementPart,
        lineNumber: startLineNumber
      });
      reduce = undefined;
    }

    return statements;
  }

  /**
   * 解析单个语句
   * @param statement 语句内容
   * @param statementId 语句ID
   * @param lineNumber 行号
   * @returns 解析结果
   */
  private static parseStatement(statement: string, statementId: number, lineNumber: number): ParsedStatement | null {
    // 清理语句，移除末尾的分号
    const cleanStatement = statement.trim().replace(/;$/, '');
    
    const firstColonIndex = cleanStatement.indexOf(':');
    
    // 无效语句（没有冒号）
    if (firstColonIndex === -1) {
      return null;
    }
    
    // 旁白，不处理（以冒号开头）
    if (cleanStatement.startsWith(':')) {
      return null;
    }

    const character = cleanStatement.substring(0, firstColonIndex).trim();
    const rightPart = cleanStatement.substring(firstColonIndex + 1);
    
    // 检查角色名是否有效（不能包含注释标记）
    if (character.includes('//') || character.includes(';')) {
      return null;
    }
    
    // 按'-'分割参数，但保留文本中的内容
    const parts = rightPart.split(/(?=\s-)/); // 按照空格+减号分割
    const text = parts[0].trim();
    
    let audioFile: string | undefined;
    let volume: string | undefined;
    const otherArgs: string[] = [];
    
    // 解析参数（从第二部分开始）
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part.startsWith('-')) continue;
      
      const arg = part.substring(1); // 移除开头的减号
      
      // 检测音频文件参数（以.wav结尾）
      if (arg.endsWith('.wav')) {
        audioFile = arg;
      }
      // 检测音量参数（volume=数字）
      else if (arg.startsWith('volume=')) {
        const volumeMatch = arg.match(/^volume=(\d+)$/);
        if (volumeMatch) {
          volume = volumeMatch[1];
        }
      }
      // 其他参数
      else {
        otherArgs.push(arg);
      }
    }

    return {
      character,
      text,
      audioFile,
      volume,
      statementId,
      otherArgs,
      originalStatement: statement,
      lineNumber
    };
  }

  /**
   * 解析WebGAL脚本文件，提取对话内容
   * @param filePath 脚本文件路径
   * @param configuredCharacters 配置文件中定义的角色名列表
   * @returns 对话块数组
   */
  static parseScript(filePath: string, configuredCharacters: string[]): DialogueChunk[] {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Script file not found: ${filePath}`);
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const statements = this.parseStatements(content);
    const dialogues: DialogueChunk[] = [];

    // 创建角色名的集合，用于快速查找
    const characterSet = new Set(configuredCharacters.map(name => name.trim()));

    for (let i = 0; i < statements.length; i++) {
      const { statement, lineNumber } = statements[i];
      const parsed = this.parseStatement(statement, i, lineNumber);
      
      if (!parsed) {
        continue;
      }

      const { character, text, audioFile, volume, statementId, otherArgs, originalStatement } = parsed;

      // 只处理配置文件中定义的角色
      if (characterSet.has(character)) {
        dialogues.push({
          character,
          text,
          audioFile,
          volume,
          lineNumber,
          originalLine: originalStatement,
          statementId,
          otherArgs,
          id: statementId // 使用语句ID作为唯一标识
        });
      } else {
        console.error(`跳过未配置的角色: ${character}`);
      }
    }

    return dialogues;
  }

  /**
   * 应用语句修改
   * @param statementId 语句ID
   * @param modifiedDialogue 修改后的对话信息
   * @returns 应用后的语句字符串
   */
  private static applyStatement(modifiedDialogue: DialogueChunk): string {
    let statement = `${modifiedDialogue.character}: ${modifiedDialogue.text}`;
    
    if (modifiedDialogue.audioFile) {
      statement += ` -${modifiedDialogue.audioFile}`;
    }
    
    if (modifiedDialogue.volume) {
      statement += ` -volume=${modifiedDialogue.volume}`;
    }
    
    // 添加其他参数
    if (modifiedDialogue.otherArgs && modifiedDialogue.otherArgs.length > 0) {
      for (const arg of modifiedDialogue.otherArgs) {
        statement += ` -${arg}`;
      }
    }
    
    statement += ';';
    return statement;
  }

  /**
   * 重新构建脚本内容（按照编译规则.md的应用思路）
   * @param filePath 原始脚本文件路径
   * @param newDialogues 新的对话块数组
   * @returns 新的脚本内容
   */
  static rebuildScript(filePath: string, newDialogues: DialogueChunk[]): string {
    const originalContent = fs.readFileSync(filePath, 'utf-8');
    const lines = originalContent.split('\n');
    
    // 创建语句ID到对话映射
    const dialogueByStatementId = new Map<number, DialogueChunk>();
    for (const dialogue of newDialogues) {
      if (dialogue.statementId !== undefined) {
        dialogueByStatementId.set(dialogue.statementId, dialogue);
      }
    }

    let content = '';
    let statementCount = 0;
    let reduce: string | undefined = undefined;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const originalLine = line;
      line = line.trim();
      
      if (this.isEmptyLine(line)) {
        content += originalLine + '\n';
        continue;
      }
      
      // 本行未结束
      if (!line.includes(';')) {
        if (reduce === undefined) {
          reduce = originalLine + '\n';
        } else {
          reduce += originalLine + '\n';
        }
        continue;
      }
      
      // 一行注释
      if (line.startsWith(';')) {
        content += originalLine + '\n';
        continue;
      }
      
      if (line.endsWith(';')) {
        // 单行语句
        if (reduce === undefined) {
          const modifiedDialogue = dialogueByStatementId.get(statementCount);
          if (modifiedDialogue) {
            content += this.applyStatement(modifiedDialogue) + '\n';
          } else {
            content += originalLine + '\n';
          }
          statementCount++;
          continue;
        }
        // 多行语句
        const modifiedDialogue = dialogueByStatementId.get(statementCount);
        if (modifiedDialogue) {
          content += this.applyStatement(modifiedDialogue) + '\n';
        } else {
          content += reduce + originalLine + '\n';
        }
        reduce = undefined;
        statementCount++;
        continue;
      }
      
      // 语句末尾带有注释，例如 A: text ; 注释
      const statementPart = line.split(';')[0];
      const commentPart = originalLine.substring(originalLine.indexOf(';')+1);
      
      // 单行语句
      if (reduce === undefined) {
        const modifiedDialogue = dialogueByStatementId.get(statementCount);
        if (modifiedDialogue) {
          content += this.applyStatement(modifiedDialogue) + commentPart + '\n';
        } else {
          content += originalLine + '\n';
        }
        statementCount++;
        continue;
      }
      
      // 多行语句
      const modifiedDialogue = dialogueByStatementId.get(statementCount);
      if (modifiedDialogue) {
        content += this.applyStatement(modifiedDialogue) + commentPart + '\n';
      } else {
        content += reduce + originalLine + '\n';
      }
      reduce = undefined;
      statementCount++;
    }

    return content;
  }

  /**
   * 从对话块数组中生成键值对映射
   * @param dialogues 对话块数组
   * @returns 映射表 {角色名+对话: 音频文件名}
   */
  static generateDialogueMap(dialogues: DialogueChunk[]): Map<string, string> {
    const map = new Map<string, string>();

    for (const dialogue of dialogues) {
      const key = `${dialogue.character}:${dialogue.text}`;
      const audioFile = dialogue.audioFile || '';
      map.set(key, audioFile);
    }

    return map;
  }

  /**
   * 获取所有唯一的角色名
   * @param dialogues 对话块数组
   * @returns 角色名数组
   */
  static getUniqueCharacters(dialogues: DialogueChunk[]): string[] {
    const characters = new Set<string>();
    for (const dialogue of dialogues) {
      characters.add(dialogue.character);
    }
    return Array.from(characters);
  }

  /**
   * 按角色分组对话
   * @param dialogues 对话块数组
   * @returns 按角色分组的对话映射
   */
  static groupDialoguesByCharacter(dialogues: DialogueChunk[]): Map<string, DialogueChunk[]> {
    const grouped = new Map<string, DialogueChunk[]>();

    for (const dialogue of dialogues) {
      if (!grouped.has(dialogue.character)) {
        grouped.set(dialogue.character, []);
      }
      grouped.get(dialogue.character)!.push(dialogue);
    }

    return grouped;
  }
} 