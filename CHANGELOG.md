# Changelog

所有重要的变更都会记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [2.1.0] - 2025-07-04

### 🎉 重大架构升级：全面JSON化配置 + CLI工具完全分离

**1. 废弃环境变量，全面JSON化**
- 🚫 **完全废弃`.env`文件支持**: 移除所有环境变量依赖，避免隐性问题
- 📋 **JSON配置系统**: 采用更清晰直观的JSON配置文件
  - `mcp.config.json`: MCP服务器的资产目录配置
  - `voice.config.json`: 语音合成和翻译配置（含`max_translator`字段）
- 🔧 **配置迁移**: `MAX_TRANSLATOR`从环境变量迁移到`voice.config.json`
- ✨ **更好的用户体验**: JSON格式一目了然，易于编辑和版本控制

**2. 功能包独立化**
- 🔀 **完全分离MCP服务器和语音合成功能**，现在提供两个独立的CLI工具
- 🛠️ **webgal-mcp-server**: 专注于MCP文档服务和资源管理
- 🎵 **webgal-voice**: 专注于语音合成和翻译功能

**新的CLI命令**

MCP服务器:
```bash
webgal-mcp-server -webgal ./game init         # 初始化mcp.config.json
webgal-mcp-server -webgal ./game              # stdio模式
webgal-mcp-server -webgal ./game -sse         # SSE模式,默认端口3333
webgal-mcp-server -webgal ./game -sse -port 3001  # 自定义端口
```

语音工具:
```bash
webgal-voice -webgal ./game init              # 初始化voice.config.json
webgal-voice -webgal ./game -voice input.txt  # 生成语音
```

**架构改进**
- ✅ **配置管理重构**: 完全移除环境变量支持，只使用JSON配置
- ✅ **单一职责**: MCP服务器只处理MCP协议，语音工具只处理语音合成
- ✅ **独立部署**: 两个功能包可以独立安装和使用
- ✅ **更安全的配置**: 避免环境变量的潜在错误和隐性问题
- ✅ **更好的用户体验**: 每个工具都有专门的帮助信息和错误提示

**重大变更和移除**
- ❌ **完全移除`.env`文件支持**: 不再支持任何环境变量配置
- ❌ **移除Zod依赖**: 使用更简单直接的JSON验证
- ❌ 从MCP服务器中移除了语音合成相关代码
- ❌ 移除了混合模式的复杂参数处理

**迁移指南**
```bash
# 删除旧的.env文件（不再支持）
rm .env

# 初始化新的JSON配置文件
npx openwebgal-mcp-server -webgal ./game init  # 生成 mcp.config.json
npx openwebgal-voice -webgal ./game init       # 生成 voice.config.json

# 手动将原MAX_TRANSLATOR值填入voice.config.json的max_translator字段
```

## [1.2.2] - 2025-06-22

### 新增
- CHANGELOG.md
- WebGal MCP 服务器初始版本
- 资源扫描工具
- 文档查询功能
- 场景管理工具
- Live2D 工具支持
- 翻译服务集成
- GPT-SOVITS集成
- 并行工作机制

### 变更
- 无

### 修复
- 无

### 移除
- 无

## [1.2.3] - 2025-06-24

### 新增
- 新增日志输出和日志文件能力，便于调试和反馈

### 变更
- 优化编译器机制，能够解析多行文本，并提供一定的格式化能力
- 优化了入口文件的逻辑表现，更多的注释

### 修复
- 无

### 移除
- 无

## [1.3.0] - 2025-06-24

### 新增
- 无

### 变更
- 修改模型json文件的匹配和表情动作的获取，使其更加具有通用性！

### 修复
- 无

### 移除
- 无

## [1.4.0] - 2025-07-02

### 新增
- 无

### 变更
- 翻译并发机制优化为异步单线程

### 修复
- 无

### 移除
- 无

## [1.5.0] - 2025-07-04

### 新增
- 新增SSE (Server-Sent Events) transport支持
- 新增基于HTTP的MCP服务器模式
- 新增多客户端并发连接支持
- 新增健康检查API端点 (`/health`)
- 新增Express服务器集成
- 新增SSE服务器启动参数 (`--sse`, `--port`)

### 变更
- 保持stdio模式作为默认运行模式
- 优化服务器启动流程，支持多种运行模式
- 更新package.json脚本，添加SSE相关命令
- 更新README.md，添加SSE使用指南和模式对比

### 修复
- 无

### 移除
- 无

## [2.0.0] - 2025-07-04

### 重大变更 (Breaking Changes)
- 🏗️ **重构为多包管理架构**: 使用Turborepo将项目拆分为多个独立的npm包
- 📦 **新的包结构**: 
  - `apps/mcp-server`: MCP服务器应用
  - `apps/voice`: 语音合成应用  
  - `packages/config`: 统一配置管理包
  - `packages/logger`: 统一日志服务包

### 新增
- 新增Turborepo支持，实现高效的多包构建和开发
- 新增统一的配置管理系统 (`@webgal-mcp/config`)
- 新增统一的日志服务 (`@webgal-mcp/logger`)
- 新增workspace依赖管理，支持包间引用
- 新增独立的语音合成应用模块

### 变更
- 将所有源代码重新组织到对应的包中
- 更新构建系统，支持并行构建多个包
- 更新文档路径，知识库文档移动到 `apps/mcp-server/resource/docs`
- 更新配置示例文件位置到 `packages/config/example`
- 更新所有导入路径以使用新的包结构

### 修复
- 修复类型兼容性问题
- 修复包间依赖关系
- 修复资源文件路径解析

### 移除
- 移除根目录下的旧源代码结构
- 移除旧的配置文件加载方式

### 迁移指南
- 构建命令: `pnpm build` (使用turbo并行构建)
- 运行命令: `pnpm serve` 或 `node apps/mcp-server/dist/main.js`
- 配置文件: 示例文件位于 `packages/config/example/`


---

## 版本类型说明

- **新增**: 新功能
- **变更**: 现有功能的变更
- **修复**: 问题修复
- **移除**: 移除的功能
- **安全**: 安全相关的修复 