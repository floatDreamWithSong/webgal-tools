#!/usr/bin/env node
import { loadVoiceConfig, getVoiceConfig, getMaxTranslator, initializeConfig } from "@webgal-mcp/config";
import { logger } from "@webgal-mcp/logger";
import { VoiceGenerator } from "./generator.js";

// 获取工作目录
function getWorkDir(): string {
  const webgalIndex = process.argv.findIndex(arg => arg === '-webgal');
  if (webgalIndex === -1 || webgalIndex >= process.argv.length - 1) {
    console.error('错误：未指定工作目录');
    console.error('用法: webgal-voice -webgal <工作目录> <命令>');
    console.error('示例: webgal-voice -webgal ./game init');
    process.exit(1);
  }
  return process.argv[webgalIndex + 1];
}

async function main() {
  const workDir = getWorkDir();
  
  // 功能1：初始化语音配置
  if (process.argv.includes('init')) {
    // 处理帮助参数
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      console.error(`
🚀 WebGAL 语音合成工具初始化

用法:
  webgal-voice -webgal <工作目录> init [选项]

选项:
  -force       强制覆盖已存在的配置文件
  -quiet       静默模式，减少输出信息
  -h, --help    显示此帮助信息

示例:
  # 初始化voice.config.json配置文件
  webgal-voice -webgal ./game init
  
  # 强制覆盖现有配置文件
  webgal-voice -webgal ./game init -force
  
  # 静默模式初始化
  webgal-voice -webgal ./game init -quiet
`);
      process.exit(0);
    }
    
    const forceMode = process.argv.includes('-force');
    const quietMode = process.argv.includes('-quiet');
    
    if (!quietMode) {
      console.error('🚀 开始初始化 WebGAL 语音合成配置...');
    }
    
    // 只初始化voice.config.json文件
    const initResult = initializeConfig({
      workDir,
      force: forceMode,
      onlyVoice: true  // 只初始化语音配置文件
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
        console.error('🎉 语音合成配置初始化完成！');
        console.error('💡 提示：请编辑 voice.config.json 文件配置您的语音模型和翻译服务。');
      } else {
        console.error('⚠️  配置初始化过程中遇到了一些问题，请检查上述错误信息。');
      }
    }
    
    process.exit(initResult.success ? 0 : 1);
  }
  
  // 加载配置
  try {
    loadVoiceConfig(workDir);
    logger.info(`语音合成工作目录: ${workDir}`);
  } catch (error) {
    logger.error('配置加载失败:', error);
    process.exit(1);
  }

  // 语音合成功能
  const voiceConfig = getVoiceConfig();
  if (voiceConfig && process.argv.includes('-voice')) {
    const voiceIndex = process.argv.findIndex(arg => arg === '-voice');
    const inputScript = voiceIndex > -1 && voiceIndex < process.argv.length - 1 
      ? process.argv[voiceIndex + 1] 
      : '';
    
    if (!inputScript) {
      console.error('错误：请指定要处理的脚本文件');
      console.error('');
      console.error('用法: webgal-voice -webgal <工作目录> -voice <脚本文件>');
      console.error('示例: webgal-voice -webgal ./game -voice input.txt');
      process.exit(1);
    }
    
    const forceMode = process.argv.includes('-force');
    
    logger.info('启动语音生成模式...');
    logger.info(`输入脚本: ${inputScript}`);
    if (forceMode) {
      logger.info('⚡ 强制模式已启用');
    }
    
    const generator = new VoiceGenerator(workDir);
    try {
      await generator.generateVoice(inputScript, forceMode);
      logger.info('语音生成完成！');
      process.exit(0);
    } catch (error) {
      logger.error('语音生成失败:', error);
      process.exit(1);
    }
  }

  // 如果没有指定语音生成，显示帮助信息
  console.error(`
🎵 WebGAL 语音合成工具

用法:
  webgal-voice -webgal <工作目录> <命令> [选项]

命令:
  init                    初始化语音配置文件
  -voice <脚本文件>      为指定脚本生成语音

选项:
  -force                 强制重新生成所有语音（忽略缓存）
  -h, --help            显示帮助信息

示例:
  # 初始化语音配置
  webgal-voice -webgal ./game init
  
  # 为脚本生成语音
  webgal-voice -webgal ./game -voice scene1.txt
  
  # 强制重新生成所有语音
  webgal-voice -webgal ./game -voice scene1.txt -force
`);
  process.exit(1);
}

main(); 