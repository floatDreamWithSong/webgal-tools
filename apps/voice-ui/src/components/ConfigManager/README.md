# 配置管理器校验功能实现

## 概述

本模块实现了完整的配置校验功能，提升了用户友好度，确保配置数据的完整性和正确性。

## 已完成的功能

### 1. 基本设置校验 ✅

**文件**: `BasicSettings.tsx`

- **必填字段验证**: 所有基本设置字段都标记为必填（音量、GPT-SoVITS 服务地址、GPT-SoVITS 项目路径、模型版本、最大翻译并发数）
- **数值范围校验**: 音量 (0-100)、最大翻译并发数 (1-10)
- **URL 格式校验**: GPT-SoVITS 服务地址必须是有效的 URL
- **实时校验**: 用户输入时实时显示错误信息
- **视觉反馈**: 错误字段显示红色边框和错误提示

### 2. 翻译设置校验 ✅

**文件**: `TranslateSettings.tsx`

- **条件校验**: 仅在启用翻译服务时进行校验
- **必填字段**: 模型服务商、base-url、模型名称、上下文宽度
- **URL 格式校验**: base-url 必须是有效的 URL
- **数值范围校验**: 上下文宽度 (0-10)
- **动态校验**: 当翻译服务启用状态改变时重新校验

### 3. 角色配置校验 ✅

**文件**: `CharacterCard.tsx`

#### 基础校验
- **必填字段**: 角色名称、GPT 模型路径、SoVITS 模型路径、参考音频路径
- **条件校验**: 非自动模式下参考文本必填

#### 自动情绪识别模式校验
- **路径类型校验**: 自动模式下模型路径和音频路径必须是文件夹
- **文件类型校验**: 非自动模式下模型路径必须是对应文件类型 (.ckpt/.pth)
- **音频文件校验**: 非自动模式下音频路径必须是音频文件 (.wav/.mp3/.flac)

#### 辅助功能
- **文件上传组件**: `FileUpload.tsx` - 支持拖拽上传音频文件
- **模型扫描组件**: `ModelScanner.tsx` - 扫描 GPT/SoVITS 模型文件
- **智能填充**: 上传音频后自动填充路径和参考文本

### 4. 事件广播系统 ✅

**文件**: `eventBus.ts`, `useConfigEvents.ts`

- **事件类型**: 配置保存、加载、角色添加/删除/更新
- **事件总线**: 全局事件管理系统
- **自定义 Hook**: 便捷的事件监听接口
- **数据刷新**: 配置文件操作后自动广播更新事件

## 组件结构

```
ConfigManager/
├── index.tsx              # 主配置管理器
├── BasicSettings.tsx      # 基本设置（带校验）
├── TranslateSettings.tsx  # 翻译设置（带校验）
├── CharacterSettings.tsx  # 角色设置容器
├── CharacterCard.tsx      # 角色卡片（带校验）
├── FileUpload.tsx         # 文件上传组件
├── ModelScanner.tsx       # 模型文件扫描组件
├── eventBus.ts           # 事件总线系统
├── useConfigEvents.ts    # 事件监听 Hook
├── types.ts              # 类型定义
└── README.md             # 本文档
```

## 使用示例

### 监听配置事件

```typescript
import { useConfigSaved, useCharacterEvents } from './useConfigEvents'

function MyComponent() {
  useConfigSaved((event) => {
    console.log('配置已保存:', event.data)
    // 刷新相关数据
  })

  useCharacterEvents((event) => {
    console.log('角色配置变更:', event.type, event.data)
    // 更新角色相关数据
  })

  return <div>...</div>
}
```

### 触发配置事件

```typescript
import { emitConfigEvent } from './eventBus'

// 保存配置后
emitConfigEvent('config-saved', { workDir, config })

// 添加角色后
emitConfigEvent('character-added', { character, index })
```

## 校验规则总结

### 基本设置
- ✅ 音量: 必填，范围 0-100
- ✅ GPT-SoVITS 服务地址: 必填，有效 URL
- ✅ GPT-SoVITS 项目路径: 必填
- ✅ 模型版本: 必填，从下拉列表选择
- ✅ 最大翻译并发数: 必填，范围 1-10

### 翻译设置（启用时）
- ✅ 模型服务商: 必填
- ✅ 模型 API baseUrl: 必填，有效 URL
- ✅ 模型名称: 必填
- ✅ 上下文宽度: 必填，范围 0-10

### 角色配置
- ✅ 角色名称: 必填
- ✅ GPT 模型路径: 必填，根据模式校验文件/文件夹
- ✅ SoVITS 模型路径: 必填，根据模式校验文件/文件夹
- ✅ 参考音频路径: 必填，根据模式校验文件/文件夹
- ✅ 参考文本: 非自动模式下必填

## 技术特点

1. **类型安全**: 完整的 TypeScript 类型定义
2. **用户体验**: 实时校验、清晰的错误提示
3. **可扩展性**: 模块化设计，易于添加新的校验规则
4. **事件驱动**: 配置变更自动广播，支持数据同步
5. **响应式**: 支持拖拽上传、文件扫描等交互功能

## 后续优化建议

1. **后端集成**: 实现真实的文件扫描 API
2. **路径验证**: 添加文件系统路径有效性检查
3. **批量操作**: 支持批量导入角色配置
4. **配置模板**: 提供预设配置模板
5. **导入导出**: 支持配置文件导入导出功能 