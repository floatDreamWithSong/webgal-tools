'use client'

import { useState, useEffect, useCallback } from 'react'
import { CharacterConfig } from './types'
import { FileUpload } from './FileUpload'
import { ModelScanner } from './ModelScanner'
import { InferenceSettings } from './InferenceSettings'

interface CharacterCardProps {
  character: CharacterConfig
  index: number
  onUpdate: (index: number, field: keyof CharacterConfig, value: unknown) => void
  onRemove: (index: number) => void
  gptSovitsPath: string
  modelVersion: string
}

interface ValidationErrors {
  character_name?: string
  gpt?: string
  sovits?: string
  ref_audio?: string
  ref_text?: string
}

export function CharacterCard({ 
  character, 
  index, 
  onUpdate, 
  onRemove, 
  gptSovitsPath, 
  modelVersion 
}: CharacterCardProps) {
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showGptScanner, setShowGptScanner] = useState(false)
  const [showSovitsScanner, setShowSovitsScanner] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // 校验函数
  const validateField = (field: string, value: unknown): string | undefined => {
    switch (field) {
      case 'character_name':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          return '角色名称是必填项'
        }
        break
      case 'gpt':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          return 'GPT 模型路径是必填项'
        }
        if (!character.auto && !value.endsWith('.ckpt')) {
          return '非自动模式下，GPT 模型路径必须是 .ckpt 文件'
        }
        if (character.auto && value.endsWith('.ckpt')) {
          return '自动模式下，GPT 模型路径必须是文件夹'
        }
        break
      case 'sovits':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          return 'SoVITS 模型路径是必填项'
        }
        if (!character.auto && !value.endsWith('.pth')) {
          return '非自动模式下，SoVITS 模型路径必须是 .pth 文件'
        }
        if (character.auto && value.endsWith('.pth')) {
          return '自动模式下，SoVITS 模型路径必须是文件夹'
        }
        break
      case 'ref_audio':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          return '参考音频路径是必填项'
        }
        if (!character.auto && !value.match(/\.(wav|mp3|flac)$/i)) {
          return '非自动模式下，参考音频路径必须是音频文件'
        }
        if (character.auto && value.match(/\.(wav|mp3|flac)$/i)) {
          return '自动模式下，参考音频路径必须是文件夹'
        }
        break
      case 'ref_text':
        if (!character.auto && (!value || typeof value !== 'string' || value.trim() === '')) {
          return '非自动模式下，参考文本是必填项'
        }
        break
    }
    return undefined
  }

  // 校验所有字段
  const validateAll = useCallback(() => {
    const newErrors: ValidationErrors = {};
    newErrors.character_name = validateField('character_name', character.character_name);
    newErrors.gpt = validateField('gpt', character.gpt);
    newErrors.sovits = validateField('sovits', character.sovits);
    newErrors.ref_audio = validateField('ref_audio', character.ref_audio);
    newErrors.ref_text = validateField('ref_text', character.ref_text);
    setErrors(newErrors);
    return Object.values(newErrors).every(error => !error);
  }, [character]);

  // 处理字段变化
  const handleFieldChange = (field: keyof ValidationErrors, value: unknown) => {
    onUpdate(index, field as keyof CharacterConfig, value)
    
    // 如果字段已经被触摸过，立即校验
    if (touched[field]) {
      const error = validateField(field, value)
      setErrors(prev => ({ ...prev, [field]: error }))
    }
  }

  // 处理字段失焦
  const handleFieldBlur = (field: keyof ValidationErrors) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const value = character[field as keyof typeof character]
    const error = validateField(field, value)
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  // 获取字段的 CSS 类
  const getFieldClassName = (field: keyof ValidationErrors) => {
    const baseClass = "w-[98%] ml-[1%] px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
    const hasError = touched[field] && errors[field]
    
    if (hasError) {
      return `${baseClass} border-red-500 focus:ring-red-500`
    }
    return `${baseClass} border-gray-300 focus:ring-blue-500`
  }

  // 处理文件上传
  const handleFileUpload = (filePath: string, fileName: string) => {
    onUpdate(index, 'ref_audio', filePath)
    onUpdate(index, 'ref_text', fileName)
    setShowFileUpload(false)
  }

  // 处理模型选择
  const handleModelSelect = (field: 'gpt' | 'sovits', filePath: string) => {
    onUpdate(index, field, filePath)
  }

  // 处理推理配置更新
  const handleInferenceConfigChange = (updates: Partial<CharacterConfig['inferrence_config']>) => {
    onUpdate(index, 'inferrence_config', {
      ...character.inferrence_config,
      ...updates
    })
  }

  // 当自动模式改变时重新校验
  useEffect(() => {
    validateAll()
  }, [character.auto, validateAll])

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-500 hover:text-gray-700 transition-transform"
            style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <h4 className="text-md font-medium text-gray-900">
            角色 {index + 1}: {character.character_name || '未命名'}
          </h4>
        </div>
        <button
          onClick={() => onRemove(index)}
          className="text-red-500 hover:text-red-700"
        >
          删除
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="grid grid-cols-1 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={character.character_name}
                onChange={(e) => handleFieldChange('character_name', e.target.value)}
                onBlur={() => handleFieldBlur('character_name')}
                className={getFieldClassName('character_name')}
                placeholder="输入角色名称"
              />
              {touched.character_name && errors.character_name && (
                <p className="mt-1 text-sm text-red-600">{errors.character_name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                翻译目标语言
              </label>
              <input
                type="text"
                value={character.translate_to}
                onChange={(e) => onUpdate(index, 'translate_to', e.target.value)}
                className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：日文"
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`auto-${index}`}
                checked={character.auto || false}
                onChange={(e) => onUpdate(index, 'auto', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor={`auto-${index}`} className="text-sm font-medium text-gray-700">
                启用自动情绪识别
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GPT 模型{character.auto ? '文件夹' : '文件'}路径 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={character.gpt}
                  onChange={(e) => handleFieldChange('gpt', e.target.value)}
                  onBlur={() => handleFieldBlur('gpt')}
                  className={getFieldClassName('gpt')}
                  placeholder={character.auto ? "GPT_weights_v2ProPlus/character_folder" : "GPT_weights_v2ProPlus/character.ckpt"}
                />
                {!character.auto && gptSovitsPath && (
                  <button
                    onClick={() => setShowGptScanner(true)}
                    className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                  >
                    扫描
                  </button>
                )}
              </div>
              {touched.gpt && errors.gpt && (
                <p className="mt-1 text-sm text-red-600">{errors.gpt}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SoVITS 模型{character.auto ? '文件夹' : '文件'}路径 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={character.sovits}
                  onChange={(e) => handleFieldChange('sovits', e.target.value)}
                  onBlur={() => handleFieldBlur('sovits')}
                  className={getFieldClassName('sovits')}
                  placeholder={character.auto ? "SoVITS_weights_v2ProPlus/character_folder" : "SoVITS_weights_v2ProPlus/character.pth"}
                />
                {!character.auto && gptSovitsPath && (
                  <button
                    onClick={() => setShowSovitsScanner(true)}
                    className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                  >
                    扫描
                  </button>
                )}
              </div>
              {touched.sovits && errors.sovits && (
                <p className="mt-1 text-sm text-red-600">{errors.sovits}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                参考音频{character.auto ? '文件夹' : '文件'}路径 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={character.ref_audio}
                  onChange={(e) => handleFieldChange('ref_audio', e.target.value)}
                  onBlur={() => handleFieldBlur('ref_audio')}
                  className={getFieldClassName('ref_audio')}
                  placeholder={character.auto ? "D:/AIVoice/ref_audio/character_folder" : "D:/AIVoice/ref_audio/character.wav"}
                />
                {!character.auto && !character.ref_audio && (
                  <button
                    onClick={() => setShowFileUpload(true)}
                    className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                  >
                    上传
                  </button>
                )}
              </div>
              {touched.ref_audio && errors.ref_audio && (
                <p className="mt-1 text-sm text-red-600">{errors.ref_audio}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                参考文本{!character.auto && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={character.ref_text}
                onChange={(e) => handleFieldChange('ref_text', e.target.value)}
                onBlur={() => handleFieldBlur('ref_text')}
                className={getFieldClassName('ref_text')}
                placeholder="参考音频对应的文本"
              />
              {touched.ref_text && errors.ref_text && (
                <p className="mt-1 text-sm text-red-600">{errors.ref_text}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              角色提示词
            </label>
            <textarea
              value={character.prompt || ''}
              onChange={(e) => onUpdate(index, 'prompt', e.target.value)}
              rows={2}
              className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="描述角色的口吻和特点..."
            />
          </div>

          <div className="mt-4">
            <InferenceSettings
              config={character.inferrence_config}
              onConfigChange={handleInferenceConfigChange}
            />
          </div>
        </>
      )}

      {/* 模型扫描弹窗 */}
      <ModelScanner
        isOpen={showGptScanner}
        onClose={() => setShowGptScanner(false)}
        onSelect={(filePath) => handleModelSelect('gpt', filePath)}
        modelType="gpt"
        modelVersion={modelVersion}
        gptSovitsPath={gptSovitsPath}
      />

      <ModelScanner
        isOpen={showSovitsScanner}
        onClose={() => setShowSovitsScanner(false)}
        onSelect={(filePath) => handleModelSelect('sovits', filePath)}
        modelType="sovits"
        modelVersion={modelVersion}
        gptSovitsPath={gptSovitsPath}
      />

      {/* 文件上传弹窗 */}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black/50  flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">上传参考音频</h3>
              <button
                onClick={() => setShowFileUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FileUpload onFileSelect={handleFileUpload} />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowFileUpload(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 