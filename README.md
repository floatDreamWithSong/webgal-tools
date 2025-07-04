# OpenWebGAL Assistant

这是一个为 [OpenWebGAL](https://github.com/OpenWebGAL/WebGAL) 游戏开发者设计的 AI 工具集。它利用大型语言模型（LLM）的能力，将您从查阅文档、管理资源、编写脚本、制作配音等繁琐重复的工作中解放出来，让您可以更专注于核心的故事与创意。

## 核心组件

本项目包含两个核心工具：

-   **`@webgal-tools/mcp-server`**: 您的 AI 开发助理。它可以回答您的 WebGAL 相关问题、管理游戏资产、辅助创作和修改游戏脚本。
-   **`@webgal-tools/voice`**: 自动化语音生成工具。它可以解析您的游戏脚本，利用 GPT-SoVITS 和多种翻译服务，为您的对话自动生成多语言配音。

## 🚀 快速开始

### 1. 初始化

首次使用时，请在您的项目目录下（或任意您希望存放配置文件的目录）打开终端，运行以下命令来生成配置文件：

```bash
# 初始化 MCP 服务器配置 (用于 AI 助理)
npx @webgal-tools/mcp-server -webgal <你的游戏目录> init

# 初始化语音合成配置
npx @webgal-tools/voice -webgal <你的游戏目录> init
```

-   `<你的游戏目录>`: 您 WebGAL 游戏的根目录路径，例如 `D:/MyGame/game`。
-   命令执行后，将在当前目录下生成 `mcp.config.json` 和 `voice.config.json` 文件。

### 2. 使用工具

#### 启动 AI 助理 (MCP Server)

```bash
# 启动 SSE 服务器模式 (推荐)，用于连接客户端
npx @webgal-tools/mcp-server -webgal <你的游戏目录> --sse

# 您也可以使用 stdio 模式
npx @webgal-tools/mcp-server -webgal <你的游戏目录>
```

服务器启动后，您可以通过兼容 MCP 协议的客户端（如聊天机器人）与其交互。

#### 生成语音

```bash
# 为 scene1.txt 生成语音
npx @webgal-tools/voice -webgal <你的游戏目录> -voice scene1.txt

# 强制重新生成所有语音，忽略缓存
npx @webgal-tools/voice -webgal <你的游戏目录> -voice scene1.txt -force
```

## 🔧 配置

我们采用 JSON 文件进行配置，清晰直观。

### `mcp.config.json`

此文件定义了 AI 助理所需的游戏资源目录。通常使用默认配置即可。

```json
{
  "directories": {
    "background": "background",
    "vocal": "vocal", 
    "bgm": "bgm",
    "animation": "animation",
    "video": "video",
    "figure": "figure"
  }
}
```

### `voice.config.json`

这是语音和翻译功能的核心配置文件。

**配置示例 (使用本地 Ollama 进行翻译):**
```json
{
  "volume": 30,
  "gpt_sovits_url": "http://localhost:9872",
  "gpt_sovits_path": "D:\\AIVoice\\GPT-SoVITS-v2pro-20250604",
  "model_version": "v2",
  "max_translator": 3,
  "translate": {
    "model_type": "ollama",
    "base_url": "http://localhost:11434/api",
    "model_name": "glm4:9b",
    "check": true,
    "context_size": 2,
    "additional_prompt":"人名信息：睦，全名若叶（わかば）睦（むつみ）。学生"
  },
  "characters": [
    {
      "character_name": "Sakiko",
      "gpt": "GPT_weights_v2ProPlus\\Mujica_豊川祥子_白_v2pp.ckpt",
      "sovits": "SoVITS_weights_v2ProPlus\\Mujica_豊川祥子_白_v2pp.pth",
      "ref_audio": "D:\\AIVoice\\语音模型\\GPT-SoVITS v2 pro plus\\Mujica\\丰川祥子（白祥）\\(A)あなたと空を見上げるのは、いつも夏でしたわね.wav",
      "ref_text": "あなたと空を見上げるのは、いつも夏でしたわね",
      "prompt": "说日语喜欢说类似'德斯哇'的大小姐语气，喜欢亲切地叫若叶睦为睦。",
      "translate_to": "日文"
    }
  ]
}
```

**关键配置项:**

*   **全局配置**:
    *   `gpt_sovits_url`: GPT-SoVITS 服务地址。
    *   `gpt_sovits_path`: GPT-SoVITS 项目的本地路径，**模型文件会基于此设置相对路径**。
    *   `max_translator`: 最大翻译并发数，建议 API 为 3-5，本地模型为 1。

*   **翻译配置 (`translate`)**:
    *   `model_type`: 翻译服务类型，支持 `ollama`, `openai`, `anthropic` 等。
    *   `base_url`: API 地址。
    *   `api_key`: (可选) API 密钥。
    *   `model_name`: 使用的具体模型。
    *   `context_size`: 翻译时引用的上下文对话数量。
    *   `additional_prompt`: 全局翻译提示，可用于提供人名对照表等。

*   **角色配置 (`characters` 数组)**:
    *   `character_name`: 角色名，**必须与游戏脚本中的角色名完全一致**。
    *   `translate_to`: 目标翻译语言，若留空则不翻译。
    *   `gpt` / `sovits`: **相对于 `gpt_sovits_path` 的模型文件路径**。
    *   `ref_audio` / `ref_text`: 参考音频及文本。
    *   `prompt`: 角色的语气、风格描述。
    *   `inferrence_config`: (可选) 详细的 GPT-SoVITS 推理参数。

## 🏗️ 项目架构

本项目采用基于 Turborepo 的 Monorepo 架构，实现了功能的模块化和解耦。

```
webgal-mcp/
├── apps/
│   ├── mcp-server/          # MCP服务器应用
│   └── voice/               # 语音合成应用
├── packages/
│   ├── config/              # 统一配置管理包
│   └── logger/              # 统一日志记录包
```

-   **🎯 单一职责**: 每个包专注于特定功能。
-   **🛡️ 封装隔离**: 应用层通过 `config` 包的 API 操作配置，不直接接触文件系统。
-   **🔧 易于维护**: 结构清晰，便于扩展和维护。

## 🧑‍💻 开发指南

如果您想参与贡献或进行二次开发：

1.  **克隆项目**: `git clone https://github.com/your-repo/webgal-mcp.git`
2.  **安装依赖**: `pnpm install`
3.  **启动开发模式**: `pnpm dev` (实时编译)
4.  **构建项目**: `pnpm build`