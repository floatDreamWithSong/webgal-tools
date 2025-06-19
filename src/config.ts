import process, { env } from 'process';
import path from 'path';
import { fileURLToPath } from "url";
import fs from 'fs'

// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< 以下为mcp-server配置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// 使用 import.meta.url 来获取当前文件的URL
const __filename = fileURLToPath(import.meta.url);
// __dirname 是当前文件所在的目录 (e.g., /path/to/project/dist)
const __dirname = path.dirname(__filename);
// packageRoot 是本项目的根目录 (e.g., /path/to/project)
// 因为编译后的文件在 dist 目录中，所以我们需要向上回退一级
const packageRoot = path.resolve(__dirname, '..');

// prompts 目录
export const promptsDir = path.join(packageRoot, 'prompts');
// MCP文档目录
export const docsDir = path.join(packageRoot, 'docs');


// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< 以下为webgal工作目录配置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

const envPath = path.join(process.env.WEBGAL_ENV_DIR || process.cwd(), ".env")
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath)
  console.error(`load env var from ${envPath}`)
}

export const workDir = process.env.WEBGAL_WORK_DIR || process.cwd();
console.error(`用户工作目录${workDir}`)

if (process.argv.includes('init')) {
  // 将env.example复制到工作目录的.env文件
  if(fs.existsSync(path.join(workDir, '.env'))){
    console.error(`已存在${workDir}/.env !`)
    process.exit(1)
  }
  fs.copyFileSync(path.join(packageRoot, 'env.example'),
    path.join(workDir, '.env'));
  console.error(`已将env.example复制到${workDir}/.env`)
  process.exit(0)
}