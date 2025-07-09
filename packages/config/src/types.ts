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
  check: boolean;
  context_size: number;
  additional_prompt?: string;
  temperature?: number; // 模型温度参数，控制输出的随机性，范围0-2，默认0.3
  max_tokens?: number; // 最大输出token数，默认512
}

/**
 * 角色配置
 */
export interface CharacterConfig {
  character_name: string;
  auto?: boolean; // 是否启用自动情绪识别，默认为false
  gpt: string; // 当auto=true时为文件夹路径，当auto=false时为文件路径
  sovits: string; // 当auto=true时为文件夹路径，当auto=false时为文件路径
  ref_audio: string; // 当auto=true时为文件夹路径，当auto=false时为文件路径
  ref_text: string;
  prompt?: string;
  translate_to: string;
  inferrence_config: InferrenceConfig;
}

/**
 * 情绪识别结果接口
 */
export interface EmotionRecognitionResult {
  gpt: string; // 选择的GPT模型文件路径
  sovits: string; // 选择的SoVITS模型文件路径
  ref_audio: string; // 选择的参考音频文件路径
  translated_text: string; // 翻译后的文本
  emotion: string; // 识别的情绪，如angry、sad、surprised、neutral等
}

/**
 * AI模型选择响应接口（使用索引）
 */
export interface ModelSelectionResponse {
  model_group_index: number; // 选择的模型组索引号
  ref_audio_index: number; // 选择的参考音频索引号
  translated_text: string; // 翻译后的文本
  emotion: string; // 识别的情绪，如angry、sad、surprised、neutral等
}

/**
 * 扫描到的模型文件信息
 */
export interface ScannedModelFiles {
  gpt_files: string[]; // GPT模型文件路径列表
  sovits_files: string[]; // SoVITS模型文件路径列表
  ref_audio_files: string[]; // 参考音频文件路径列表
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

/**
 * 配置模板
 */
export interface ConfigTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'voice' | 'mcp' | 'all';
  config: VoiceConfig | any;
  createdAt: string;
  updatedAt: string;
}

/**
 * 模板列表项
 */
export interface TemplateListItem {
  id: string;
  name: string;
  description?: string;
  type: 'voice' | 'mcp' | 'all';
  createdAt: string;
  updatedAt: string;
}

/**
 * 保存模板选项
 */
export interface SaveTemplateOptions {
  name: string;
  description?: string;
  type: 'voice' | 'mcp' | 'all';
  config: VoiceConfig | any;
} 