import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseSceneScript, applySceneScript } from '@webgal-tools/parser/src/parser';

const testScript = `A:你好 -audio1.wav -volume=80;
B: 世界 -audio2.wav;
; 这是注释
C: 测试 -flag;
`;

describe('scene parser', () => {
  const tempFile = path.join(__dirname, 'temp_scene.txt');
  const realScriptFile = path.join(__dirname, 'static', 'test-script.txt');
  
  beforeAll(() => {
    fs.writeFileSync(tempFile, testScript, 'utf-8');
  });
  
  afterAll(() => {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

  it('should parse scene script', () => {
    const result = parseSceneScript(tempFile, ['A', 'B', 'C']);
    expect(result.dialogues.length).toBe(3);
    expect(result.dialogues[0].character).toBe('A');
    expect(result.dialogues[0].params[0]).toEqual({ key: 'audio1.wav', value: '' });
    expect(result.dialogues[0].params[1]).toEqual({ key: 'volume', value: '80' });
    expect(result.dialogues[1].character).toBe('B');
    expect(result.dialogues[2].character).toBe('C');
    expect(result.characters).toEqual(['A', 'B', 'C']);
  });

  it('should apply scene script', () => {
    const result = parseSceneScript(tempFile, ['A', 'B', 'C']);
    const newContent = applySceneScript(tempFile, result.dialogues);
    expect(newContent).toContain('A: 你好 -audio1.wav -volume=80;');
    expect(newContent).toContain('B: 世界 -audio2.wav;');
    expect(newContent).toContain('C: 测试 -flag;');
    expect(newContent).toContain('; 这是注释');
  });

  it('should parse real script file', () => {
    const result = parseSceneScript(realScriptFile, ['三角初华']);
    expect(result.dialogues.length).toBeGreaterThan(0);
    expect(result.characters).toContain('三角初华');
    
    // 验证第一个对话
    const firstDialogue = result.dialogues[0];
    expect(firstDialogue.character).toBe('三角初华');
    expect(firstDialogue.text).toBe('『这是...什么？』');
    expect(firstDialogue.params.some(p => p.key === '三角初华_5ddb5808fe27.wav')).toBe(true);
    expect(firstDialogue.params.some(p => p.key === 'volume' && p.value === '30')).toBe(true);
    expect(firstDialogue.params.some(p => p.key === 'center')).toBe(true);
  });

  it('should maintain consistency after parse-apply-parse cycle', () => {
    // 第一次解析
    const originalResult = parseSceneScript(realScriptFile, ['三角初华']);
    const originalDialogues = originalResult.dialogues;
    
    // 应用修改（这里不做实际修改，只是重新生成脚本）
    const appliedContent = applySceneScript(realScriptFile, originalDialogues);
    
    // 将应用后的内容写入临时文件
    const tempAppliedFile = path.join(__dirname, 'static/temp_applied.txt');
    fs.writeFileSync(tempAppliedFile, appliedContent, 'utf-8');
    
    try {
      // 第二次解析
      const secondResult = parseSceneScript(tempAppliedFile, ['三角初华']);
      const secondDialogues = secondResult.dialogues;
      
      // 验证两次解析结果一致
      expect(secondDialogues.length).toBe(originalDialogues.length);
      
      // 验证每个对话的关键字段一致
      for (let i = 0; i < originalDialogues.length; i++) {
        const original = originalDialogues[i];
        const second = secondDialogues[i];
        
        expect(second.character).toBe(original.character);
        expect(second.text).toBe(original.text);
        expect(second.params.length).toBe(original.params.length);
        
        // 验证参数一致
        for (let j = 0; j < original.params.length; j++) {
          expect(second.params[j].key).toBe(original.params[j].key);
          expect(second.params[j].value).toBe(original.params[j].value);
        }
      }
      
      // 验证角色列表一致
      expect(secondResult.characters).toEqual(originalResult.characters);
      
    } finally {
      // 清理临时文件
      if (fs.existsSync(tempAppliedFile)) {
        fs.unlinkSync(tempAppliedFile);
      }
    }
  });

  it('should handle complex parameters correctly', () => {
    const result = parseSceneScript(realScriptFile, ['三角初华']);
    
    // 查找包含复杂参数的对话
    const dialogueWithComplexParams = result.dialogues.find(d => 
      d.params.some(p => p.key.includes('.wav') && p.value === '')
    );
    
    expect(dialogueWithComplexParams).toBeDefined();
    expect(dialogueWithComplexParams!.params.some(p => p.key === 'volume')).toBe(true);
    expect(dialogueWithComplexParams!.params.some(p => p.key === 'center')).toBe(true);
  });

  it('should write parse and apply results to files', () => {
    // 解析真实脚本文件
    const parseResult = parseSceneScript(realScriptFile, ['三角初华']);
    
    // 将解析结果写入 JSON 文件
    const parseResultFile = path.join(__dirname, 'static/parse-result.json');
    fs.writeFileSync(parseResultFile, JSON.stringify(parseResult, null, 2), 'utf-8');
    console.log(`解析结果已写入: ${parseResultFile}`);
    
    // 应用解析结果，重建脚本
    const appliedContent = applySceneScript(realScriptFile, parseResult.dialogues);
    
    // 将应用结果写入文件
    const appliedResultFile = path.join(__dirname, 'static/applied-result.txt');
    fs.writeFileSync(appliedResultFile, appliedContent, 'utf-8');
    console.log(`应用结果已写入: ${appliedResultFile}`);
    
    // 验证文件写入成功
    expect(fs.existsSync(parseResultFile)).toBe(true);
    expect(fs.existsSync(appliedResultFile)).toBe(true);
    
    // 验证解析结果文件内容
    const savedParseResult = JSON.parse(fs.readFileSync(parseResultFile, 'utf-8'));
    expect(savedParseResult.dialogues.length).toBe(parseResult.dialogues.length);
    expect(savedParseResult.characters).toEqual(parseResult.characters);
    
    // 验证应用结果文件内容
    const savedAppliedContent = fs.readFileSync(appliedResultFile, 'utf-8');
    expect(savedAppliedContent).toContain('三角初华');
    expect(savedAppliedContent).toContain('『这是...什么？』');
    
    console.log(`解析到 ${parseResult.dialogues.length} 个对话`);
    console.log(`涉及角色: ${parseResult.characters.join(', ')}`);
    console.log(`应用结果文件大小: ${savedAppliedContent.length} 字符`);
  });
});
