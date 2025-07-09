# WebGAL Tools

WebGAL Tools 是一套为 WebGAL 视觉小说引擎提供的工具集，专注于语音合成、资源管理和开发辅助功能。

## 快速入门

👉 **[查看快速入门指南](./QuickStart.md)** - 适合新用户的详细使用教程

## 项目概述

WebGAL Tools 是一个模块化工具集，主要包含以下组件：

- **语音合成服务 (Voice)** - 基于 GPT-SoVITS 的语音合成系统，支持静态和动态角色配置
- **MCP 服务器 (MCP-Server)** - 实现 Model Context Protocol 的服务器，提供智能上下文处理
- **配置管理 (Config)** - 统一的配置管理系统，支持模板和初始化
- **命令行工具 (CLI)** - 提供命令行界面，方便集成到开发工作流
- **Web UI (Voice-UI)** - 图形化界面，简化配置和操作流程

该工具集设计用于简化 WebGAL 游戏开发中的语音合成工作流，支持多语言翻译、情感识别和批量处理。

## 架构设计

### 整体架构

```
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│     Voice-UI      │     │        CLI        │     │  外部编辑器集成   │
│  (Next.js 前端)   │     │   (命令行界面)    │     │  (VSCode 等)      │
└─────────┬─────────┘     └─────────┬─────────┘     └─────────┬─────────┘
          │                         │                         │
          │                         │                         │
┌─────────▼─────────────────────────▼─────────────────────────▼─────────┐
│                                                                       │
│                         统一配置管理 (Config)                         │
│                                                                       │
└─────────┬─────────────────────────┬─────────────────────────┬─────────┘
          │                         │                         │
┌─────────▼─────────┐     ┌─────────▼─────────┐     ┌─────────▼─────────┐
│                   │     │                   │     │                   │
│   语音合成服务     │     │    MCP 服务器     │      │   资源扫描工具     │
│     (Voice)       │     │   (MCP-Server)    │     │  (Asset Scanner)  │
│                   │     │                   │     │                   │
└─────────┬─────────┘     └─────────┬─────────┘     └─────────┬─────────┘
          │                         │                         │
          │                         │                         │
┌─────────▼─────────┐     ┌─────────▼─────────┐     ┌─────────▼─────────┐
│                   │     │                   │     │                   │
│   GPT-SoVITS API  │     │ Model Context     │     │  WebGAL 游戏资源   │
│  (外部语音服务)    │     │ Protocol          │     │  (场景、图像等)    │
│                   │     │                   │     │                   │
└───────────────────┘     └───────────────────┘     └───────────────────┘
```

### 核心模块

1. **语音合成服务 (Voice)**
   - 负责处理文本到语音的转换
   - 支持角色配置、情感识别和多语言翻译
   - 实现了并行处理和任务调度算法

2. **MCP 服务器 (MCP-Server)**
   - 实现 Model Context Protocol 标准
   - 提供 SSE 和 stdio 两种通信模式
   - 支持上下文感知的智能处理

3. **配置管理 (Config)**
   - 提供统一的配置模板和初始化功能
   - 管理语音合成和 MCP 服务的配置
   - 支持配置验证和备份

4. **日志系统 (Logger)**
   - 提供统一的日志接口
   - 支持不同级别的日志记录
   - 便于调试和问题排查

## 特性详解

### 并行处理与调度算法

语音合成服务采用了高效的并行处理机制，主要包括：

1. **翻译任务并行处理**
   - 基于 Promise 的并发控制，而非多进程
   - 可配置的最大并发数，避免 API 限流
   - 自动队列管理，确保资源合理分配

2. **语音合成任务调度**
   - 单线程合成队列，避免模型切换冲突
   - 基于角色和情感的智能模型选择
   - 模型组合缓存，减少不必要的模型加载

3. **动态资源分配**
   - 根据任务类型和系统负载动态调整资源
   - 优先级队列，确保关键任务先执行
   - 失败任务自动重试机制

```typescript
// 并发控制示例
private async limitConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
  onProgress?: (completed: number, total: number, result: T) => void
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];
  let completed = 0;

  for (const task of tasks) {
    const promise = task().then((result) => {
      completed++;
      results.push(result);
      if (onProgress) {
        onProgress(completed, tasks.length, result);
      }
    });

    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => 
        p === promise || (p as any)._isCompleted
      ), 1);
    }
  }

  await Promise.all(executing);
  return results;
}
```

### 上下文感知与智能处理

系统实现了智能的上下文处理机制：

1. **上下文提取**
   - 自动分析对话前后关系
   - 智能判断需要的上下文范围
   - 支持多语言的代词和指示词识别

2. **情感识别**
   - 基于对话内容分析情感
   - 自动选择最匹配的模型和参考音频
   - 支持多维度情感分类

3. **模型匹配算法**
   - 基于文件名和路径的语义匹配
   - 确保 GPT 和 SoVITS 模型兼容性
   - 支持递归目录扫描和模型分组

```typescript
// 智能上下文提取示例
static smartExtractContext(
  dialogue: DialogueChunk,
  allDialogues: DialogueChunk[],
  currentIndex: number
): ContextInfo {
  let contextSize = 2; // 默认上下文大小

  // 检查是否包含代词或指示词，如果有则需要更多上下文
  const needsMoreContext = this.needsMoreContext(dialogue.text);
  if (needsMoreContext) {
    contextSize = 4; // 增加上下文大小
  }

  // 检查是否是对话的开始或结束
  if (currentIndex === 0) {
    // 对话开始，只需要后面的上下文
    contextSize = Math.min(contextSize, 3);
  } else if (currentIndex === allDialogues.length - 1) {
    // 对话结束，只需要前面的上下文
    contextSize = Math.min(contextSize, 3);
  }

  return this.extractContext(allDialogues, currentIndex, contextSize);
}
```

### 外部通信机制

系统支持多种通信机制，便于与其他工具和服务集成：

1. **SSE (Server-Sent Events)**
   - 提供实时的单向通信
   - 支持多客户端连接
   - 会话管理和自动重连

2. **stdio 模式**
   - 适用于命令行和编辑器集成
   - 低延迟、高效率的通信
   - 支持标准输入输出流

3. **RESTful API**
   - 提供 HTTP 接口
   - 支持配置管理和状态查询
   - 健康检查和监控端点

```typescript
// SSE 服务器示例
app.get('/connect', async (req: Request, res: Response) => {
  try {
    logger.info('收到连接请求');
    
    // 创建新的SSE transport
    const transport = new SSEServerTransport(POST_ENDPOINT, res);
    logger.info('创建新的transport，session ID:', transport.sessionId);
    
    // 存储transport
    transports[transport.sessionId] = transport;
    
    // 监听连接关闭事件
    res.on('close', () => {
      logger.info('SSE连接已关闭');
      delete transports[transport.sessionId];
    });
    
    // 连接MCP服务器
    await server.connect(transport);
    
    logger.info('SSE连接已建立');
    
  } catch (error) {
    logger.error('建立SSE连接时发生错误:', error);
    res.status(500).json({ error: '建立连接失败' });
  }
});
```

## 开发者指南

### 项目结构

```
webgal-mcp/
  ├─ apps/                  # 应用程序
  │   ├─ cli/              # 命令行工具
  │   ├─ mcp-server/       # MCP 服务器
  │   ├─ voice/            # 语音合成服务
  │   └─ voice-ui/         # Web UI 界面
  ├─ packages/              # 共享包
  │   ├─ config/           # 配置管理
  │   └─ logger/           # 日志系统
  ├─ pnpm-workspace.yaml   # 工作区配置
  └─ package.json          # 项目配置
```

### 安装开发环境

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 开发模式
pnpm dev
```

### 模块扩展

1. **添加新的翻译服务**
   - 实现 `ITranslationService` 接口
   - 在 `TranslationServiceFactory` 中注册
   - 更新配置类型定义

2. **扩展情感识别**
   - 在 `context.ts` 中添加新的情感类型
   - 更新情感匹配算法
   - 添加新的情感关键词

3. **自定义模型扫描**
   - 修改 `model-scanner.ts` 中的扫描逻辑
   - 更新文件匹配规则
   - 添加新的模型类型支持

### 调试技巧

1. **日志级别**
   - 检查 `.voice-backups` 目录中的备份文件
   - 使用健康检查端点监控服务状态

2. **性能优化**
   - 调整 `max_translator` 配置优化并发
   - 监控内存使用和 CPU 负载
   - 使用 `--verbose` 模式获取详细性能数据

3. **常见问题**
   - 模型路径问题：使用绝对路径或软链接
   - 并发限制：检查 API 限流和系统资源
   - 编码问题：确保文本和文件名使用 UTF-8

## 贡献指南

欢迎贡献代码、报告问题或提出新功能建议。请遵循以下步骤：

1. Fork 仓库并创建你的分支
2. 添加测试用例（如适用）
3. 提交代码并确保所有测试通过
4. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](./LICENSE) 文件
