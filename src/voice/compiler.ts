import fs from 'fs';
import path from 'path';

export interface DialogueChunk {
  character: string;
  text: string;
  audioFile?: string;
  volume?: string;
  lineNumber: number;
  originalLine: string;
}

export class WebGALScriptCompiler {
  /**
   * 解析WebGAL脚本内容，提取对话内容
   * @param content 脚本内容字符串
   * @param configuredCharacters 配置文件中定义的角色名列表
   * @returns 对话块数组
   */
  static parseScriptContent(content: string, configuredCharacters: string[]): DialogueChunk[] {
    const lines = content.split('\n');
    const dialogues: DialogueChunk[] = [];

    // 创建角色名的集合，用于快速查找
    const characterSet = new Set(configuredCharacters.map(name => name.trim()));

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('//') || line.startsWith('#')) {
        continue; // 跳过空行和注释
      }

      // 匹配对话格式：角色名:对话内容 [-音频文件] [-volume=音量]
      const dialogueMatch = line.match(/^([^:]+):\s*(.+?)\s*(?:-([^-\s]+\.wav))?\s*(?:-volume=(\d+))?;?\s*$/);
      
      if (dialogueMatch) {
        const [, character, text, audioFile, volume] = dialogueMatch;
        const characterName = character.trim();
        
        // 只处理配置文件中定义的角色
        if (characterSet.has(characterName)) {
          dialogues.push({
            character: characterName,
            text: text.trim(),
            audioFile: audioFile?.trim(),
            volume: volume?.trim(),
            lineNumber: i + 1,
            originalLine: line
          });
        } else {
          console.error(`跳过未配置的角色: ${characterName}`);
        }
      }
    }

    return dialogues;
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
    const lines = content.split('\n');
    const dialogues: DialogueChunk[] = [];

    // 创建角色名的集合，用于快速查找
    const characterSet = new Set(configuredCharacters.map(name => name.trim()));

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('//') || line.startsWith('#')) {
        continue; // 跳过空行和注释
      }

      // 匹配对话格式：角色名:对话内容 [-音频文件] [-volume=音量]
      const dialogueMatch = line.match(/^([^:]+):\s*(.+?)\s*(?:-([^-\s]+\.wav))?\s*(?:-volume=(\d+))?;?\s*$/);
      
      if (dialogueMatch) {
        const [, character, text, audioFile, volume] = dialogueMatch;
        const characterName = character.trim();
        
        // 只处理配置文件中定义的角色
        if (characterSet.has(characterName)) {
          dialogues.push({
            character: characterName,
            text: text.trim(),
            audioFile: audioFile?.trim(),
            volume: volume?.trim(),
            lineNumber: i + 1,
            originalLine: line
          });
        } else {
          console.error(`跳过未配置的角色: ${characterName}`);
        }
      }
    }

    return dialogues;
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
   * 重新构建脚本内容
   * @param filePath 原始脚本文件路径
   * @param newDialogues 新的对话块数组
   * @returns 新的脚本内容
   */
  static rebuildScript(filePath: string, newDialogues: DialogueChunk[]): string {
    const originalContent = fs.readFileSync(filePath, 'utf-8');
    const originalLines = originalContent.split('\n');
    const newLines = [...originalLines];

    // 创建对话块的行号映射
    const dialogueByLine = new Map<number, DialogueChunk>();
    for (const dialogue of newDialogues) {
      dialogueByLine.set(dialogue.lineNumber - 1, dialogue);
    }

    // 更新对话行
    for (let i = 0; i < newLines.length; i++) {
      const dialogue = dialogueByLine.get(i);
      if (dialogue) {
        let newLine = `${dialogue.character}:${dialogue.text}`;
        
        if (dialogue.audioFile) {
          newLine += ` -${dialogue.audioFile}`;
        }
        
        if (dialogue.volume) {
          newLine += ` -volume=${dialogue.volume}`;
        }
        
        newLine += ';';
        newLines[i] = newLine;
      }
    }

    return newLines.join('\n');
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