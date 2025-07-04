// WebGAL MCP配置类型定义
// 只支持JSON配置格式，废弃环境变量方式

/**
 * MCP配置JSON格式
 */
export interface McpConfig {
  directories: {
    background: string;
    vocal: string;
    bgm: string;
    animation: string;
    video: string;
    figure: string;
  };
}

/**
 * 语音配置JSON格式
 */
export interface VoiceConfig {
  volume: number;
  gpt_sovits_url: string;
  gpt_sovits_path: string;
  model_version: string;
  max_translator?: number; // 最大翻译并发数
  translate?: TranslateConfig;
  characters: CharacterConfig[];
}

/**
 * 翻译服务配置
 */
export interface TranslateConfig {
  model_type: 'openai' | 'anthropic' | 'google' | 'mistral' | 'cohere' | 'ollama' | 'custom';
  base_url: string;
  api_key?: string;
  model_name: string;
  enabled: boolean;
  context_size: number;
  additional_prompt?: string;
}

/**
 * 角色配置
 */
export interface CharacterConfig {
  character_name: string;
  gpt: string;
  sovits: string;
  ref_audio: string;
  ref_text: string;
  prompt?: string;
  translate_to: string;
  inferrence_config: InferrenceConfig;
}

/**
 * 语音推理配置
 */
export interface InferrenceConfig {
  prompt_language: string;
  text_language: string;
  how_to_cut: string;
  top_k: number;
  top_p: number;
  temperature: number;
  speed: number;
  sample_steps: number;
  if_sr: boolean;
  pause_second: number;
} 