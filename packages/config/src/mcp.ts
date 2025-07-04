import fs from 'fs';
import path from 'path';
import { McpConfig } from './types.js';

let mcpConfig: McpConfig | null = null;

/**
 * 加载MCP配置 - 只支持mcp.config.json格式
 */
export function loadMcpConfig(workDir: string): void {
  const mcpConfigPath = path.join(workDir, 'mcp.config.json');
  
  if (!fs.existsSync(mcpConfigPath)) {
    throw new Error(`MCP配置文件不存在: mcp.config.json\n请运行 'webgal-mcp-server -webgal ${workDir} init' 来创建配置文件`);
  }
  
  try {
    const configContent = fs.readFileSync(mcpConfigPath, 'utf-8');
    const rawConfig = JSON.parse(configContent);
    
    // 基本验证
    if (!rawConfig || typeof rawConfig !== 'object') {
      throw new Error('配置文件格式错误：必须是有效的JSON对象');
    }
    
    if (!rawConfig.directories || typeof rawConfig.directories !== 'object') {
      throw new Error('配置文件缺少 directories 字段或格式错误');
    }
    
    // 验证必需的目录配置
    const requiredDirs = ['background', 'vocal', 'bgm', 'animation', 'video', 'figure'];
    for (const dir of requiredDirs) {
      if (!rawConfig.directories[dir]) {
        throw new Error(`配置文件缺少必需的目录配置: directories.${dir}`);
      }
    }
    
    mcpConfig = rawConfig as McpConfig;
    console.error(`✅ 已加载MCP配置文件: mcp.config.json`);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`解析mcp.config.json失败：JSON格式错误 - ${error.message}`);
    }
    throw error;
  }
}

/**
 * 获取当前的MCP配置
 */
export function getMcpConfig(): McpConfig {
  if (!mcpConfig) {
    throw new Error('MCP配置未加载，请先调用 loadMcpConfig()');
  }
  return mcpConfig;
}

/**
 * 检查MCP配置是否已加载
 */
export function isMcpConfigLoaded(): boolean {
  return mcpConfig !== null;
}

/**
 * 重置MCP配置（用于测试）
 */
export function resetMcpConfig(): void {
  mcpConfig = null;
} 