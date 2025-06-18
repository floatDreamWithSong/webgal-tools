import { getServer } from './server.js'
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main() {
  try {
    const mcpServer = getServer();
    const transport = new StdioServerTransport();
    
    // console.error('WebGAL MCP 文档服务器已启动 (stdio模式)');
    
    await mcpServer.connect(transport);
    
    // 在stdio模式下，服务器会持续运行直到stdio连接关闭
  } catch (error) {
    console.error('启动MCP服务器时发生错误:', error);
    process.exit(1);
  }
}

main();