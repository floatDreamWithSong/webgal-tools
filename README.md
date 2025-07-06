# WebGAL 工具集 (`webgal-tools`)

一个为 [OpenWebGAL](https://github.com/OpenWebGAL/WebGAL) 游戏开发者量身打造的强大工具集，旨在简化开发流程，提升创作效率。

---

## 🚀 快速上手

本工具集提供一个统一的命令行入口，推荐使用交互模式，对新手友好。

### **交互模式 (推荐)**

无需记忆复杂命令，通过简单的问答交互即可完成所有操作。

1.  **启动工具:**
    ```bash
    # 推荐使用 pnpm
    pnpm dlx @webgal-tools/cli

    # 或者使用 npx
    npx @webgal-tools/cli
    ```

2.  **操作流程:**
    *   **第一步：输入工作目录**：指定你的 WebGAL 游戏项目文件夹。
    *   **第二步：选择核心功能**：
        *   `初始化配置文件`：为您的项目首次生成必要的 `mcp.config.json` 和 `voice.config.json`。
        *   `启动 MCP 服务器`：为大语言模型助手启动后端服务。
        *   `启动语音服务`：为游戏剧本自动生成角色语音。

### **命令行模式 (高级)**

为自动化流程设计，目前仅支持以 `stdio` 模式启动 MCP 服务器。

```bash
pnpm dlx @webgal-tools/cli --mcp <你的游戏目录>
```

### **UI模式（可视化，目前仅提供语音合成服务）**

```bash
pnpm dlx @webgal-tools/voice-ui
```



---

## ⚙️ 配置文件深度解析

配置文件是驱动本工具集的核心。使用交互模式中的 `初始化配置文件` 功能来生成它们。

### **`mcp.config.json`**

此文件定义了 MCP 服务器需要扫描的游戏资源目录。通常保持默认即可。

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
> **实验性功能**: 如果你想为一种资产（如 `background`）配置多个扫描目录，可以尝试用空格分割路径，例如 `"background": "background/common background/characters"`。

### **`voice.config.json`**

这是语音合成功能的核心配置文件，其强大之处在于对每个角色提供了两种不同的配置模式，由 `"auto"` 字段控制。

#### **全局与翻译配置**

```json
{
  "volume": 30,
  "gpt_sovits_url": "http://localhost:9872",
  "gpt_sovits_path": "D:/AIVoice/GPT-SoVITS-v2pro-20250604", // 你的 GPT-SoVITS 本地项目根目录
  "model_version": "v2",
  "max_translator": 1,

  "translate": {
    "check": true, // 是否启用翻译功能
    "model_type": "ollama",
    "base_url": "http://localhost:11434/api",
    "model_name": "glm4:9b",
    "context_size": 2,
    "additional_prompt": "人名翻译规则：..." // 定义全局统一的翻译规则、角色口吻等
  },
  "characters": [
      // ... 角色配置见下文 ...
  ]
}
```

#### **角色配置模式一：精确指定模式 (`"auto": false`)**

当您希望使用一组固定的模型和参考音频来生成语音时，使用此模式。它适用于声线稳定或需要精确控制某个特定情绪的场景。（比如恐惧姐，就没见过她有什么情绪变化）

*   **核心要求**：`gpt`, `sovits`, `ref_audio` 字段必须提供 **文件** 路径。
*   **必须字段**：`ref_text`，其内容必须与 `ref_audio` 文件中的语音完全对应。

**示例:**
```json
    {
      "character_name": "祥子",
      "auto": false, // 关闭自动模式
      // --- 以下均为文件路径 ---
      "gpt": "GPT_weights_v2ProPlus/mygo-mujica/丰川祥子_neutral_v2pp.ckpt",
      "sovits": "SoVITS_weights_v2ProPlus/mygo-mujica/丰川祥子_neutral_v2pp.pth",
      "ref_audio": "D:/AIVoice/W_A/丰川祥子（Sakiko）/neutral/あなたと空を見上げるのは、いつも夏でしたわね.wav",
      // --- 参考文本 (必需) ---
      "ref_text": "あなたと空を見上げるのは、いつも夏でしたわね",
      "prompt": "【口吻】高傲威严的大小姐腔调...",
      "translate_to": "日语"
    }
```

#### **角色配置模式二：自动情绪识别模式 (`"auto": true`)**

当您希望工具能**根据剧本中的对话内容，自动选择最匹配的情绪模型和参考音频**时，使用此模式。它极大地增强了配音的表现力。但是这会较为显著地减缓整个过程的生成速度。

*   **核心要求**：`gpt`, `sovits`, `ref_audio` 字段必须提供 **文件夹** 路径。工具会扫描这些文件夹，寻找与分析出的情绪相匹配的文件（例如 `happy.ckpt`, `sad.wav`）。
*   **参考文字**：由于需要动态选择参考音频，因此此模式下的`ref_text` 字段也是需要动态配置的，本项目采用的解决方案是：我们将`被选择的音频文件的文件名`作为`ref_text`的值，也就是说，您需要保证音频文件名和音频内容一致。

**示例:**
```json
    {
      "character_name": "喵梦",
      "auto": true, // 启用自动模式
      // --- 以下均为文件夹路径 ---
      "gpt": "GPT_weights_v2ProPlus/mygo-mujica/祐天寺若麦（喵梦）（Nyamu）",
      "sovits": "SoVITS_weights_v2ProPlus/mygo-mujica/祐天寺若麦（喵梦）（Nyamu）",
      "ref_audio": "D:/AIVoice/W_A/祐天寺若麦（喵梦）（Nyamu）",
      // --- 无需 ref_text ---
      "prompt": "【口吻】轻浮活泼的网络主播腔...",
      "translate_to": "日文"
    }
```

#### **通用角色配置**
无论使用哪种模式，以下配置都适用：
*   `prompt`: 定义角色的专属语气词、口头禅和风格，在生成语音时作为重要参考。
*   `translate_to`: 定义该角色的目标翻译语言，例如 "日文"、"英文"。如果留空，则该角色不会被翻译。
*   `inferrence_config`: 高级推理参数，可以对每个角色的发音细节（如语速 `speed`、采样温度 `temperature` 等）进行微调。

---

## 🧩 模块功能

### **语音合成**

自动化完成从剧本到配音的全过程。

*   **核心功能**:
    *   自动解析剧本，提取对话。
    *   根据配置，智能进行翻译。
    *   调用 GPT-SoVITS 生成高质量语音。
    *   智能缓存，相同内容的对话自动复用，极大提升效率。
    *   自动回写剧本，插入音频播放指令。
*   **使用方式**: 在交互模式中选择 `启动语音服务`，并按提示输入剧本文件路径。

### **MCP 服务器**

为外部 AI 应用（如 IDE 插件、聊天机器人）提供与你的游戏项目交互的能力。

*   **核心功能**:
    *   提供游戏文档查询。
    *   扫描并提供游戏内资源列表（图片、音频等）。
    *   辅助进行脚本的创作和修改。
*   **使用方式**:
    *   **SSE 模式 (推荐)**: 在交互模式中选择 `启动 MCP 服务器`，用于连接图形化客户端。
    *   **stdio 模式**: 通过 `pnpm dlx @webgal-tools/cli --mcp <目录>` 启动，用于连接其他命令行工具。

---

## 🏗️ 项目架构

项目采用 Turborepo 管理的 Monorepo 架构，结构清晰，易于维护。

```
webgal-mcp/
├── apps/
│   ├── cli/                 # 统一命令行接口
│   ├── mcp-server/          # MCP服务器应用
│   ├── voice/               # 语音合成应用
│   └── voice-ui/            # (可选) 语音合成Web界面
├── packages/
│   ├── config/              # 统一配置管理包
│   └── logger/              # 统一日志记录包
```

*   **模块化**: 每个 `app` 或 `package` 都是一个独立的功能模块。
*   **配置中心**: `packages/config` 统一处理所有配置的读取和校验，实现与业务逻辑分离。
*   **统一入口**: `apps/cli` 是所有功能的唯一入口，为用户提供一致的体验。

---

## 🧑‍💻 开发指南

```bash
# 1. 克隆项目
git clone https://github.com/floatDreamWithSong/webgal-tools.git
cd webgal-tools

# 2. 安装依赖
pnpm install

# 3. 启动开发模式 (所有包都会被实时编译)
pnpm dev

# 4. 构建生产版本
pnpm build
```

### **本地调试**

构建后，`dist` 目录会生成可执行的 js 文件。

```bash
# 调试CLI
node apps/cli/dist/index.js
```

---
## 📄 许可证

本项目采用 MIT 许可证。