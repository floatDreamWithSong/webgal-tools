#!/usr/bin/env node
import { reloadVoiceConfig, getVoiceConfig } from "@webgal-tools/config";
import { logger } from "@webgal-tools/logger";
import { VoiceGenerator } from "./generator.js";
import { translateService } from "./translate/index.js";

export interface VoiceOptions {
  workDir: string;
  scriptFile: string;
  forceMode?: boolean;
}

export interface VoiceResult {
  success: boolean;
  error?: string;
}

/**
 * 启动语音合成服务
 * @param options 语音合成配置选项
 * @returns 执行结果
 */
export async function startVoiceService(options: VoiceOptions): Promise<VoiceResult> {
  try {
    // 强制重新加载配置，清除缓存
    reloadVoiceConfig(options.workDir);
    
    // 清除翻译服务的模型缓存，确保新配置生效
    translateService.clearCache();
    
    logger.info(`语音合成工作目录: ${options.workDir}`);
    
    const voiceConfig = getVoiceConfig();
    if (!voiceConfig) {
      return { success: false, error: '语音配置加载失败' };
    }
    
    logger.info('启动语音生成模式...');
    logger.info(`输入脚本: ${options.scriptFile}`);
    if (options.forceMode) {
      logger.info('⚡ 强制模式已启用');
    }
    
    const generator = new VoiceGenerator(options.workDir);
    await generator.generateVoice(options.scriptFile, options.forceMode || false);
    logger.info('语音生成完成！');
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('语音生成失败:', error);
    return { success: false, error: errorMessage };
  }
} 