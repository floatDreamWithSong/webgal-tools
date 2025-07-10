import { TranslateConfig } from '@webgal-tools/config'

export interface VoiceConfig {
  volume: number
  gpt_sovits_url: string
  gpt_sovits_path: string
  model_version: string
  max_translator?: number
  translate?: TranslateConfig
  characters: CharacterConfig[]
}


export interface CharacterConfig {
  character_name: string
  auto?: boolean
  gpt: string
  sovits: string
  ref_audio: string
  ref_text: string
  prompt?: string
  translate_to: string
  inferrence_config: InferrenceConfig
}

export interface InferrenceConfig {
  prompt_language: string
  text_language: string
  how_to_cut: string
  top_k: number
  top_p: number
  temperature: number
  speed: number
  sample_steps: number
  if_sr: boolean
  pause_second: number
} 