#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server, setWorkDir } from "./server/index.js";
import { loadMcpConfig } from "@webgal-tools/config";
import { logger } from "@webgal-tools/logger";
import { startSSEServer } from "./server/sse.js";

export interface McpServerOptions {
  workDir: string;
  mode: 'stdio' | 'sse';
  port?: number;
}

export interface McpServerResult {
  success: boolean;
  error?: string;
}

/**
 * 启动MCP服务器
 * @param options 服务器配置选项
 * @returns 启动结果
 */
export async function startMcpServer(options: McpServerOptions): Promise<McpServerResult> {
  try {
    // 设置全局工作目录
    setWorkDir(options.workDir);
    
    // 加载配置
    loadMcpConfig(options.workDir);
    logger.info(`MCP服务器工作目录: ${options.workDir}`);
    
    if (options.mode === 'sse') {
      const port = options.port || 3333;
      await startSSEServer(port);
      return { success: true };
    } else {
      // MCP服务器模式 (stdio)
      const mcpServer = server;
      const transport = new StdioServerTransport();
      logger.info('WebGAL MCP 服务器已启动 (stdio模式)');
      await mcpServer.connect(transport);
      return { success: true };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('启动MCP服务器时发生错误:', error);
    return { success: false, error: errorMessage };
  }
} 