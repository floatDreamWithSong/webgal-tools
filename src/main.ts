#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./server/index.js";
import { voiceConfig } from "./config.js";
import { VoiceGenerator } from "./voice/generator.js";

async function main() {
  try {
    // 检查是否是语音模式
    if (voiceConfig) {
      console.error('启动语音生成模式...');
      console.error(`输入脚本: ${voiceConfig.inputScript}`);
      if (voiceConfig.forceMode) {
        console.error('⚡ 强制模式已启用');
      }

      const generator = new VoiceGenerator();
      
      try {
        await generator.generateVoice(voiceConfig.inputScript, voiceConfig.forceMode);
        console.error('语音生成完成！');
        process.exit(0);
      } catch (error) {
        console.error('语音生成失败:', error);
        process.exit(1);
      }
    }

    // 默认MCP服务器模式
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