import process from 'process';
import path from 'path';
import { fileURLToPath } from "url";
import fs from 'fs'
import { config } from 'dotenv';

// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< 基础配置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

const getWorkDir = () => {
  if (process.env.WEBGAL_WORK_DIR) {
    return process.env.WEBGAL_WORK_DIR;
  }
  const _w_index = process.argv.findIndex((v) => v === '-webgal')
  if (_w_index === -1) {
    console.error("未设置工作目录,请选择其中一种方式：\n1. 暴露环境变量WEBGAL_WORK_DIR=你的game目录\n2. 启动时添加参数 -webgal <工作目录>")
    process.exit(2)
  }

  if (_w_index >= process.argv.length || !process.argv[_w_index + 1]) {
    console.error("-webgal 参数用法： -webgal <工作目录>")
    process.exit(2)
  }
  return process.argv[_w_index + 1];
}
// 使用 import.meta.url 来获取当前文件的URL
const __filename = fileURLToPath(import.meta.url);
// __dirname 是当前文件所在的目录
const __dirname = path.dirname(__filename);
// packageRoot 是本项目的根目录
// 因为编译后的文件在 dist 目录中，所以我们需要向上回退一级
export const packageRoot = path.resolve(__dirname, '..');
// 用户工作目录
export const workDir = getWorkDir()

console.error(`用户工作目录${workDir}`)

// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< mcp-server配置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// prompts 目录
export const promptsDir = path.join(packageRoot, 'prompts');
// MCP文档目录
export const docsDir = path.join(packageRoot, 'docs');

// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< 以下为语音合成配置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

const initVoiceConfig = () => {
  const _v_index = process.argv.findIndex((v) => v === '-voice')
  if (_v_index === -1) {
    return null
  }

  if (_v_index >= process.argv.length - 1 || !process.argv[_v_index + 1]) {
    console.error("-voice 参数用法： -voice <input_webgal_script> [-force]")
    process.exit(2)
  }
  
  const forceMode = process.argv.includes('-force')
  
  return {
    inputScript: process.argv[_v_index + 1],
    forceMode
  }
}

export const voiceConfig = initVoiceConfig()

// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< 导出工具 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// 加载工作目录的.env文件
export const loadWorkDirEnv = (workDir: string): void => {
  const envPath = path.join(workDir, ".env")
  if (fs.existsSync(envPath)) {
    config({
      path:envPath
    })
    console.error(`已加载环境变量文件: ${envPath}`)
  }
}

loadWorkDirEnv(workDir);