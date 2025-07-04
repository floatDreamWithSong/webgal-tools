# OpenWebGAL Assistant

这是一个为 [OpenWebGAL](https://github.com/OpenWebGAL/WebGAL) 游戏开发者设计的 Assistant（MCP Server）。它的核心目标是利用大型语言模型（LLM）的能力，将您从繁琐、重复的游戏开发工作中解放出来，让您可以更专注于核心的故事与创意。

您可以把这个项目理解为一个赋予了 AI "超能力"的、专门研究 WebGAL 的开发助理，让 AI 帮您完成许多工作，例如：

- "帮我查一下 WebGAL 的动画指令怎么写？"
- "我的游戏里有哪些背景图片？"
- "帮我把第一章的剧本最后加一段祥子的独白。"
- "帮我把`剧本/小说.txt`直接转化为Webgal游戏脚本吧！资产我都准备好了您自己看嘞"

无论您是经验丰富的开发者，还是刚刚接触 WebGAL 的新手，AI 助手都能为您提供帮助，成为您游戏开发中最得力的伙伴。

## 1. 这是为了解决什么问题？

在传统的游戏开发流程中，创作者常常需要处理大量非创造性的工作，例如：

- **查阅文档**：忘记某个指令或功能时，需要在冗长的文档中反复查找。
- **管理资源**：手动整理、核对成百上千的图片、音乐、语音等素材文件。
- **编写脚本**：在剧本文件中反复修改、增删、调整对话和情节。
- **制作配音**：为每一句对话手动录制、剪辑、并整合到游戏中，如果涉及多语言则工作量翻倍。

本项目旨在解决以上痛点，将这些任务交给 AI 自动处理，其核心优势在于：

- **自动化**：自动扫描和管理游戏资源、自动为对话生成语音。
- **智能化**：能理解您的意图，直接修改游戏代码、提供文档查询。
- **高效率**：利用并行处理等技术，大幅缩短翻译和语音合成等耗时任务的时间。

最终，让您回归创作本身。

## 2. 如何开始：初始化与配置

开始使用前，您需要进行简单的初始化和配置。

### 首次初始化

首先，请打开一个终端或命令行工具（如 PowerShell 或 Cmd），然后执行以下命令：

```bash
npx openwebgal-mcp-server init -webgal <你的游戏目录>
```


**命令解释**：
- `npx`：一个方便的工具，可以临时下载并运行这个 AI 助手程序，无需在您的电脑上永久安装。
- `init`: 表示要执行"初始化"操作。
- `-webgal <你的游戏目录>`: 这是最重要的参数，您需要将 `<你的游戏目录>` 替换成您本地 WebGAL 游戏的根目录路径。例如：`D:/Webgal_Terre/public/games/新的游戏/game`。

执行该命令后，程序会在您 **当前所在的目录** 下创建两个核心配置文件：

1.  `.env`: 用于配置基础环境，主要是游戏资源目录。
2.  `voice.config.json`: 用于配置所有与 **翻译** 和 **语音合成** 相关的功能。

### 配置项详解

#### 基础配置 (`.env` 文件)

这个文件告诉 AI 助手去哪里寻找您的游戏资源。通常您不需要修改它，使用默认配置即可。

```
# 资源扫描的目录（相对于您的游戏目录）
WEBGAL_BACKGROUND_DIR=background
WEBGAL_VOCAL_DIR=vocal
WEBGAL_BGM_DIR=bgm
WEBGAL_ANIMATION_DIR=animation
WEBGAL_VIDEO_DIR=video
WEBGAL_FIGURE_DIR=figure

# 最大翻译任务并发数
MAX_TRANSLATOR=3
```

- `WEBGAL_..._DIR`: 指定了不同类型资源（背景、语音、音乐等）所在的文件夹名称。
- `MAX_TRANSLATOR`: 在执行翻译和语音合成时，可以同时进行多少个翻译任务。提高此数值可以加快多角色、多语言翻译的速度，但也会增加电脑性能消耗。对于大型语言模型API服务（如OpenAI、Anthropic等），较高的并发数可以显著提升效率；但如果使用的是本地部署的Ollama服务，过高的并发可能会导致性能下降，因为本地模型的推理能力有限，建议根据您的硬件配置调整此值。

#### 语音与翻译配置 (`voice.config.json` 文件)

这是最核心的配置文件，控制着所有AI翻译和语音功能。下面是两个个完整的配置示例和参数说明。

**示例1：本地ollama服务 `voice.config.json`:**
```json
{
  "volume": 30,
  "gpt_sovits_url": "http://localhost:9872",
  "gpt_sovits_path": "D:\\AIVoice\\GPT-SoVITS-v2pro-20250604",
  "model_version": "v2",
  "translate": {
    "model_type": "ollama",
    "base_url": "http://localhost:11434/api",
    "model_name": "glm4:9b",
    "enabled": true,
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
    },{
      "character_name": "Uika",
      "gpt": "GPT_weights_v2ProPlus\\Mujica_三角初華_v2pp.ckpt",
      "sovits": "SoVITS_weights_v2ProPlus\\Mujica_三角初華_v2pp.pth",
      "ref_audio": "D:\\AIVoice\\语音模型\\GPT-SoVITS v2 pro plus\\Mujica\\三角初华\\(A)まなちゃんソロの仕事も始まって、大変なときなのに.wav",
      "ref_text": "まなちゃんソロの仕事も始まって、大変なときなのに",
      "translate_to": "日文",
      "inferrence_config": {
        "prompt_language": "日文",
        "text_language": "日文",
        "how_to_cut": "凑四句一切",
        "top_k": 15,
        "top_p": 1.0,
        "temperature": 1.0,
        "speed": 0.9,
        "sample_steps": 8,
        "if_sr": false,
        "pause_second": 0.3
      }
    }
  ]
}
```

**示例2：外部API服务（这里是阿里云百炼平台的qwen测试） `voice.config.json`:**
```json
{
  "volume": 30,
  "gpt_sovits_url": "http://localhost:9872",
  "gpt_sovits_path": "D:\\AIVoice\\GPT-SoVITS-v2pro-20250604",
  "model_version": "v2",
  "translate": {
    "model_type": "openai",
    "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "model_name": "qwen-turbo-latest",
    "api_key": "sk-xxxxxxxxxxxxxxxxxx",
    "enabled": true,
    "context_size": 2,
    "additional_prompt":"人名信息：睦，即：むつみ。"
  },
  "characters": [
    {
      "character_name": "Sakiko",
      "gpt": "GPT_weights_v2ProPlus\\Mujica_豊川祥子_白_v2pp.ckpt",
      "sovits": "SoVITS_weights_v2ProPlus\\Mujica_豊川祥子_白_v2pp.pth",
      "ref_audio": "D:\\AIVoice\\语音模型\\GPT-SoVITS v2 pro plus\\Mujica\\丰川祥子（白祥）\\(A)あなたと空を見上げるのは、いつも夏でしたわね.wav",
      "ref_text": "あなたと空を見上げるのは、いつも夏でしたわね",
      "prompt": "说日语喜欢说类似'德斯哇'的大小姐语气",
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
    },{
      "character_name": "Uika",
      "gpt": "GPT_weights_v2ProPlus\\Mujica_三角初華_v2pp.ckpt",
      "sovits": "SoVITS_weights_v2ProPlus\\Mujica_三角初華_v2pp.pth",
      "ref_audio": "D:\\AIVoice\\语音模型\\GPT-SoVITS v2 pro plus\\Mujica\\三角初华\\(A)まなちゃんソロの仕事も始まって、大変なときなのに.wav",
      "ref_text": "まなちゃんソロの仕事も始まって、大変なときなのに",
      "translate_to": "日文",
      "inferrence_config": {
        "prompt_language": "日文",
        "text_language": "日文",
        "how_to_cut": "凑四句一切",
        "top_k": 15,
        "top_p": 1.0,
        "temperature": 1.0,
        "speed": 0.9,
        "sample_steps": 8,
        "if_sr": false,
        "pause_second": 0.3
      }
    }
  ]
}
```



**参数说明:**

> 详细配置和意义请自行查看GPT-SOVITS项目的tts服务介绍

*   **全局配置**:
    *   `gpt_sovits_url`: 您的 GPT-SoVITS 服务运行的地址。
    *   `gpt_sovits_path`: 您本地 GPT-SoVITS 项目的完整路径。**模型文件路径将基于此路径计算**。
    *   `volume`: 生成语音的默认音量。
    *   `model_version`: GPT-SoVITS 使用的模型版本，一般就 (`v2`)。

*   **翻译配置 (`translate` 部分)**:
    *   `enabled`: 是否启用翻译功能。如果为 `true`，则会在语音合成前先进行翻译。
    *   `model_type`: 您使用的翻译模型服务商。支持 `ollama`, `openai`, `anthropic`, `google`, `mistral`, `cohere`, `custom` (用于其他兼容OpenAI API的服务)。
    *   `base_url`: 翻译服务的 API 地址。
    *   `api_key`: (可选) 访问翻译服务所需的 API 密钥。对于本地 `ollama` 服务则无需填写。
    *   `model_name`: 您要使用的具体模型名称，例如 `gpt-4o-mini` 或 `gemma:2b`。
    *   `context_size`: 为了让翻译更准确，AI 会自动读取前后文。此参数定义读取几句对话作为上下文，推荐 `1-4`。
    *   `additional_prompt`: 全局的翻译提示信息。您可以在这里提供人名、地名对照表等，以提高翻译准确性。

*   **角色配置 (`characters` 数组)**:
    *   您可以为游戏里的每个角色（或每个需要不同语音/语言的角色）添加一个配置对象。
    *   `character_name`: 角色名，**必须与游戏脚本中的角色名(`角色名: 对话内容 ...`)完全一致**。
    *   `gpt` / `sovits`: 角色使用的 GPT 和 SoVITS 模型文件路径（模型权重）。这是**相对于 `gpt_sovits_path` 的相对路径**。
    *   `ref_audio` / `ref_text`: 参考音频的路径和文本。
    *   `prompt`: 对这个角色说话风格、语气的描述，引导 AI 合成出更具个性的语音。
    *   `translate_to`: 指定这个角色的对话需要被翻译成哪种语言。
    *   `inferrence_config`: (可选) 更详细的 GPT-SoVITS 推理参数。

## 3. AI 助手的核心能力 (MCP)

配置完成后，AI 助手就具备了多种能力。您可以通过兼容 MCP 协议的客户端（如配置好的聊天机器人）来使用这些能力。

### 🚀 运行模式

本项目支持两种运行模式：

#### 1. stdio模式（默认）
传统的标准输入输出模式，适合本地开发和测试：

```bash
# 启动stdio模式
npx openwebgal-mcp-server -webgal /path/to/your/game

# 或使用已构建的版本
node dist/main.js -webgal /path/to/your/game
```

#### 2. SSE模式（Server-Sent Events）
基于HTTP的服务器模式，支持远程连接和多客户端并发：

```bash
# 启动SSE服务器，默认端口3000
npx openwebgal-mcp-server -webgal /path/to/your/game --sse

# 使用自定义端口
npx openwebgal-mcp-server -webgal /path/to/your/game --sse --port 8080

# 或使用已构建的版本
node dist/main.js -webgal /path/to/your/game --sse --port 3000
```

SSE模式启动后会提供以下端点：
- `GET /connect` - 建立SSE连接
- `POST /messages` - 处理MCP消息
- `GET /health` - 健康检查

**SSE模式优势：**
- 支持远程连接
- 支持多个并发客户端
- 基于HTTP协议，更适合Web应用集成
- 提供健康检查和监控功能

**使用SSE客户端连接：**
```javascript
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const client = new Client({
  name: "webgal-client",
  version: "1.0.0"
}, {
  capabilities: {}
});

const transport = new SSEClientTransport(
  new URL("http://localhost:3000/connect")
);

await client.connect(transport);
```

**健康检查：**
```bash
curl http://localhost:3000/health
```

响应示例：
```json
{
  "status": "ok",
  "activeConnections": 2,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 🔧 模式对比

| 特性 | stdio模式 | SSE模式 |
|------|-----------|---------|
| 连接方式 | 本地进程通信 | HTTP连接 |
| 并发支持 | 单个客户端 | 多个客户端 |
| 远程访问 | 不支持 | 支持 |
| 监控能力 | 有限 | 健康检查API |
| 适用场景 | 本地开发/测试 | 生产环境/Web集成 |

### 📚 能力一：WebGAL 万事通

遇到 WebGAL 的问题却不想翻阅长篇的文档？直接问 AI 吧！AI 熟读了所有 WebGAL 的官方文档，能为您快速、准确地解答问题。

- **您可以问**："WebGAL 如何显示一张背景图？"
- **AI 会**：找到并展示 `bg-and-figure.md` 文档中关于背景图指令的内容。

### 🎨 能力二：游戏资源管家

管理成百上千的游戏素材是一件麻烦事。现在，您可以让 AI 来帮您清点和管理。

- **您可以说**："帮我看看游戏里都有哪些角色的 Live2D 模型。"
- **AI 会**：扫描您在 `.env` 中配置的 `figure` 目录，并列出所有找到的**浅层的** Live2D 模型文件（`.json`）和普通角色图片目录。
- **您还可以问**："祥子这个模型有哪些表情和动作？"
- **AI 会**：列出该 Live2D 模型包含的所有表情（`.exp.json` 文件）和动作（`.mtn` 文件），方便您在剧情中精确调用。

### ✍️ 能力三：剧本助理

写游戏剧本不只是打字，更需要不断地修改和调整。AI 不仅能陪您讨论剧情，还能直接上手帮您修改剧本文件。

- **您可以说**："帮我列出所有的剧本文件。"
- **AI 会**：扫描 `scene` 目录并展示所有 `.txt` 剧本文件。
- **您可以说**："帮我创建一个新剧本 `scene2.txt`，内容是'祥子离开了房间'。"
- **AI 会**：在 `scene` 目录下新建一个 `scene2.txt` 文件并写入您指定的内容。
- **您还可以说**："在 `scene1.txt` 的末尾追加一行对话。"
- **AI 会**：读取 `scene1.txt` 并在文件末尾添加新的内容。

### 💪 终极能力：剧本转化

哎呀，剧情写好了，直接把把剧情文件给AI，让他自行调用MCP，帮你转化为Webgal游戏脚本，
它也能够满足绝大部分的人物对话分割，旁白安排。
角色立绘、动作、表情设置、背景图片、音效等设置，只要你的文件名和文件夹足够语义化，AI也能合理的
推断使用需求。

稍微比较难的是角色位置，因为Webgal的位置安排依靠游戏的屏幕大小。目前还没考虑这方面的解决方案。
如果你有对应的高级动画、角色位置摆放的需求，请在生成后自行微调

## 4. 语音合成 (GPT-SoVITS 集成)

这是本项目的核心功能之一：全自动为游戏对话生成高质量的配音。

### 工作原理

当您执行语音生成命令后，程序会：
1.  **读取剧本**：我们的内置编译器会解析您指定的剧本文件（如 `scene1.txt`）。
2.  **识别对话**：找出所有需要配音的对话行。
3.  **智能检测**：通过检查 `vocal` 目录下的音频文件，自动跳过已经生成过语音的对话。音频文件使用角色名和对话内容的哈希值命名，确保相同内容的对话能够复用音频文件。（修改配置是不会重置缓存的，如果需要，请添加`-force`为该文件重新生成配音）
4.  **音频复用**：对于同一个角色说的同一句话，会自动复用已经生成好的音频文件，即使在不同的剧情脚本中也能生效，从而大大减少翻译和语音合成的开销。

**音频缓存策略**：
- 音频文件使用 `{角色名}_{内容哈希}.wav` 格式命名，例如：`Alice_a1b2c3d4e5f6.wav`
- 内容哈希基于"角色名:对话内容"计算，确保相同角色的相同对话总是使用同一个音频文件
- 在执行语音生成前，会自动检查 `vocal` 目录下是否已存在对应的音频文件
- 如果文件已存在，直接跳过生成任务并在脚本中引用现有音频
- 这种设计实现了跨文件的音频复用，大大提升了生成效率
5.  **翻译 (如果启用)**：将新的或修改过的对话，根据 `voice.config.json` 中的配置，发送给翻译模型进行翻译。为了保证质量，翻译时会自动附带上下文。系统使用基于Promise的并发控制，可同时处理多个翻译任务，显著提升效率。
6.  **语音合成**：将原文或翻译后的文本，连同对应的角色模型配置，发送给 GPT-SoVITS 服务进行语音合成。语音合成过程保持单线程执行，以避免模型切换冲突。
7.  **更新脚本**：将生成好的语音文件（`.wav`）引用自动插入到剧本文件中。
8.  **备份**：在修改脚本前，会自动在 `.voice-backups` 目录下创建备份，防止意外。

整个过程采用基于Promise的并发控制和智能队列任务排序，翻译阶段可并行执行多个任务，语音合成阶段优先处理同一角色的任务以减少模型切换开销，大幅提升效率。系统还提供详细的进度回调，让您实时了解处理状态。

### 使用方式

在配置好 `voice.config.json` 后，打开终端，执行以下命令即可开始为指定剧本生成语音：

```bash
# 为 scene1.txt 生成语音
npx openwebgal-mcp-server -voice scene1.txt -webgal <你的游戏目录>

# 强制模式：忽略缓存，为所有对话重新生成语音
npx openwebgal-mcp-server -voice scene1.txt -force -webgal <你的游戏目录>
```

## 5. 翻译模型接入

为了实现高质量的"外语配音"，本项目集成了强大的翻译功能。

### 配置特点

- **多服务商支持**：您可以灵活选择最适合您的翻译服务，无论是免费的本地模型（通过 Ollama），还是强大的商业模型（如 OpenAI, Google Gemini 等）。
- **上下文感知**：自动分析这句对话是否包含"它"、"那个"、"刚才"等需要依赖上下文才能准确理解的词语。如果包含，AI 会自动将前后几句对话一起发给翻译模型，极大地提升了翻译的准确性和自然度。
- **高度自定义的 Prompt**：
    - **全局提示 (`additional_prompt`)**: 您可以在 `voice.config.json` 中设置一个全局的提示，例如提供一份"角色中文名-外文名对照表"，或者解释游戏中的特殊术语。这个信息会提供给每一次翻译请求，确保译名统一、术语准确。
    - **角色提示 (`prompt`)**: 您可以为每个角色单独设置 Prompt，用以描述这个角色的说话风格，例如"一个喜欢用大小姐语气的角色"或"说话简洁、冷淡"，让翻译结果和后续的语音合成更贴合人物性格。

- **关于Ollama服务的小模型选择**
    - 模型在初次加载的时候都比较慢，请耐心等待，我们有设置30s的超时警告和3次重试机制
    - 尽量不要选择太小的模型，例如1.5b, 3b。除非你还对它们进行了翻译微调，否则不能很好的结合语境进行翻译
    - 不要选择思考模型，思考模型输出的效率极低。 
    - 目前作者的体验是，gemma3:4b能较好的完成翻译流畅性，glm4:9b能较好的贴切语境和人物语言特色翻译

## 6. 并行处理系统

本项目采用了高效的并行处理系统，特别是在翻译和语音合成方面：

### 并发控制架构

- **基于Promise的并发控制**：使用现代JavaScript的Promise机制实现高效的并发任务处理，相比传统的多进程架构，更加轻量和灵活。
- **智能队列管理**：翻译任务采用并行处理，而语音合成任务则使用智能排序的单线程队列，确保同一角色的任务连续处理，减少模型切换开销。
- **自适应并发限制**：通过环境变量`MAX_TRANSLATOR`控制最大并发数，系统会自动管理并发任务数量，避免资源竞争。

### 性能优化

- **翻译阶段**：多任务并发执行，充分利用API服务的并发能力。
- **语音合成阶段**：优先处理同一角色的任务，减少模型切换次数，显著提升效率。
- **资源管理**：自动清理模型缓存，及时释放内存资源。

### 进度监控

系统提供完善的进度回调机制，让您可以实时了解：
- 翻译进度：已完成/总任务数，当前处理的角色和文本
- 语音合成进度：已完成/总任务数，当前处理的角色和文件
- 错误处理：详细的错误信息和相关任务内容

这一设计使得整个翻译和语音合成过程更加高效、透明，同时保持了稳定性和可靠性。

### 迁移指南

如果您正在从旧版本升级，请注意以下变化：

1. 环境变量 `MAX_TRANSLATOR` 现在用于控制Promise并发数量
2. 移除了多进程架构，改用基于Promise的并发控制
3. 新增了进度回调函数API，可通过 `setCallbacks()` 方法设置
4. 所有翻译服务统一通过 `TranslateService` 类处理，支持更多模型供应商

## 7. 二次定制开发简略指南

如果您具备一定的编程基础（了解 TypeScript/JavaScript），您可以对本项目进行更深度的定制。

### 项目结构概览

- `src/`：所有核心代码存放的目录。
  - `server/tools/`：AI 助手的"工具箱"。每个文件定义了一类能力（如 `assets.ts` 定义了资源管理能力）。
  - `voice/`：语音合成相关的所有逻辑。
  - `translate/`：翻译服务相关的逻辑。
- `prompts/`：存放了 AI 助手的核心 Prompt (系统提示词)，定义了它的基本角色和行为准则。
- `package.json`：项目定义与依赖管理文件。

### 开发流程

1.  **克隆项目**：将本项目代码克隆到您的本地。
2.  **安装依赖**：在项目根目录下执行 `pnpm install`。
3.  **开始开发**：执行 `pnpm run dev`，这将启动 TypeScript 的实时编译，您所做的任何代码修改都会被自动编译。
4.  **运行测试**：您可以修改 `package.json` 中 `