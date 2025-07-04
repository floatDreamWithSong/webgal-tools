import { config } from 'dotenv';
import path from 'path';
import { EnvConfigSchema, type EnvConfig } from './types.js';

let envConfig: EnvConfig | null = null;

export function loadEnvConfig(workDir?: string): EnvConfig {
  if (envConfig) {
    return envConfig;
  }

  // 如果提供了工作目录，尝试加载该目录下的.env文件
  if (workDir) {
    const envPath = path.join(workDir, '.env');
    try {
      config({ path: envPath });
      console.log(`已加载环境变量文件: ${envPath}`);
    } catch (error) {
      console.warn(`无法加载环境变量文件: ${envPath}`);
    }
  }

  // 解析环境变量
  const rawConfig = {
    WEBGAL_WORK_DIR: workDir || process.env.WEBGAL_WORK_DIR,
    WEBGAL_BACKGROUND_DIR: process.env.WEBGAL_BACKGROUND_DIR,
    WEBGAL_VOCAL_DIR: process.env.WEBGAL_VOCAL_DIR,
    WEBGAL_BGM_DIR: process.env.WEBGAL_BGM_DIR,
    WEBGAL_ANIMATION_DIR: process.env.WEBGAL_ANIMATION_DIR,
    WEBGAL_VIDEO_DIR: process.env.WEBGAL_VIDEO_DIR,
    WEBGAL_FIGURE_DIR: process.env.WEBGAL_FIGURE_DIR,
    MAX_TRANSLATOR: process.env.MAX_TRANSLATOR,
  };

  // 验证配置
  const result = EnvConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    throw new Error(`环境配置验证失败: ${result.error.message}`);
  }

  envConfig = result.data;
  return envConfig;
}

export function getEnvConfig(): EnvConfig {
  if (!envConfig) {
    throw new Error('环境配置未加载，请先调用 loadEnvConfig()');
  }
  return envConfig;
}

export function resetEnvConfig(): void {
  envConfig = null;
} 