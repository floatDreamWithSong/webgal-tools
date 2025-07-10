export interface ParsedDialogue {
  character: string;
  text: string;
  params: { key: string; value: string }[];
  lineNumber: number;
  originalLine: string;
  id?: number;
  statementId: number;
}

export interface ParsedSceneResult {
  dialogues: ParsedDialogue[];
  characters: string[];
}
