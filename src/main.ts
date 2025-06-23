#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./server/index.js";
import { packageRoot, voiceConfig, workDir } from "./config.js";
import { VoiceGenerator } from "./voice/generator.js";
import fs from 'fs'
import path from "path";
import { logger } from "./logger.js";

async function main() {
  // 功能1：初始化游戏项目
  if (process.argv.includes('init')) {
    // 将env.example复制到工作目录的.env文件
    if (fs.existsSync(path.join(workDir, '.env'))) {
      console.error(`已存在${workDir}/.env !`)
    } else {
      fs.copyFileSync(path.join(packageRoot, 'env.example'),
        path.join(workDir, '.env'));
      console.error(`已将env.example复制到${workDir}/.env`)
    }
    
    // 复制 voice.config.json 文件
    const voiceConfigTarget = path.join(workDir, 'voice.config.json');
    if (fs.existsSync(voiceConfigTarget)) {
      console.error(`已存在 ${voiceConfigTarget} !`)
    } else {
      fs.copyFileSync(path.join(packageRoot, 'voice.config.json'), voiceConfigTarget);
      console.error(`✅ 已复制 voice.config.json 到 ${voiceConfigTarget}`)
    }
    
    process.exit(0)
  }
  // 语音合成接入
  if (voiceConfig) {
    logger.info('启动语音生成模式...');
    logger.info(`输入脚本: ${voiceConfig.inputScript}`);
    if (voiceConfig.forceMode) {
      logger.info('⚡ 强制模式已启用');
    }
    const generator = new VoiceGenerator();
    try {
      await generator.generateVoice(voiceConfig.inputScript, voiceConfig.forceMode);
      logger.info('语音生成完成！');
      process.exit(0);
    } catch (error) {
      logger.error('语音生成失败:', error);
      process.exit(1);
    }
  }
  // MCP服务器模式
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