import { z } from 'zod';

// 环境配置Schema
export const EnvConfigSchema = z.object({
  WEBGAL_WORK_DIR: z.string().optional(),
  WEBGAL_BACKGROUND_DIR: z.string().default('background'),
  WEBGAL_VOCAL_DIR: z.string().default('vocal'),
  WEBGAL_BGM_DIR: z.string().default('bgm'),
  WEBGAL_ANIMATION_DIR: z.string().default('animation'),
  WEBGAL_VIDEO_DIR: z.string().default('video'),
  WEBGAL_FIGURE_DIR: z.string().default('figure'),
  MAX_TRANSLATOR: z.string().transform(val => parseInt(val, 10)).default('3'),
});

// 翻译配置Schema
export const TranslateConfigSchema = z.object({
  model_type: z.enum(['ollama', 'openai', 'anthropic', 'google', 'mistral', 'cohere', 'custom']),
  base_url: z.string(),
  model_name: z.string(),
  api_key: z.string().optional(),
  enabled: z.boolean().default(true),
  context_size: z.number().default(2),
  additional_prompt: z.string().optional(),
});

// 角色推理配置Schema
export const InferenceConfigSchema = z.object({
  prompt_language: z.string().default('日文'),
  text_language: z.string().default('日文'),
  how_to_cut: z.string().default('凑四句一切'),
  top_k: z.number().default(15),
  top_p: z.number().default(1.0),
  temperature: z.number().default(1.0),
  speed: z.number().default(1.0),
  sample_steps: z.number().default(8),
  if_sr: z.boolean().default(false),
  pause_second: z.number().default(0.3),
});

// 角色配置Schema
export const CharacterConfigSchema = z.object({
  character_name: z.string(),
  gpt: z.string(),
  sovits: z.string(),
  ref_audio: z.string(),
  ref_text: z.string(),
  prompt: z.string().optional(),
  translate_to: z.string().default('日文'),
  inferrence_config: InferenceConfigSchema.optional(),
});

// 语音配置Schema
export const VoiceConfigSchema = z.object({
  volume: z.number().default(30),
  gpt_sovits_url: z.string(),
  gpt_sovits_path: z.string(),
  model_version: z.string().default('v2'),
  translate: TranslateConfigSchema.optional(),
  characters: z.array(CharacterConfigSchema).default([]),
});

// 导出类型
export type EnvConfig = z.infer<typeof EnvConfigSchema>;
export type TranslateConfig = z.infer<typeof TranslateConfigSchema>;
export type InferenceConfig = z.infer<typeof InferenceConfigSchema>;
export type CharacterConfig = z.infer<typeof CharacterConfigSchema>;
export type VoiceConfig = z.infer<typeof VoiceConfigSchema>; 