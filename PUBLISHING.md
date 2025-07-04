# WebGAL MCP 发布指南

本文档说明如何分发 `apps` 下的多个子包。

## 📦 包结构

```
webgal-mcp/
├── apps/
│   ├── mcp-server/     # MCP服务器应用 (@webgal-mcp/mcp-server)
│   └── voice/          # 语音合成应用 (@webgal-mcp/voice)
├── packages/
│   ├── config/         # 配置包 (@webgal-mcp/config)
│   └── logger/         # 日志包 (@webgal-mcp/logger)
└── scripts/
    └── publish.js      # 发布脚本
```

## 🚀 发布流程

### 1. 准备工作

确保你已经：
- 登录到 npm：`pnpm login`
- 有发布权限到 `@webgal-mcp` 组织（或创建该组织）
- 代码已经提交到 git

**注意**：所有包都配置为公共包（`"access": "public"`），这意味着任何人都可以安装使用，无需付费。

### 2. 检查当前状态

```bash
pnpm run publish:check
```

这会显示所有包的当前版本号。

### 3. 更新版本号

```bash
# 更新所有包到新版本
pnpm run publish:version 1.6.0

# 或者使用脚本
node scripts/publish.js version 1.6.0
```

### 4. 构建所有包

```bash
pnpm run publish:build
```

### 5. 发布包

#### 发布正式版本
```bash
pnpm run publish:all
```

#### 发布测试版本
```bash
# 发布 beta 标签
node scripts/publish.js publish 1.6.0 beta
```

#### 一键发布（构建 + 发布）
```bash
pnpm run release
```

## 📋 发布顺序

发布脚本会自动按以下顺序发布：

1. **packages/config** - 配置包
2. **packages/logger** - 日志包  
3. **apps/mcp-server** - MCP服务器应用
4. **apps/voice** - 语音合成应用

这个顺序确保了依赖关系正确。

## 🏷️ 版本标签

- `latest` - 正式版本（默认）
- `beta` - 测试版本
- `alpha` - 预览版本

## 📁 发布内容

每个包只会发布以下内容：

### apps/mcp-server
- `dist/**/*` - 编译后的代码
- `resource/**/*` - 资源文件

### apps/voice  
- `dist/**/*` - 编译后的代码

### packages/*
- `dist/**/*` - 编译后的代码
- `package.json` - 包配置

## 🔧 手动发布

如果需要手动发布单个包：

```bash
# 进入包目录
cd apps/mcp-server

# 构建
pnpm run build

# 发布
pnpm publish --tag latest
```

## 🐛 故障排除

### 发布失败
1. 检查是否已登录 npm：`pnpm whoami`
2. 检查包名是否正确
3. 检查版本号是否已存在
4. 检查是否有发布权限
5. 如果是 402 错误，说明需要付费发布私有包，请确保包配置为公共包（`"access": "public"`）

### 依赖问题
1. 确保 `packages` 先于 `apps` 发布
2. 检查 `workspace:*` 依赖是否正确解析

### 构建失败
1. 运行 `pnpm run clean` 清理
2. 重新安装依赖：`pnpm install`
3. 检查 TypeScript 错误

## 📝 发布检查清单

- [ ] 代码已提交到 git
- [ ] 所有测试通过
- [ ] 版本号已更新
- [ ] 已登录 npm
- [ ] 有发布权限
- [ ] 构建成功
- [ ] 发布成功

## 🔄 自动化发布

可以配置 GitHub Actions 来自动化发布流程：

```yaml
name: Publish
on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm run release
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 📞 支持

如果遇到问题，请：
1. 检查本文档
2. 查看 npm 发布日志
3. 联系项目维护者 