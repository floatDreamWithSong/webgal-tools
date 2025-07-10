'use client'

import { useState, useEffect, useCallback } from 'react'
import { TranslateConfig } from '@webgal-tools/config'

interface TranslateSettingsProps {
  translate: TranslateConfig
  onTranslateChange: (updates: Partial<TranslateConfig>) => void
}

interface ValidationErrors {
  model_type?: string
  base_url?: string
  model_name?: string
  context_size?: string
  temperature?: string
  max_tokens?: string
}

export function TranslateSettings({ translate, onTranslateChange }: TranslateSettingsProps) {
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // 校验函数
  const validateField = useCallback((field: string, value: unknown): string | undefined => {
    if (!translate.check) return undefined // 如果未启用翻译服务，不进行校验

    switch (field) {
      case 'model_type':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          return '模型服务商是必填项'
        }
        break
      case 'base_url':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          return '模型 API baseUrl 是必填项'
        }
        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          return '请输入有效的 URL 地址'
        }
        break
      case 'model_name':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          return '模型名称是必填项'
        }
        break
      case 'context_size':
        if (value === undefined || value === null || value === '') {
          return '上下文宽度是必填项'
        }
        const contextSizeNum = Number(value)
        if (isNaN(contextSizeNum) || contextSizeNum < 0 || contextSizeNum > 10) {
          return '上下文宽度必须在 0-10 之间'
        }
        break
      case 'temperature':
        if (value !== undefined && value !== null && value !== '') {
          const tempNum = Number(value)
          if (isNaN(tempNum) || tempNum < 0 || tempNum > 2) {
            return '温度参数必须在 0-2 之间'
          }
        }
        break
      case 'max_tokens':
        if (value !== undefined && value !== null && value !== '') {
          const tokensNum = Number(value)
          if (isNaN(tokensNum) || tokensNum < 1 || tokensNum > 4000) {
            return '最大token数必须在 1-4000 之间'
          }
        }
        break
    }
    return undefined
  }, [translate.check])

  // 校验所有字段
  const validateAll = useCallback(() => {
    if (!translate.check) {
      setErrors({});
      return true;
    }
    const newErrors: ValidationErrors = {};
    newErrors.model_type = validateField('model_type', translate.model_type);
    newErrors.base_url = validateField('base_url', translate.base_url);
    newErrors.model_name = validateField('model_name', translate.model_name);
    newErrors.context_size = validateField('context_size', translate.context_size);
    newErrors.temperature = validateField('temperature', translate.temperature);
    newErrors.max_tokens = validateField('max_tokens', translate.max_tokens);
    setErrors(newErrors);
    return Object.values(newErrors).every(error => !error);
  }, [translate, validateField]);

  // 处理字段变化
  const handleFieldChange = (field: keyof ValidationErrors, value: unknown) => {
    onTranslateChange({ [field]: value })
    
    // 如果字段已经被触摸过，立即校验
    if (touched[field]) {
      const error = validateField(field, value)
      setErrors(prev => ({ ...prev, [field]: error }))
    }
  }

  // 处理字段失焦
  const handleFieldBlur = (field: keyof ValidationErrors) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const value = translate[field as keyof typeof translate]
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

  // 当翻译服务启用状态改变时重新校验
  useEffect(() => {
    validateAll()
  }, [translate.check, validateAll])

  return (
    <div className="space-y-4 flex-1 overflow-y-auto">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="translate-check"
          checked={translate.check}
          onChange={(e) => onTranslateChange({ check: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="translate-check" className="text-sm font-medium text-gray-700">
          启用翻译服务
        </label>
      </div>

      {translate.check && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模型服务商 <span className="text-red-500">*</span>
              </label>
              <select
                value={translate.model_type}
                onChange={(e) => handleFieldChange('model_type', e.target.value)}
                onBlur={() => handleFieldBlur('model_type')}
                className={getFieldClassName('model_type')}
              >
                <option value="">请选择模型服务商</option>
                <option value="ollama">Ollama</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
                <option value="mistral">Mistral</option>
                <option value="cohere">Cohere</option>
                <option value="custom">Custom</option>
              </select>
              {touched.model_type && errors.model_type && (
                <p className="mt-1 text-sm text-red-600">{errors.model_type}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模型 API baseUrl <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={translate.base_url}
                onChange={(e) => handleFieldChange('base_url', e.target.value)}
                onBlur={() => handleFieldBlur('base_url')}
                className={getFieldClassName('base_url')}
                placeholder="http://localhost:11434/api"
              />
              {touched.base_url && errors.base_url && (
                <p className="mt-1 text-sm text-red-600">{errors.base_url}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模型名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={translate.model_name}
                onChange={(e) => handleFieldChange('model_name', e.target.value)}
                onBlur={() => handleFieldBlur('model_name')}
                className={getFieldClassName('model_name')}
                placeholder="glm4:9b"
              />
              {touched.model_name && errors.model_name && (
                <p className="mt-1 text-sm text-red-600">{errors.model_name}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API 密钥（本地Ollama服务可不填）
              </label>
              <input
                type="password"
                value={translate.api_key || ''}
                onChange={(e) => onTranslateChange({ api_key: e.target.value })}
                className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="留空如果不需要"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                上下文宽度（行） <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={translate.context_size}
                onChange={(e) => handleFieldChange('context_size', parseInt(e.target.value) || 0)}
                onBlur={() => handleFieldBlur('context_size')}
                className={getFieldClassName('context_size')}
              />
              {touched.context_size && errors.context_size && (
                <p className="mt-1 text-sm text-red-600">{errors.context_size}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模型温度参数
              </label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={translate.temperature ?? 0.3}
                onChange={(e) => handleFieldChange('temperature', parseFloat(e.target.value) || 0.3)}
                onBlur={() => handleFieldBlur('temperature')}
                className={getFieldClassName('temperature')}
                placeholder="0.3"
              />
              <p className="mt-1 text-sm text-gray-500">控制输出的随机性，0-2之间，默认0.3</p>
              {touched.temperature && errors.temperature && (
                <p className="mt-1 text-sm text-red-600">{errors.temperature}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大输出Token数
              </label>
              <input
                type="number"
                min="1"
                max="4000"
                value={translate.max_tokens ?? 512}
                onChange={(e) => handleFieldChange('max_tokens', parseInt(e.target.value) || 512)}
                onBlur={() => handleFieldBlur('max_tokens')}
                className={getFieldClassName('max_tokens')}
                placeholder="512"
              />
              <p className="mt-1 text-sm text-gray-500">限制模型输出的最大token数，1-4k之间，默认512</p>
              {touched.max_tokens && errors.max_tokens && (
                <p className="mt-1 text-sm text-red-600">{errors.max_tokens}</p>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              额外全局提示词
            </label>
            <textarea
              value={translate.additional_prompt || ''}
              onChange={(e) => onTranslateChange({ additional_prompt: e.target.value })}
              rows={4}
              className="w-[98%] ml-[1%] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入额外的提示词信息..."
            />
          </div>
        </div>
      )}
    </div>
  )
} 