import { initializeConfig, checkConfigFiles } from './init.js';

export interface CLIOptions {
  workDir: string;
  force?: boolean;
  quiet?: boolean;
}

export function printUsage(): void {
  console.error(`
🚀 WebGAL 配置初始化工具

用法:
  init [选项]

选项:
  --force       强制覆盖已存在的配置文件
  --quiet       静默模式，减少输出信息
  -h, --help    显示此帮助信息

示例:
  # 初始化配置文件
  init
  
  # 强制覆盖现有配置文件
  init --force
  
  # 静默模式初始化
  init --quiet
`);
}

/**
 * 检查配置状态并提供用户友好的输出
 */
export function checkAndReportConfigStatus(workDir: string): boolean {
  const status = checkConfigFiles(workDir);
  
  if (status.allExists) {
    console.error('✅ 所有配置文件已存在：');
    console.error(`   - 环境变量配置: ${workDir}/.env`);
    console.error(`   - 语音配置: ${workDir}/voice.config.json`);
    return true;
  } else {
    console.error('⚠️  配置文件状态：');
    console.error(`   - 环境变量配置: ${status.envExists ? '✅ 存在' : '❌ 缺失'}`);
    console.error(`   - 语音配置: ${status.voiceConfigExists ? '✅ 存在' : '❌ 缺失'}`);
    return false;
  }
}

/**
 * 运行配置初始化CLI
 */
export function runConfigInitCLI(options: CLIOptions): number {
  const { workDir, force = false, quiet = false } = options;
  
  if (!quiet) {
    console.error('🚀 开始初始化 WebGAL 项目配置...\n');
  }
  
  // 如果不是强制模式，先检查现有配置
  if (!force && !quiet) {
    const allExists = checkAndReportConfigStatus(workDir);
    if (allExists) {
      console.error('\n💡 提示：所有配置文件已存在。如需重新初始化，请使用 --force 参数。');
      return 0;
    }
    console.error('\n继续初始化缺失的配置文件...\n');
  }
  
  const initResult = initializeConfig({
    workDir,
    force
  });
  
  if (!quiet) {
    // 输出详细结果
    console.error(`📋 初始化结果: ${initResult.message}\n`);
    
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
      console.error('🎉 项目初始化完成！你现在可以编辑配置文件并开始使用 WebGAL MCP 服务器。');
      if (force) {
        console.error('💡 提示：使用了 --force 参数，已覆盖现有配置文件。');
      } else {
        console.error('💡 提示：如需覆盖现有配置文件，请使用 --force 参数。');
      }
    } else {
      console.error('⚠️  项目初始化过程中遇到了一些问题，请检查上述错误信息。');
    }
  }
  
  return initResult.success ? 0 : 1;
} 