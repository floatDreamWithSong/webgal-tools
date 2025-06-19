# OpenWebGAL MCP Server

[![npm version](https://img.shields.io/npm/v/openwebgal-mcp-server.svg)](https://www.npmjs.com/package/openwebgal-mcp-server)

这是一个为 [OpenWebGAL](https://github.com/OpenWebGAL/WebGAL) 游戏开发者设计的 AI 助手（MCP Server）。它赋予了大型语言模型（LLM）理解您的游戏项目、听取您的想法、并直接动手帮您修改代码和资源的能力，成为您游戏开发中最得力的伙伴。

无论您是经验丰富的开发者，还是刚刚接触 WebGAL 的新手，AI 助手都能为您提供帮助，让您更专注于故事创作。

## ✨ 致游戏创作者：AI能帮我做什么？

简单来说，您可以把这个工具看作一个拥有“超能力”的、专门研究WebGAL的AI助理。当它与一个聊天应用（例如 QQ 或 Discord 机器人）结合时，您就可以通过聊天的方式，让AI帮您完成许多繁琐的工作。

AI 助手主要有三大核心能力：

### 📚 能力一：WebGAL万事通

遇到 WebGAL 的问题却不想翻阅长篇的文档？直接问AI吧！

- **精准问答**：AI 助手熟读了所有 WebGAL 的官方文档。无论是基础的入门问题，还是复杂的脚本语法，它都能给出准确的解答。
- **快速定位**：它能快速浏览文档目录、查询具体内容，为您节省大量查阅资料的时间。

*可用的AI工具: `get_docs_directory`, `get_doc_content`*

### 🎨 能力二：游戏资源管家

管理游戏素材是一件麻烦事。现在，您可以让AI来帮您清点和管理。

- **自动扫描**：AI 助手可以扫描您的游戏目录，自动识别并整理出所有的背景、立绘、音乐、语音、动画和视频等资源。
- **Live2D支持**：对于使用 Live2D 的角色，AI 助手能专门列出某个模型所包含的所有表情（`.exp.json` 文件），方便您在剧情中调用。

*可用的AI工具: `scan_work_dir_assets`, `get_live2d_expression`*

### ✍️ 能力三：剧本创作助理

写游戏剧本不只是打字，更需要不断地修改和调整。AI 不仅能陪您讨论剧情，还能直接上手帮您修改剧本文件。

- **剧本速览**：快速列出您 `scene` 目录下的所有剧本文件。
- **创建新章节**：当您有了新的灵感，只需告诉AI，它就能为您创建新的剧本文件（`.txt`）。
- **修改与重构**：无论是修正错字、替换对话，还是增删大段剧情，AI 都可以精准地在您指定的位置完成修改操作。

*可用的AI工具: `scan_scene_script`, `create_scene_script`, `edit_scene_script`*

---

## 🚀 如何运行与配置

### 工作目录设定

可以使用`-webgal`参数来强制设定你的game目录，例如

```bash
npx openwebgal-mcp-server -webgal D:\\file\\WebGal\\release\\public\\games\\新的游戏\\game
```

或者你也可以设置环境变量`WEBGAL_WORK_DIR`为你的game目录。

### 环境变量配置

在您项目的game工作目录创建一个 `.env` 文件，用于存放您的项目配置。您可以复制 `env.example` 的内容进行修改。

```.env

# 资产扫描路径 (相对于 WEBGAL_WORK_DIR)
# 您可以配置多个路径，用空格隔开
# 支持的资产类型: background, figure, vocal, bgm, animation, video
WEBGAL_BACKGROUND_DIR=background
WEBGAL_FIGURE_DIR=figure
WEBGAL_VOCAL_DIR=vocal
WEBGAL_BGM_DIR=bgm
WEBGAL_ANIMATION_DIR=animation
WEBGAL_VIDEO_DIR=video
```

我们提供了一个初始化命令，可以帮您快速生成一份包含所有可用配置的 `.env` 文件：

```bash
npx openwebgal-mcp-server init
```

### 启动服务

您可以使用 `npx` 直接运行此服务器，它会自动加载`.env`文件。

> 推荐设置`-webgal`参数以指定工作目录

```bash
npx openwebgal-mcp-server
```

当服务器启动后，它会监听标准输入/输出（stdio），等待来自 MCP 客户端的连接和请求。

### 开发指南

如果您想修改此项目，请按照以下步骤操作：

1.  **克隆仓库**
    ```bash
    git clone https://github.com/OpenWebGAL/mcp-server.git
    cd mcp-server
    ```

2.  **安装依赖**
    我们使用 `pnpm` 作为包管理器。
    ```bash
    pnpm install
    ```

3.  **开发模式**
    运行以下命令以在监视模式下启动服务器。当源文件发生改变时，服务器会自动重启。
    ```bash
    pnpm run dev
    ```

4.  **构建项目**
    将 TypeScript 代码编译为 JavaScript。
    ```bash
    pnpm run build
    ```
    编译后的文件将位于 `dist` 目录。
