import process from 'process';
import path from 'path';
import { fileURLToPath } from "url";
import fs from 'fs'
import type { VoiceConfig } from './voice/config.js';

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

export const workDir = getWorkDir()

const envPath = path.join(workDir, ".env")
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath)
  console.error(`load env var from ${envPath}`)
}

console.error(`用户工作目录${workDir}`)

if (process.argv.includes('init')) {
  // 将env.example复制到工作目录的.env文件
  if (fs.existsSync(path.join(workDir, '.env'))) {
    console.error(`已存在${workDir}/.env !`)
  } else {
    fs.copyFileSync(path.join(packageRoot, 'env.example'),
      path.join(workDir, '.env'));
    console.error(`已将env.example复制到${workDir}/.env`)
  }
  
  // 创建示例voice.config.json文件
  if (fs.existsSync(path.join(workDir, 'voice.config.json'))) {
    console.error(`已存在${workDir}/voice.config.json !`)
  } else {
      const exampleConfig: VoiceConfig = {
        "volume": 30,
        "gpt_sovits_url": "http://localhost:9872",
        "gpt_sovits_path": "D:\\AIVoice\\GPT-SoVITS-v2pro-20250604",
        "model_version": "v2",
        "translate": {
          "model_type": "ollama",
          "base_url": "http://localhost:11434/api",
          "model_name": "gemma:4b",
          "enabled": true,
          "context_size": 2,
          "additional_prompt":"人名信息：睦，即：むつみ。"
        },
        "characters": [
          {
            "character_name": "sakiko",
            "gpt": "GPT_weights_v2ProPlus\\Mujica_豊川祥子_白_v2pp.ckpt",
            "sovits": "SoVITS_weights_v2ProPlus\\Mujica_豊川祥子_白_v2pp.pth",
            "ref_audio": "D:\\AIVoice\\语音模型\\GPT-SoVITS v2 pro plus\\Mujica\\丰川祥子（白祥）\\(A)あなたと空を見上げるのは、いつも夏でしたわね.wav",
            "ref_text": "あなたと空を見上げるのは、いつも夏でしたわね",
            "prompt": "喜欢说类似'德斯哇'的大小姐语气",
            "translate_to": "日文",
            "inferrence_config": {
              "prompt_language": "日文",
              "text_language": "日文",
              "how_to_cut": "凑四句一切",
              "top_k": 15,
              "top_p": 1.0,
              "temperature": 1.0,
              "speed": 1.0,
              "sample_steps": 8,
              "if_sr": false,
              "pause_second": 0.3
            }
          }
        ]
      }
  
      const configPath = path.join(workDir, 'voice.config.json');
      fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2));
      console.error(`✅ 已创建示例配置文件: ${configPath}`);
  }
  
  process.exit(0)
}



// =============== 配音配置 ===============
export const getVoiceConfig = () => {
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

export const voiceConfig = getVoiceConfig()

// =============== 翻译配置 ===============

export const TranslateTo = process.env.TRANSLATE
export const ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434'