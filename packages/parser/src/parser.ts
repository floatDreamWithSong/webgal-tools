import fs from 'node:fs';
import { ParsedDialogue, ParsedSceneResult } from './types.js';

function parseSceneScript(absPath: string, characters: string[]): ParsedSceneResult {
  if (!fs.existsSync(absPath)) {
    throw new Error(`Script file not found: ${absPath}`);
  }
  const content = fs.readFileSync(absPath, 'utf-8');
  const lines = content.split('\n');
  const dialogues: ParsedDialogue[] = [];
  const characterSet = new Set(characters.map(name => name.trim()));
  let statementId = 0;

  function isEmptyLine(line: string) {
    return !line || line.trim() === '';
  }

  function parseParams(parts: string[]): { key: string; value: string }[] {
    const params: { key: string; value: string }[] = [];
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith('-')) {
        const arg = trimmed.substring(1);
        const [key, value] = arg.includes('=') ? arg.split('=') : [arg, ''];
        params.push({ key, value });
      }
    }
    return params;
  }

  function parseStatement(statement: string, lineNumber: number): ParsedDialogue | null {
    const cleanStatement = statement.trim().replace(/;$/, '');
    const firstColonIndex = cleanStatement.indexOf(':');
    if (firstColonIndex === -1) return null;
    if (cleanStatement.startsWith(':')) return null;
    const character = cleanStatement.substring(0, firstColonIndex).trim();
    const rightPart = cleanStatement.substring(firstColonIndex + 1);
    if (character.includes('//') || character.includes(';')) return null;
    const parts = rightPart.split(/(?=\s-)/);
    const text = parts[0].trim();
    const params = parseParams(parts.slice(1));
    return {
      character,
      text,
      params,
      lineNumber,
      originalLine: statement,
      id: statementId++,
      statementId: statementId - 1
    };
  }

  let reduce: string | undefined = undefined;
  let startLineNumber = 0;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (isEmptyLine(line)) continue;
    if (!line.includes(';')) {
      if (reduce === undefined) {
        reduce = line + '\n';
        startLineNumber = i + 1;
      } else {
        reduce += line + '\n';
      }
      continue;
    }
    if (line.startsWith(';')) continue;
    if (line.endsWith(';')) {
      if (reduce === undefined) {
        const parsed = parseStatement(line, i + 1);
        if (parsed && characterSet.has(parsed.character)) dialogues.push(parsed);
        continue;
      }
      const parsed = parseStatement(reduce + line, startLineNumber);
      if (parsed && characterSet.has(parsed.character)) dialogues.push(parsed);
      reduce = undefined;
      continue;
    }
    const statementPart = line.split(';')[0];
    if (reduce === undefined) {
      const parsed = parseStatement(statementPart, i + 1);
      if (parsed && characterSet.has(parsed.character)) dialogues.push(parsed);
      continue;
    }
    const parsed = parseStatement(reduce + statementPart, startLineNumber);
    if (parsed && characterSet.has(parsed.character)) dialogues.push(parsed);
    reduce = undefined;
  }
  const uniqueCharacters = Array.from(new Set(dialogues.map(d => d.character)));
  return { dialogues, characters: uniqueCharacters };
}

function applySceneScript(absPath: string, dialogues: ParsedDialogue[]): string {
  // 读取原始内容，保留注释和空行
  const originalContent = fs.readFileSync(absPath, 'utf-8');
  const lines = originalContent.split('\n');
  
  // 创建行号到对话的映射
  const dialogueByLineNumber = new Map<number, ParsedDialogue>();
  for (const d of dialogues) {
    dialogueByLineNumber.set(d.lineNumber, d);
  }
  
  let content = '';
  let reduce: string | undefined = undefined;
  let currentLineNumber = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimLine = line.trim();
    currentLineNumber = i + 1;
    
    if (!trimLine || trimLine === '') {
      content += line + '\n';
      continue;
    }
    
    if (!trimLine.includes(';')) {
      if (reduce === undefined) {
        reduce = line + '\n';
      } else {
        reduce += line + '\n';
      }
      continue;
    }
    
    if (trimLine.startsWith(';')) {
      content += line + '\n';
      continue;
    }
    
    if (trimLine.endsWith(';')) {
      if (reduce === undefined) {
        const d = dialogueByLineNumber.get(currentLineNumber);
        if (d) {
          content += buildStatement(d) + '\n';
        } else {
          content += line + '\n';
        }
        continue;
      }
      const d = dialogueByLineNumber.get(currentLineNumber - (reduce.split('\n').length - 1));
      if (d) {
        content += buildStatement(d) + '\n';
      } else {
        content += reduce + line + '\n';
      }
      reduce = undefined;
      continue;
    }
    
    const statementPart = trimLine.split(';')[0];
    const commentPart = line.substring(line.indexOf(';') + 1);
    
    if (reduce === undefined) {
      const d = dialogueByLineNumber.get(currentLineNumber);
      if (d) {
        content += buildStatement(d) + commentPart + '\n';
      } else {
        content += line + '\n';
      }
      continue;
    }
    
    const d = dialogueByLineNumber.get(currentLineNumber - (reduce.split('\n').length - 1));
    if (d) {
      content += buildStatement(d) + commentPart + '\n';
    } else {
      content += reduce + line + '\n';
    }
    reduce = undefined;
  }
  
  return content;
}

function buildStatement(d: ParsedDialogue): string {
  let s = `${d.character}: ${d.text}`;
  for (const p of d.params) {
    s += ` -${p.key}${p.value ? '=' + p.value : ''}`;
  }
  s += ';';
  return s;
}

export { parseSceneScript, applySceneScript };
