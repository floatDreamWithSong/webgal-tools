# OpenWebGAL MCP Server

[![npm version](https://img.shields.io/npm/v/openwebgal-mcp-server.svg)](https://www.npmjs.com/package/openwebgal-mcp-server)

一个为 [OpenWebGAL](https://github.com/OpenWebGAL/WebGAL) 文档设计的模型上下文协议 (Model-Context-Protocol) 服务器。它为大型语言模型（LLM）提供了与 WebGAL 文档和开发知识进行交互的能力。

这个服务器可以通过标准输入/输出（stdio）与兼容 MCP 的客户端进行通信。

## 功能

此 MCP 服务器提供了三种核心功能，以帮助大模型更好地理解和回答关于 WebGAL 的问题：

### 1. 工具 (Tools)

- `get_docs_directory`: 获取 `docs` 目录的结构和说明，快速了解文档的组织方式。
- `get_doc_content`: 根据指定的相对路径，获取某篇具体文档的 Markdown 内容。

### 2. 提示 (Prompts)

- `webgal_guide`: 提供一个系统提示词 (System Prompt)，将大模型设定为一个 WebGAL 开发专家，用于指导用户进行开发。
- `webgal_script_help`: 提供一个系统提示词，将大模型设定为 WebGAL 脚本语法专家，用于解答语法相关问题。
- `webgal_troubleshoot`: 提供一个系统提示词，将大模型设定为 WebGAL 技术支持专家，用于排查常见问题。

### 3. 资源 (Resources)

- **完整的 WebGAL 文档**: 将整个 `docs` 目录下的所有 Markdown 文档作为上下文资源提供给大模型。大模型可以自由读取这些文档，以获取最准确、最全面的信息来回答用户的问题。

## 安装与使用

你可以使用 `npx` 直接运行此服务器，而无需全局安装。

```bash
npx openwebgal-mcp-server
```

当服务器启动后，它会监听标准输入/输出流，等待来自 MCP 客户端的连接和请求。

## 开发指南

如果你想修改此项目，请按照以下步骤操作：

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
