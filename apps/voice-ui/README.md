# Voice UI

WebGAL 语音合成工具的 Web 界面，为不熟悉命令行的用户提供友好的图形界面。

## 架构变更

### 从命令行调用改为直接导入

之前的版本通过 `spawn` 子进程调用 `webgal-voice` 命令，这在生产环境中存在以下问题：
- 用户电脑可能没有安装 Node.js
- 全局命令可能不存在
- 依赖外部进程增加了不稳定性

### 新架构

现在直接在源码中导入 `@webgal-tools/voice` 包的功能：

```typescript
import { VoiceGenerator } from '@webgal-tools/voice';
import { initializeConfig } from '@webgal-tools/config';
```

#### 优势：
- ✅ 不依赖外部命令和 Node.js 环境
- ✅ 更稳定的错误处理
- ✅ 更好的进度监控和日志输出
- ✅ 直接的函数调用，性能更好

## 项目结构

```
apps/voice-ui/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── voice/
│   │   │   │   ├── init/route.ts      # 初始化配置
│   │   │   │   ├── generate/route.ts  # 语音生成
│   │   │   │   └── stop/route.ts      # 停止任务
│   │   │   ├── config/route.ts        # 配置管理
│   │   │   ├── scripts/route.ts       # 脚本扫描
│   │   │   └── validate/              # 验证相关API
│   │   ├── components/
│   │   │   ├── ConfigManager.tsx      # 配置管理界面
│   │   │   ├── TaskMonitor.tsx        # 任务监控界面
│   │   │   └── LaunchSettings.tsx     # 启动设置界面
│   │   └── page.tsx                   # 主页面
│   └── lib/
│       └── voice-wrapper.ts           # Voice 功能包装器
├── package.json
└── README.md
```

## 核心功能

### 1. 配置管理
- 基本设置（音量、服务地址等）
- 翻译设置（支持多种AI模型）
- 角色配置（声音模型、参考音频等）

### 2. 任务监控
- 实时进度显示
- 任务状态统计
- 详细日志输出

### 3. 启动设置
- 工作目录验证
- 脚本文件选择
- 参数配置

## 依赖关系

```json
{
  "dependencies": {
    "@webgal-tools/voice": "workspace:*",
    "@webgal-tools/config": "workspace:*"
  }
}
```

## 开发模式

如果需要在开发环境中使用本地构建的 voice 包，可以设置环境变量：

```bash
# 开发环境配置
NODE_ENV=development
VOICE_DEV_PATH=../voice/dist/main.js
```

## 部署

### 构建
```bash
pnpm run build
```

### 启动
```bash
pnpm run start
```

### 开发
```bash
pnpm run dev
```

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS v4
- **状态管理**: React Hooks
- **实时通信**: Server-Sent Events
- **语音合成**: @webgal-tools/voice

## 环境要求

- Node.js 18+
- 现代浏览器（支持 ES2020）
- 无需额外安装全局命令

## 注意事项

1. **全局状态管理**: 当前使用 `global.currentVoiceTask` 来管理任务状态，在生产环境中建议使用更好的状态管理方案。

2. **错误处理**: 包装器会捕获所有错误并通过事件系统传递给UI。

3. **进度监控**: 通过劫持 console 输出来获取进度信息，未来可以考虑在 voice 包中添加更好的事件系统。

4. **任务停止**: 目前的停止功能相对简单，未来可以在 voice 包中增加更完善的任务取消机制。 