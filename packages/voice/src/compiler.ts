import { parseSceneScript, applySceneScript } from '@webgal-tools/parser';

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

export class WebGALScriptCompiler {
  static parseScript(filePath: string, configuredCharacters: string[]): DialogueChunk[] {
    const parsedResult = parseSceneScript(filePath, configuredCharacters);
    return parsedResult.dialogues.map(d => ({
      character: d.character,
      text: d.text,
      audioFile: d.params.find(p => p.key.endsWith('.wav'))?.key,
      volume: d.params.find(p => p.key === 'volume')?.value,
      lineNumber: d.lineNumber,
      originalLine: d.originalLine,
      id: d.id,
      statementId: d.statementId,
      otherArgs: d.params.filter(p => p.key !== 'volume' && !p.key.endsWith('.wav')).map(p => p.key + (p.value ? '=' + p.value : ''))
    }));
  }

  static rebuildScript(filePath: string, newDialogues: DialogueChunk[]): string {
    return applySceneScript(filePath, newDialogues.map(d => ({
      character: d.character,
      text: d.text,
      params: [
        ...(d.audioFile ? [{ key: d.audioFile, value: '' }] : []),
        ...(d.volume ? [{ key: 'volume', value: d.volume }] : []),
        ...((d.otherArgs || []).map(arg => {
          const [key, value] = arg.includes('=') ? arg.split('=') : [arg, ''];
          return { key, value };
        }))
      ],
      lineNumber: d.lineNumber,
      originalLine: d.originalLine,
      id: d.id,
      statementId: d.statementId
    })));
  }
}
