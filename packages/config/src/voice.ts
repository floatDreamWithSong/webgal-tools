import fs from 'fs';
import path from 'path';
import { VoiceConfigSchema, type VoiceConfig } from './types.js';

let voiceConfig: VoiceConfig | null = null;

export function loadVoiceConfig(workDir: string): VoiceConfig | null {
  if (voiceConfig) {
    return voiceConfig;
  }

  const configPath = path.join(workDir, 'voice.config.json');
  
  if (!fs.existsSync(configPath)) {
    console.warn(`语音配置文件不存在: ${configPath}`);
    return null;
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const rawConfig = JSON.parse(configContent);
    
    // 验证配置
    const result = VoiceConfigSchema.safeParse(rawConfig);
    if (!result.success) {
      throw new Error(`语音配置验证失败: ${result.error.message}`);
    }

    voiceConfig = result.data;
    console.log(`已加载语音配置文件: ${configPath}`);
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