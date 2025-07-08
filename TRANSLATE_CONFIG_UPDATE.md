# 翻译配置更新说明

## 新增配置项

为翻译服务添加了两个新的配置项，允许用户更精细地控制AI模型的行为：

### 1. temperature（温度参数）

- **类型**: `number`
- **范围**: 0-2
- **默认值**: 0.3
- **说明**: 控制模型输出的随机性
  - 较低的值（如0.1-0.3）：输出更确定、一致
  - 较高的值（如0.7-1.0）：输出更随机、创造性
  - 建议翻译任务使用较低的值以获得更稳定的结果

### 2. max_tokens（最大输出Token数）

- **类型**: `number`
- **范围**: 1-4000
- **默认值**: 512
- **说明**: 限制模型输出的最大token数量
  - 较小的值：响应更快，但可能被截断
  - 较大的值：响应更完整，但可能更慢
  - 对于翻译任务，通常512-1000就足够了

## 配置文件示例

```json
{
  "translate": {
    "model_type": "ollama",
    "base_url": "http://localhost:11434/api",
    "model_name": "glm4:9b",
    "check": true,
    "context_size": 2,
    "temperature": 0.3,
    "max_tokens": 512,
    "additional_prompt": "自定义提示词..."
  }
}
```

## UI界面更新

在翻译设置界面中新增了两个配置项：

1. **模型温度参数**: 数字输入框，范围0-2，步长0.1
2. **最大输出Token数**: 数字输入框，范围1-4000

两个字段都包含：
- 实时验证
- 错误提示
- 默认值显示
- 帮助说明

## 向后兼容性

- 新字段都是可选的（`?`）
- 如果未配置，将使用默认值
- 现有配置文件无需修改即可继续使用

## 技术实现

### 类型定义更新

- `packages/config/src/types.ts`: 添加新字段到 `TranslateConfig` 接口
- `apps/voice/src/config.ts`: 更新本地 `TranslateConfig` 接口
- `apps/voice-ui/src/components/ConfigManager/types.ts`: 更新UI类型定义

### 翻译服务更新

- `apps/voice/src/translate/index.ts`: 使用配置中的参数替代硬编码值
- 在 `selectModelAndTranslate` 和 `translate` 方法中应用新参数

### 配置验证

- 添加了新字段的验证逻辑
- 确保值在有效范围内
- 提供清晰的错误信息

### UI组件更新

- `apps/voice-ui/src/components/ConfigManager/TranslateSettings.tsx`: 添加新的配置项
- 包含输入验证和错误处理
- 提供用户友好的界面

## 使用建议

1. **翻译任务**: 建议使用 `temperature: 0.3` 和 `max_tokens: 512`
2. **创意任务**: 可以尝试 `temperature: 0.7-1.0`
3. **长文本翻译**: 可以增加 `max_tokens` 到 1000-2000
4. **快速响应**: 可以降低 `max_tokens` 到 256-512 