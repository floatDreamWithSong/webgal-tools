#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./server/index.js";
import { loadMcpConfig, runConfigInitCLI } from "@webgal-mcp/config";
import { logger } from "@webgal-mcp/logger";
import { startSSEServer } from "./server/sse.js";

// 获取工作目录
function getWorkDir(): string {
  const webgalIndex = process.argv.findIndex(arg => arg === '-webgal');
  if (webgalIndex === -1 || webgalIndex >= process.argv.length - 1) {
    console.error('错误：未指定工作目录');
    console.error('用法: webgal-mcp-server -webgal <工作目录> [命令]');
    console.error('示例: webgal-mcp-server -webgal ./game');
    process.exit(1);
  }
  return process.argv[webgalIndex + 1];
}

async function main() {
  const workDir = getWorkDir();
  
  // 功能1：初始化游戏项目
  if (process.argv.includes('init')) {
    // 处理帮助参数
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      const { printUsage } = await import('@webgal-mcp/config');
      printUsage();
      process.exit(0);
    }
    
    const forceMode = process.argv.includes('--force');
    const quietMode = process.argv.includes('--quiet');
    
    const exitCode = runConfigInitCLI({
      workDir,
      force: forceMode,
      quiet: quietMode
    });
    
    process.exit(exitCode);
  }
  
  // 加载MCP配置（运行时需要）
  try {
    loadMcpConfig(workDir);
    logger.info(`MCP服务器工作目录: ${workDir}`);
  } catch (error) {
    logger.error('配置加载失败:', error);
    console.error('提示：请运行 init 命令创建配置文件');
    process.exit(1);
  }

  // 功能2：SSE服务器模式
  if (process.argv.includes('--sse') || process.argv.includes('-s')) {
    // 获取端口参数
    const portIndex = process.argv.findIndex(arg => arg === '--port' || arg === '-p');
    const port = portIndex > -1 && portIndex < process.argv.length - 1 
      ? parseInt(process.argv[portIndex + 1]) 
      : 3333;
    
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error('错误：端口必须是1-65535之间的数字');
      process.exit(1);
    }
    
    try {
      await startSSEServer(port);
      // SSE服务器会持续运行，直到进程被终止
    } catch (error) {
      console.error('启动SSE服务器失败:', error);
      process.exit(1);
    }
    return;
  }

  // MCP服务器模式 (stdio - 默认)
  try {
    const mcpServer = server;
    const transport = new StdioServerTransport();
    // 使用error输出，避免占用stdio
    console.error('WebGAL MCP 文档服务器已启动 (stdio模式)');
    console.error('提示：使用 --sse 或 -s 参数启动SSE服务器模式');
    await mcpServer.connect(transport);
    // 在stdio模式下，服务器会持续运行直到stdio连接关闭
  } catch (error) {
    console.error('启动MCP服务器时发生错误:', error);
    process.exit(1);
  }
}

main(); 