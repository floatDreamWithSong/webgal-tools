import fs from 'fs';
import path from 'path';
import { VoiceConfig } from './types.js';

let voiceConfig: VoiceConfig | null = null;

export function loadVoiceConfig(workDir: string): VoiceConfig | null {
  if (voiceConfig) {
    return voiceConfig;
  }

  const configPath = path.join(workDir, 'voice.config.json');
  
  if (!fs.existsSync(configPath)) {
    console.error(`语音配置文件不存在: voice.config.json`);
    return null;
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const rawConfig = JSON.parse(configContent);
    
    // 基本验证
    if (!rawConfig || typeof rawConfig !== 'object') {
      throw new Error('配置文件格式错误');
    }

    voiceConfig = rawConfig as VoiceConfig;
    console.error(`已加载语音配置文件: voice.config.json`);
    return voiceConfig;
  } catch (error) {
    throw new Error(`加载语音配置失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function getVoiceConfig(): VoiceConfig | null {
  return voiceConfig;
}

export function resetVoiceConfig(): void {
  voiceConfig = null;
}

export function hasVoiceConfig(): boolean {
  return voiceConfig !== null;
}

/**
 * 获取最大翻译器并发数
 * 从voice.config.json的max_translator字段读取，默认值为3
 */
export function getMaxTranslator(): number {
  if (voiceConfig && typeof voiceConfig.max_translator === 'number') {
    return voiceConfig.max_translator;
  }
  
  // 如果配置未加载或未设置，返回默认值
  return 3;
} 