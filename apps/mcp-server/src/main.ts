#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server, setWorkDir } from "./server/index.js";
import { loadMcpConfig, runConfigInitCLI, printUsage } from "@webgal-tools/config";
import { logger } from "@webgal-tools/logger";
import { startSSEServer } from "./server/sse.js";

// 获取工作目录
function getWorkDir(): string {
  const webgalIndex = process.argv.findIndex(arg => arg === '-webgal');
  if (webgalIndex === -1 || webgalIndex >= process.argv.length - 1) {
    if (!process.env.WEBGAL_WORK_DIR) {
      console.error('未设置工作目录,请选择其中一种方式：');
      console.error('1. 暴露环境变量WEBGAL_WORK_DIR=你的game目录');
      console.error('2. 启动时添加参数 -webgal <工作目录>');
      process.exit(1);
    }
    return process.env.WEBGAL_WORK_DIR;
  }
  return process.argv[webgalIndex + 1];
}

async function main() {
  const workDir = getWorkDir();
  
  // 设置全局工作目录
  setWorkDir(workDir);
  
  // 功能1：初始化游戏项目（只初始化.env文件）
  if (process.argv.includes('init')) {
    // 处理帮助参数
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      console.error(`
🚀 WebGAL MCP服务器初始化工具

用法:
  webgal-mcp-server -webgal <工作目录> init [选项]

选项:
  -force       强制覆盖已存在的配置文件
  -quiet       静默模式，减少输出信息
  -h, --help    显示此帮助信息

示例:
  # 初始化mcp.config.json配置文件
  webgal-mcp-server -webgal ./game init
  
  # 强制覆盖现有配置文件
  webgal-mcp-server -webgal ./game init -force
  
  # 静默模式初始化
  webgal-mcp-server -webgal ./game init -quiet

配置文件说明:
  使用 mcp.config.json 进行配置，清晰直观，便于维护
`);
      process.exit(0);
    }
    
    const forceMode = process.argv.includes('-force');
    const quietMode = process.argv.includes('-quiet');
    
    if (!quietMode) {
      console.error('🚀 开始初始化 WebGAL MCP服务器配置...');
    }
    
    // 只初始化mcp.config.json文件
    const { initializeConfig } = await import('@webgal-tools/config');
    const initResult = initializeConfig({
      workDir,
      force: forceMode,
      onlyMcp: true  // 只初始化mcp.config.json
    });
    
    if (!quietMode) {
      console.error(`\n📋 初始化结果: ${initResult.message}\n`);
      
      if (initResult.createdFiles.length > 0) {
        console.error('✅ 已创建的文件:');
        initResult.createdFiles.forEach((file: string) => console.error(`   - ${file}`));
        console.error('');
      }
      
      if (initResult.skippedFiles.length > 0) {
        console.error('⏭️  已跳过的文件:');
        initResult.skippedFiles.forEach((file: string) => console.error(`   - ${file}`));
        console.error('');
      }
      
      if (initResult.errors.length > 0) {
        console.error('❌ 发生的错误:');
        initResult.errors.forEach((error: string) => console.error(`   - ${error}`));
        console.error('');
      }
      
      if (initResult.success) {
        console.error('🎉 MCP服务器配置初始化完成！');
      } else {
        console.error('⚠️  配置初始化过程中遇到了一些问题，请检查上述错误信息。');
      }
    }
    
    process.exit(initResult.success ? 0 : 1);
  }
  
  // 加载配置（支持mcp.config.json或.env）
  try {
    loadMcpConfig(workDir);
    logger.info(`MCP服务器工作目录: ${workDir}`);
  } catch (error) {
    logger.error('配置加载失败:', error);
    process.exit(1);
  }
  
  // 功能2：SSE服务器模式
  if (process.argv.includes('--sse') || process.argv.includes('-sse')) {
    // 获取端口参数
    const portIndex = process.argv.findIndex(arg => arg === '--port' || arg === '-port');
    const port = portIndex > -1 && portIndex < process.argv.length - 1 
      ? parseInt(process.argv[portIndex + 1]) 
      : 3333; // 默认端口改为3333
    
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
    console.error('WebGAL MCP 服务器已启动 (stdio模式)');
    console.error('提示：使用 --sse 或 -sse 参数启动SSE服务器模式');
    await mcpServer.connect(transport);
    // 在stdio模式下，服务器会持续运行直到stdio连接关闭
  } catch (error) {
    console.error('启动MCP服务器时发生错误:', error);
    process.exit(1);
  }
}

main(); 