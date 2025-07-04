# webgalTools

这是一个为 [OpenWebGAL](https://github.com/OpenWebGAL/WebGAL) 游戏开发者设计的工具集。

## 核心组件

本项目包含两个核心工具：

-   **`@webgal-tools/voice`**: 自动化语音生成工具。它可以解析您的游戏脚本，利用 GPT-SoVITS 和可选的自定义翻译服务，为您的对话自动生成多语言配音。
-   **`@webgal-tools/mcp-server`**: MCPServer。接入这个Mcp的大模型将作为 WebGAL脚本专家 、了解您的游戏资产、辅助创作和修改游戏脚本。

---

## 🎵 1. 语音合成 (Voice Synthesis)

### 功能概述

语音合成是本工具集的核心功能，能够：

- **自动解析剧本**：识别游戏脚本中的对话内容
- **智能翻译**：支持多种翻译服务（Ollama、OpenAI、Anthropic等）
- **配音**：基于 GPT-SoVITS 生成自然语音
- **智能缓存合并**：相同对话自动复用音频文件，大幅提升效率
- **多语言支持**：为不同角色个性化配置说话特色

### 快速开始

#### 1. 初始化配置

```bash
# 初始化语音合成配置
npx @webgal-tools/voice -webgal <你的游戏目录> init
```

-   `<你的游戏目录>`: 您 WebGAL 游戏的根目录路径，例如 `D:/MyGame/game`
-   命令执行后，将在当前目录下生成 `voice.config.json` 文件

#### 2. 配置语音合成

**重要**: 初始化后，请务必打开 `voice.config.json` 文件，根据您自己的 GPT-SoVITS 路径和模型等信息，修改其中的配置。

**配置示例 (使用本地 Ollama 进行翻译):**
```json
{
  "volume": 30, // 统一角色音量大小
  "gpt_sovits_url": "http://localhost:9872", // 一般来说GPT-Sovits项目默认就是这个url
  "gpt_sovits_path": "D:/AIVoice/GPT-SoVITS-v2pro-20250604", // 你的GPT-Sovits项目的根目录
  "model_version": "v2", // 你要使用的GPT-Sovits版本
  "max_translator": 1, // 本地模型建议为1，云端服务可以适当增大
  "translate": {
    "model_type": "ollama", // 模型服务提供商
    "base_url": "http://localhost:11434/api", // 模型服务地址，现在展示的是本地ollama模型的
    "model_name": "gemma3n:e4b", // 模型名称，本地模型的话推荐使用这个模型或者e2b，显存消耗小，日语翻译能力有提升
    "check": true, // 是否在翻译前校验模型的可用性，可开可不开，如果你完全不需要翻译功能，请设置为false
    "context_size": 2, // 将对话上下文附近的n行内容加入上下文，可能提升翻译质量
    "additional_prompt":"人名信息：睦，全名若叶（わかば）睦（むつみ）。学生" // 全局prompt，将作为翻译模型的上下文信息，可不设置
  },
  "characters": [
    {
      "character_name": "Sakiko", // 角色名称，即Webgal脚本的冒号之前的角色名称
      "gpt": "GPT_weights_v2ProPlus/Mujica_豊川祥子_白_v2pp.ckpt", // 权重模型相对GPT根目录的路径
      "sovits": "SoVITS_weights_v2ProPlus/Mujica_豊川祥子_白_v2pp.pth", // // 权重模型相对GPT根目录的路径
      "ref_audio": "D:/AIVoice/语音模型/GPT-SoVITS v2 pro plus/Mujica/丰川祥子（白祥）/(A)あなたと空を見上げるのは、いつも夏でしたわね.wav", // 参考音频
      "ref_text": "あなたと空を見上げるのは、いつも夏でしたわね", // 参考音频的文本
      "prompt": "说日语喜欢说类似'德斯哇'的大小姐语气，喜欢亲切地叫若叶睦为睦。", // 角色特点，仅当当前角色进行翻译时会被使用，可以不设置
      "translate_to": "日文" // 翻译的目标语言，如果为空字符（""）或不设置，则不会翻译该角色
    }
  ]
}
```

#### 3. 生成语音

```bash
# 为 scene1.txt 生成语音，如果只有几个角色缺少音频，则仅会合成空缺的角色语音
npx @webgal-tools/voice -webgal <你的游戏目录> -voice scene1.txt

# 删除当前脚本中对应的所有缓存音频，强制重新生成所有语音
npx @webgal-tools/voice -webgal <你的游戏目录> -voice scene1.txt -force
```

### 配置详解

#### 全局配置

*   `gpt_sovits_url`: GPT-SoVITS 服务地址
*   `gpt_sovits_path`: GPT-SoVITS 项目的本地路径，**模型文件会基于此设置相对路径**
*   `max_translator`: 最大翻译并发数，建议 API 为 3-5，本地模型为 1

#### 翻译配置 (`translate`)

*   `model_type`: 翻译服务类型，支持 `ollama`, `openai`, `anthropic` 等
*   `base_url`: API 地址
*   `api_key`: (可选) API 密钥
*   `model_name`: 使用的具体模型
*   `context_size`: 翻译时引用的上下文对话数量
*   `additional_prompt`: 全局翻译提示，可用于提供人名对照表等

#### 角色配置 (`characters` 数组)

*   `character_name`: 角色名，**必须与游戏脚本中的角色名完全一致**
*   `translate_to`: 目标翻译语言，若留空则不翻译
*   `gpt` / `sovits`: **相对于 `gpt_sovits_path` 的模型文件路径**
*   `ref_audio` / `ref_text`: 参考音频及文本
*   `prompt`: 角色的语气、风格描述
*   `inferrence_config`: (可选) 详细的 GPT-SoVITS 推理参数

### 工作原理

1. **读取剧本**：解析指定的剧本文件，识别对话内容
2. **智能检测**：检查 `vocal` 目录下是否已存在对应音频文件
3. **翻译处理**：根据配置将对话翻译为目标语言（可选）
4. **语音合成**：使用 GPT-SoVITS 生成语音
5. **更新脚本**：自动在剧本中插入语音文件引用（注意在目标脚本的合成期间不要更改目标脚本的内容，否则会引起事务冲突）
6. **备份保护**：修改前自动创建备份文件到`.voice-backups`

### 音频缓存策略

- 音频文件使用 `{角色名}_{内容哈希}.wav` 格式命名
- 相同角色的相同对话总是使用同一个音频文件
- 支持跨文件的音频复用，大幅提升生成效率

### 其它说明 FAQ

1. **生成的语音中有一些音频质量不如意，想要重新生成**: 在脚本中找到你不满意的对话，找到对应的音频名称，并在`vocal`目录下删除这些语音文件，然后再开启合成项目，就可以只生成不满意的音频啦
2. **音频插入会影响我自定义的音频吗？** 会的，如果你有需要自定义的角色音频，请在语音合成服务完成后，再手动更换为你的音频。
3. **可以添加自动根据话语情感选择对应的权重模型吗？** 日后可以添加这个可选的feature，计划在翻译层添加一定的输出格式来实现，但是会减缓翻译速度。
4. **我不想使用翻译功能**：设置`translate.check`为`false`，并每个角色都不要设置`translate_to`。
5. **我想让部分角色使用翻译功能**：需要使用翻译的角色要配置`translate_to`为目标语言，不翻译的角色不要配置
6. **GPT-SOVITS在哪**：这是Github的一个开源项目，B站上也有很多作者的整合包，本项目的不再赘述
7. **翻译模型怎么选**：如果你用的是本地部署的Ollama服务的模型，个人推荐`gemma3n:e4b`，使用`gemma`类的模型时注意Ollama版本必须是在`0.9.4`以上的才行
8. **有懒人整合包吗**：正在整合，不过还是推荐你安装一个较现代node环境，并学习本项目少量的命令行操作。整合包也只是整合了运行环境。
---

## 🤖 2. MCPServer (AI 助理)

### 功能概述

MCPServer 为接入的大模型提供 WebGAL 专业知识，使其能够：

- **文档查询**：快速查找 WebGAL 指令和功能说明
- **资源管理**：扫描和管理游戏资产（背景、音乐、角色立绘等）
- **脚本编辑**：辅助创建和修改游戏脚本
- **智能建议**：基于游戏内容提供创作建议

### 快速开始

#### 1. 初始化配置

```bash
# 初始化 MCP 服务器配置
npx @webgal-tools/mcp-server -webgal <你的游戏目录> init
```

命令执行后，将在当前目录下生成 `mcp.config.json` 文件。

#### 2. 启动服务

```bash
# 启动 SSE 服务器模式 (推荐)，用于连接客户端
npx @webgal-tools/mcp-server -webgal <你的游戏目录> --sse

# 您也可以使用 stdio 模式
npx @webgal-tools/mcp-server -webgal <你的游戏目录>
```

服务器启动后，您可以通过兼容 MCP 协议的客户端（如聊天机器人）与其交互。

### 配置说明

#### `mcp.config.json`

此文件定义了 AI 助理所需的游戏资源目录。通常使用默认配置即可。如果有对于一种资源需要配置多个扫描入口，请采用空格分割

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

---

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

-   **🎯 单一职责**: 每个包专注于特定功能
-   **🛡️ 封装隔离**: 应用层通过 `config` 包的 API 操作配置，不直接接触文件系统
-   **🔧 易于维护**: 结构清晰，便于扩展和维护

## 🧑‍💻 开发指南

如果您想参与贡献或进行二次开发：

1.  **克隆项目**: `git clone https://github.com/floatDreamWithSong/webgal-tools.git`
2.  **安装依赖**: `pnpm install`
3.  **启动开发模式**: `pnpm dev` (实时编译)
4.  **构建项目**: `pnpm build`