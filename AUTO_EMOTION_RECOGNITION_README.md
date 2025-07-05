# 智能语音模型选择功能使用指南

## 功能概述

本功能为WebGAL配音工具新增了智能模型选择能力，能够：
- 自动分析对话文本的内容和情感色彩
- 智能选择最适合的语音模型和参考音频
- 提供更加丰富多样的角色语音表现

## 配置说明

### 基本配置

在 `voice.config.json` 中为角色启用自动情绪识别：

```json
{
  "character_name": "角色名称",
  "auto": true,  // 启用自动情绪识别
  "gpt": "GPT_weights_v2ProPlus",  // GPT模型文件夹路径
  "sovits": "SoVITS_weights_v2ProPlus",  // SoVITS模型文件夹路径
  "ref_audio": "D:/AIVoice/语音模型/角色名/",  // 参考音频文件夹路径
  "ref_text": "默认参考文本",
  "prompt": "角色口吻特征描述",
  "translate_to": "日文",
  "inferrence_config": {
    // 推理配置...
  }
}
```

### 关键差异

#### 传统模式 (auto: false 或不设置)
- `gpt`: 指向具体的 `.ckpt` 文件
- `sovits`: 指向具体的 `.pth` 文件  
- `ref_audio`: 指向具体的音频文件

#### 自动模式 (auto: true)
- `gpt`: 指向包含多个 `.ckpt` 文件的文件夹
- `sovits`: 指向包含多个 `.pth` 文件的文件夹
- `ref_audio`: 指向包含多个音频文件的文件夹

## 文件组织结构

### 推荐的文件夹结构

```
D:/AIVoice/GPT-SoVITS-v2pro-20250604/
├── GPT_weights_v2ProPlus/
│   ├── character_angry.ckpt      # 愤怒情绪模型
│   ├── character_sad.ckpt        # 悲伤情绪模型
│   ├── character_happy.ckpt      # 开心情绪模型
│   ├── character_neutral.ckpt    # 中性情绪模型
│   └── character_excited.ckpt    # 兴奋情绪模型
├── SoVITS_weights_v2ProPlus/
│   ├── character_angry.pth       # 愤怒情绪模型
│   ├── character_sad.pth         # 悲伤情绪模型
│   ├── character_happy.pth       # 开心情绪模型
│   ├── character_neutral.pth     # 中性情绪模型
│   └── character_excited.pth     # 兴奋情绪模型
└── ref_audio/
    ├── angry_sample.wav          # 愤怒情绪参考音频
    ├── sad_sample.wav            # 悲伤情绪参考音频
    ├── happy_sample.wav          # 开心情绪参考音频
    ├── neutral_sample.wav        # 中性情绪参考音频
    └── excited_sample.wav        # 兴奋情绪参考音频
```

### 文件命名规则

文件名可以自由命名，AI会根据文件名和对话内容智能匹配最合适的文件。建议在文件名中包含一些描述性信息以帮助AI更好地理解，例如：

#### 命名建议

```
# 推荐的命名示例（包含描述性信息）
character_angry_01.ckpt
character_sad_sample.pth
happy_voice.wav
excited_emotion.wav
gentle_tone.ckpt
serious_speech.pth

# 也可以接受的命名
model_a.ckpt
voice_01.wav
sample_1.pth
character_ver2.ckpt

# 尽量避免的命名（缺乏描述性）
untitled.ckpt
file1.wav
temp.pth
```

**注意**: 不需要严格遵循特定的命名格式，AI会根据实际的对话内容和文件名信息进行智能选择。

## 工作流程

1. **扫描阶段**: 系统扫描指定文件夹，收集所有可用的模型和音频文件
2. **智能分析**: AI分析对话文本内容，理解情绪和语调特征
3. **智能选择**: AI从所有可用文件中选择最适合当前对话的模型组合
4. **翻译处理**: 将文本翻译为目标语言
5. **语音合成**: 使用AI选定的模型生成语音

## 配置示例

### 完整配置示例

```json
{
  "volume": 30,
  "gpt_sovits_url": "http://localhost:9872",
  "gpt_sovits_path": "D:/AIVoice/GPT-SoVITS-v2pro-20250604",
  "model_version": "v2",
  "max_translator": 1,
  "translate": {
    "model_type": "ollama",
    "base_url": "http://localhost:11434/api",
    "model_name": "gemma3",
    "check": true,
    "context_size": 2,
    "additional_prompt": "角色特征和翻译规则..."
  },
  "characters": [
    {
      "character_name": "智能角色",
      "auto": true,
      "gpt": "GPT_weights_v2ProPlus",
      "sovits": "SoVITS_weights_v2ProPlus", 
      "ref_audio": "D:/AIVoice/语音模型/智能角色/",
      "ref_text": "默认参考文本",
      "prompt": "角色口吻特征描述",
      "translate_to": "日文",
      "inferrence_config": {
        "prompt_language": "日文",
        "text_language": "日文",
        "how_to_cut": "凑四句一切",
        "top_k": 15,
        "top_p": 1.0,
        "temperature": 1.0,
        "speed": 1,
        "sample_steps": 8,
        "if_sr": false,
        "pause_second": 0.3
      }
    },
    {
      "character_name": "传统角色",
      "auto": false,
      "gpt": "GPT_weights_v2ProPlus/traditional_character.ckpt",
      "sovits": "SoVITS_weights_v2ProPlus/traditional_character.pth",
      "ref_audio": "D:/AIVoice/语音模型/传统角色/reference.wav",
      "ref_text": "参考文本",
      "prompt": "角色口吻特征描述",
      "translate_to": "日文",
      "inferrence_config": {
        "prompt_language": "日文",
        "text_language": "日文",
        "how_to_cut": "凑四句一切",
        "top_k": 15,
        "top_p": 1,
        "temperature": 1,
        "speed": 1,
        "sample_steps": 8,
        "if_sr": false,
        "pause_second": 0.5
      }
    }
  ]
}
```

## 注意事项

1. **文件路径**: 确保所有文件夹路径存在且包含相应格式的文件
2. **文件命名**: 建议使用描述性的文件名，帮助AI更好地理解和选择
3. **模型数量**: 建议为每个角色准备多个不同风格的模型文件，提供更多选择
4. **参考音频**: 参考音频应该清晰且具有不同的情绪特征
5. **翻译服务**: 确保翻译服务（如Ollama）正常运行
6. **混合使用**: 可以在同一配置中混合使用自动模式和传统模式的角色

## 故障排除

### 常见问题

1. **未找到模型文件**: 检查文件夹路径和文件扩展名
2. **模型选择失败**: 检查翻译服务是否正常运行
3. **AI选择不当**: AI会根据对话内容和文件名自动选择，如果选择不理想可以调整文件名增加描述性
4. **音频生成失败**: 检查GPT-SoVITS服务是否正常运行

### 日志查看

系统会输出详细的日志信息，包括：
- 文件扫描结果
- AI分析和选择结果
- 模型选择过程
- 语音合成状态

## 性能考虑

- 自动模式需要更多的计算资源进行AI分析和模型选择
- 建议为常用角色准备多个不同风格的模型，让AI有更多选择
- 可以根据需要在角色级别选择是否启用自动模式
- AI选择过程是实时的，文件数量较多时可能需要更长的处理时间

## 版本兼容性

本功能向后兼容，现有的配置文件无需修改即可继续使用传统模式。 