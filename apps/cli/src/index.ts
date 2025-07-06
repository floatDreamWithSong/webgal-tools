#!/usr/bin/env node
import inquirer from 'inquirer';
import { initializeConfig } from "@webgal-tools/config";
import { startMcpServer } from "@webgal-tools/mcp-server";
import { startVoiceService } from "@webgal-tools/voice";
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取版本号
function getVersion(): string {
  try {
    const packagePath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.warn('无法读取版本号，使用默认版本');
    return '1.0.0';
  }
}

// 检查命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options: { mcp?: boolean; workDir?: string } = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-mcp' || args[i] === '--mcp') {
      options.mcp = true;
      options.workDir = args[i + 1];
      i++; // 跳过下一个参数
    }
  }
  return options;
}

async function startMcpStdioMode(workDir: string) {
  console.log(`启动 MCP 服务器 (stdio模式) - 工作目录: ${workDir}`);
  const result = await startMcpServer({ workDir, mode: 'stdio' });
  if (!result.success) {
    console.error('启动MCP服务器失败:', result.error);
    process.exit(1);
  }
  console.log('MCP服务器已启动 (stdio模式)，按 Ctrl+C 退出');
  // 保持进程运行，监听 SIGINT 信号
  process.on('SIGINT', () => {
    console.log('\n正在关闭MCP服务器...');
    process.exit(0);
  });
  // 防止进程意外退出
  process.stdin.resume();
}

async function interactiveMode() {
  const logo = `
 __        __   _                 _     _____           _     
 \\ \\      / /__| |__   __ _  __ _| |   |_   _|__   ___ | |___ 
  \\ \\ /\\ / / _ \\ '_ \\ / _\` |/ _\` | |_____| |/ _ \\ / _ \\| / __|
   \\ V  V /  __/ |_) | (_| | (_| | |_____| | (_) | (_) | \\__ \\
    \\_/\\_/ \\___|_.__/ \\__, |\\__,_|_|     |_|\\___/ \\___/|_|___/
                      |___/                                   
`;
  console.log(logo);
  console.log(`欢迎使用 WebGAL 工具集! 版本v${getVersion()}\n`);
  // 1. 先输入工作目录
  const { workDir } = await inquirer.prompt([
    {
      type: 'input',
      name: 'workDir',
      message: '请输入WebGAL工作目录',
      default: 'game',
    },
  ]);
  // 2. 选择操作
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '请选择要执行的操作',
      choices: [
        { name: '初始化配置文件', value: 'init' },
        { name: '启动 MCP 服务器', value: 'mcp' },
        { name: '启动语音服务', value: 'voice' },
      ],
    },
  ]);
  if (action === 'init') {
    const { initType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'initType',
        message: '请选择要初始化的配置类型',
        choices: [
          { name: '初始化所有配置', value: 'all' },
          { name: '仅初始化 MCP 配置', value: 'mcp' },
          { name: '仅初始化语音配置', value: 'voice' },
        ],
      },
    ]);
    const { force } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'force',
        message: '是否强制覆盖已存在的配置文件?',
        default: false,
      },
    ]);
    let result;
    if (initType === 'all') {
      result = initializeConfig({ workDir, force });
    } else if (initType === 'mcp') {
      result = initializeConfig({ workDir, force, onlyMcp: true });
    } else if (initType === 'voice') {
      result = initializeConfig({ workDir, force, onlyVoice: true });
    } else {
      // 默认情况，虽然理论上不会到达这里
      result = initializeConfig({ workDir, force });
    }
    console.log(`\n📋 初始化结果: ${result.message}\n`);
    if (result.createdFiles.length > 0) {
      console.log('✅ 已创建的文件:');
      result.createdFiles.forEach((file) => console.log(`   - ${file}`));
      console.log('');
    }
    if (result.skippedFiles.length > 0) {
      console.log('⏭️  已跳过的文件:');
      result.skippedFiles.forEach((file) => console.log(`   - ${file}`));
      console.log('');
    }
    if (result.errors.length > 0) {
      console.log('❌ 发生的错误:');
      result.errors.forEach((error) => console.log(`   - ${error}`));
      console.log('');
    }
    if (result.success) {
      if (initType === 'all') {
        console.log('🎉 WebGAL 工具集配置初始化完成！');
      } else if (initType === 'mcp') {
        console.log('🎉 MCP服务器配置初始化完成！');
      } else if (initType === 'voice') {
        console.log('🎉 语音合成配置初始化完成！');
        console.log('💡 提示：请编辑 voice.config.json 文件配置您的语音模型和翻译服务。');
      }
    } else {
      console.log('⚠️  配置初始化过程中遇到了一些问题，请检查上述错误信息。');
    }
    process.exit(result.success ? 0 : 1);
  } else if (action === 'mcp') {
    // 交互式模式下只能选择 SSE 模式
    const { port } = await inquirer.prompt([
      {
        type: 'number',
        name: 'port',
        message: '请输入SSE服务器端口',
        default: 3333,
      },
    ]);
    const result = await startMcpServer({ workDir, mode: 'sse', port });
    if (!result.success) {
      console.error('启动MCP服务器失败:', result.error);
      process.exit(1);
    }
  } else if (action === 'voice') {
    const { scriptFile, forceMode } = await inquirer.prompt([
      {
        type: 'input',
        name: 'scriptFile',
        message: '请输入要处理的脚本文件路径',
      },
      {
        type: 'confirm',
        name: 'forceMode',
        message: '是否强制模式?',
        default: false,
      },
    ]);
    const result = await startVoiceService({ workDir, scriptFile, forceMode });
    if (!result.success) {
      console.error('语音生成失败:', result.error);
      process.exit(1);
    }
    process.exit(0);
  }
}

// 主程序入口
const args = parseArgs();

if (args.mcp) {
  // 命令行模式：直接启动 stdio 模式的 MCP 服务器
  const workDir = args.workDir || process.env.WEBGAL_WORK_DIR || 'game';
  startMcpStdioMode(workDir);
} else {
  // 交互式模式
  interactiveMode();
}