import process from 'process';
import path from 'path';
import { fileURLToPath } from "url";

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

export const workDir = process.env.WEBGAL_WORK_DIR || process.cwd();
console.error(`用户工作目录${workDir}`)
