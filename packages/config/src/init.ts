import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import templateManager from './templates.js';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 修改路径解析，确保在编译后能正确找到example目录
const exampleDir = path.resolve(__dirname, '../example');

export interface InitOptions {
  workDir: string;
  force?: boolean; // 是否强制覆盖已存在的文件
  onlyVoice?: boolean; // 只初始化voice.config.json文件
  onlyMcp?: boolean; // 只初始化mcp.config.json文件
  templateId?: string; // 使用指定的模板ID
  // 移除 onlyEnv 和 preferJson，因为我们不再支持.env
}

export interface InitResult {
  success: boolean;
  message: string;
  createdFiles: string[];
  skippedFiles: string[];
  errors: string[];
}

/**
 * 初始化配置文件到指定的工作目录
 */
export function initializeConfig(options: InitOptions): InitResult {
  let { workDir, force = false, onlyVoice = false, onlyMcp = false, templateId } = options;
  if(!path.isAbsolute(workDir)){
    workDir = path.resolve(process.cwd(), workDir);
  }
  if(!fs.existsSync(workDir)){
    return {
      success: false,
      message: `工作目录不存在: ${workDir}`,
      createdFiles: [],
      skippedFiles: [],
      errors: [`工作目录不存在: ${workDir}`]
    };
  }
  const result: InitResult = {
    success: true,
    message: '',
    createdFiles: [],
    skippedFiles: [],
    errors: []
  };

  try {
    // 确保工作目录存在
    if (!fs.existsSync(workDir)) {
      fs.mkdirSync(workDir, { recursive: true });
    }

    // 定义要复制的配置文件（只支持JSON格式）
    const allConfigFiles = [
      {
        source: path.join(exampleDir, 'mcp.config.json'),
        target: path.join(workDir, 'mcp.config.json'),
        description: 'MCP配置文件',
        type: 'mcp'
      },
      {
        source: path.join(exampleDir, 'voice.config.json'),
        target: path.join(workDir, 'voice.config.json'),
        description: '语音配置文件',
        type: 'voice'
      }
    ];

    // 根据选项过滤配置文件
    let configFiles = allConfigFiles;
    if (onlyVoice) {
      configFiles = allConfigFiles.filter(f => f.type === 'voice');
    } else if (onlyMcp) {
      configFiles = allConfigFiles.filter(f => f.type === 'mcp');
    }
    // 默认初始化所有JSON配置文件

    // 如果指定了模板，先处理模板
    if (templateId) {
      const template = templateManager.getTemplate(templateId);
      if (!template) {
        result.errors.push(`模板不存在: ${templateId}`);
        result.success = false;
      } else {
        // 根据模板类型和初始化选项决定要处理的配置
        const shouldProcessVoice = (onlyVoice || (!onlyVoice && !onlyMcp)) && 
          (template.type === 'voice' || template.type === 'all');
        const shouldProcessMcp = (onlyMcp || (!onlyVoice && !onlyMcp)) && 
          (template.type === 'mcp' || template.type === 'all');

        if (shouldProcessVoice && template.config) {
          const voiceConfigPath = path.join(workDir, 'voice.config.json');
          if (!fs.existsSync(voiceConfigPath) || force) {
            try {
              fs.writeFileSync(voiceConfigPath, JSON.stringify(template.config, null, 2));
              result.createdFiles.push(`语音配置文件: ${voiceConfigPath} (使用模板: ${template.name})`);
            } catch (error) {
              const errorMsg = `使用模板创建语音配置文件失败: ${error instanceof Error ? error.message : String(error)}`;
              result.errors.push(errorMsg);
              result.success = false;
            }
          } else {
            result.skippedFiles.push(`语音配置文件: ${voiceConfigPath} (文件已存在)`);
          }
        }

        if (shouldProcessMcp && template.config) {
          const mcpConfigPath = path.join(workDir, 'mcp.config.json');
          if (!fs.existsSync(mcpConfigPath) || force) {
            try {
              fs.writeFileSync(mcpConfigPath, JSON.stringify(template.config, null, 2));
              result.createdFiles.push(`MCP配置文件: ${mcpConfigPath} (使用模板: ${template.name})`);
            } catch (error) {
              const errorMsg = `使用模板创建MCP配置文件失败: ${error instanceof Error ? error.message : String(error)}`;
              result.errors.push(errorMsg);
              result.success = false;
            }
          } else {
            result.skippedFiles.push(`MCP配置文件: ${mcpConfigPath} (文件已存在)`);
          }
        }

        // 如果使用了模板，跳过默认的复制逻辑
        if (result.createdFiles.length > 0 || result.skippedFiles.length > 0) {
          // 生成结果消息
          if (result.success && result.errors.length === 0) {
            result.message = `使用模板 "${template.name}" 初始化配置文件完成`;
          } else if (result.createdFiles.length > 0 && result.errors.length > 0) {
            result.message = `使用模板 "${template.name}" 部分初始化配置文件完成，但存在一些错误`;
          } else if (result.errors.length > 0) {
            result.message = `使用模板 "${template.name}" 初始化配置文件失败`;
            result.success = false;
          } else {
            result.message = `使用模板 "${template.name}" 初始化配置文件完成，所有文件已存在`;
          }
          return result;
        }
      }
    } else {
      // 如果没有指定模板，使用内置模板
      const builtinTemplate = templateManager.getBuiltinTemplate();
      if (builtinTemplate && (onlyVoice || (!onlyVoice && !onlyMcp))) {
        const voiceConfigPath = path.join(workDir, 'voice.config.json');
        if (!fs.existsSync(voiceConfigPath) || force) {
          try {
            fs.writeFileSync(voiceConfigPath, JSON.stringify(builtinTemplate, null, 2));
            result.createdFiles.push(`语音配置文件: ${voiceConfigPath} (使用内置模板)`);
          } catch (error) {
            const errorMsg = `使用内置模板创建语音配置文件失败: ${error instanceof Error ? error.message : String(error)}`;
            result.errors.push(errorMsg);
            result.success = false;
          }
        } else {
          result.skippedFiles.push(`语音配置文件: ${voiceConfigPath} (文件已存在)`);
        }
      }
      
      // 如果使用了内置模板，生成结果消息
      if (result.createdFiles.length > 0 || result.skippedFiles.length > 0) {
        if (result.success && result.errors.length === 0) {
          result.message = `使用内置模板初始化配置文件完成`;
        } else if (result.createdFiles.length > 0 && result.errors.length > 0) {
          result.message = `使用内置模板部分初始化配置文件完成，但存在一些错误`;
        } else if (result.errors.length > 0) {
          result.message = `使用内置模板初始化配置文件失败`;
          result.success = false;
        } else {
          result.message = `使用内置模板初始化配置文件完成，所有文件已存在`;
        }
        return result;
      }
    }

    // 复制配置文件
    for (const configFile of configFiles) {
      try {
        if (fs.existsSync(configFile.target) && !force) {
          result.skippedFiles.push(`${configFile.description}: ${configFile.target} (文件已存在)`);
          continue;
        }

        if (!fs.existsSync(configFile.source)) {
          result.errors.push(`源文件不存在: ${configFile.source}`);
          result.success = false;
          continue;
        }

        fs.copyFileSync(configFile.source, configFile.target);
        result.createdFiles.push(`${configFile.description}: ${configFile.target}`);
      } catch (error) {
        const errorMsg = `复制 ${configFile.description} 失败: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        result.success = false;
      }
    }

    // 生成结果消息
    if (result.success && result.errors.length === 0) {
      result.message = '配置文件初始化完成';
    } else if (result.createdFiles.length > 0 && result.errors.length > 0) {
      result.message = '配置文件部分初始化完成，但存在一些错误';
    } else if (result.errors.length > 0) {
      result.message = '配置文件初始化失败';
      result.success = false;
    } else {
      result.message = '所有配置文件已存在，无需初始化';
    }

  } catch (error) {
    result.success = false;
    result.message = `初始化过程发生错误: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(result.message);
  }

  return result;
}

/**
 * 检查配置文件是否存在
 */
export function checkConfigFiles(workDir: string): {
  envExists: boolean;
  voiceConfigExists: boolean;
  allExists: boolean;
} {
  const envPath = path.join(workDir, '.env');
  const voiceConfigPath = path.join(workDir, 'voice.config.json');
  
  const envExists = fs.existsSync(envPath);
  const voiceConfigExists = fs.existsSync(voiceConfigPath);
  
  return {
    envExists,
    voiceConfigExists,
    allExists: envExists && voiceConfigExists
  };
}

/**
 * 获取示例配置文件的路径
 */
export function getExampleConfigPaths(): {
  envExample: string;
  voiceConfigExample: string;
} {
  return {
    envExample: path.join(exampleDir, '.env.example'),
    voiceConfigExample: path.join(exampleDir, 'voice.config.json')
  };
} 