#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./server/index.js";

async function main() {
  try {
    const mcpServer = server;
    const transport = new StdioServerTransport();
    // 使用error输出，避免占用stdio
    console.error('WebGAL MCP 文档服务器已启动 (stdio模式)');
    
    await mcpServer.connect(transport);
    
    // 在stdio模式下，服务器会持续运行直到stdio连接关闭
  } catch (error) {
    console.error('启动MCP服务器时发生错误:', error);
    process.exit(1);
  }
}

main();