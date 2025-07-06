'use client'

import { useState, useEffect } from 'react'
import { VoiceConfig } from './types'

interface BasicSettingsProps {
  config: Pick<VoiceConfig, 'volume' | 'gpt_sovits_url' | 'gpt_sovits_path' | 'model_version' | 'max_translator'>
  onConfigChange: (updates: Partial<BasicSettingsProps['config']>) => void
}

interface ValidationErrors {
  volume?: string
  gpt_sovits_url?: string
  gpt_sovits_path?: string
  model_version?: string
  max_translator?: string
}

export function BasicSettings({ config, onConfigChange }: BasicSettingsProps) {
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // 校验函数
  const validateField = (field: string, value: any): string | undefined => {
    switch (field) {
      case 'volume':
        if (value === undefined || value === null || value === '') {
          return '音量是必填项'
        }
        if (value < 0 || value > 100) {
          return '音量必须在 0-100 之间'
        }
        break
      case 'gpt_sovits_url':
        if (!value || value.trim() === '') {
          return 'GPT-SoVITS 服务地址是必填项'
        }
        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          return '请输入有效的 URL 地址'
        }
        break
      case 'gpt_sovits_path':
        if (!value || value.trim() === '') {
          return 'GPT-SoVITS 项目路径是必填项'
        }
        break
      case 'model_version':
        if (!value || value.trim() === '') {
          return '模型版本是必填项'
        }
        break
      case 'max_translator':
        if (value === undefined || value === null || value === '') {
          return '最大翻译并发数是必填项'
        }
        if (value < 1 || value > 10) {
          return '最大翻译并发数必须在 1-10 之间'
        }
        break
    }
    return undefined
  }

  // 校验所有字段
  const validateAll = () => {
    const newErrors: ValidationErrors = {}
    
    newErrors.volume = validateField('volume', config.volume)
    newErrors.gpt_sovits_url = validateField('gpt_sovits_url', config.gpt_sovits_url)
    newErrors.gpt_sovits_path = validateField('gpt_sovits_path', config.gpt_sovits_path)
    newErrors.model_version = validateField('model_version', config.model_version)
    newErrors.max_translator = validateField('max_translator', config.max_translator || 1)
    
    setErrors(newErrors)
    return Object.values(newErrors).every(error => !error)
  }

  // 处理字段变化
  const handleFieldChange = (field: keyof ValidationErrors, value: any) => {
    onConfigChange({ [field]: value })
    
    // 如果字段已经被触摸过，立即校验
    if (touched[field]) {
      const error = validateField(field, value)
      setErrors(prev => ({ ...prev, [field]: error }))
    }
  }

  // 处理字段失焦
  const handleFieldBlur = (field: keyof ValidationErrors) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const value = config[field as keyof typeof config]
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

  // 组件挂载时进行初始校验
  useEffect(() => {
    validateAll()
  }, [])

  return (
    <div className="space-y-4 flex-1">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            音量 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={config.volume}
            onChange={(e) => handleFieldChange('volume', parseInt(e.target.value) || 0)}
            onBlur={() => handleFieldBlur('volume')}
            className={getFieldClassName('volume')}
          />
          {touched.volume && errors.volume && (
            <p className="mt-1 text-sm text-red-600">{errors.volume}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GPT-SoVITS 服务地址 <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={config.gpt_sovits_url}
            onChange={(e) => handleFieldChange('gpt_sovits_url', e.target.value)}
            onBlur={() => handleFieldBlur('gpt_sovits_url')}
            className={getFieldClassName('gpt_sovits_url')}
            placeholder="http://localhost:9872"
          />
          {touched.gpt_sovits_url && errors.gpt_sovits_url && (
            <p className="mt-1 text-sm text-red-600">{errors.gpt_sovits_url}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GPT-SoVITS 项目路径 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.gpt_sovits_path}
            onChange={(e) => handleFieldChange('gpt_sovits_path', e.target.value)}
            onBlur={() => handleFieldBlur('gpt_sovits_path')}
            className={getFieldClassName('gpt_sovits_path')}
            placeholder="D:/AIVoice/GPT-SoVITS-v2pro-20250604"
          />
          {touched.gpt_sovits_path && errors.gpt_sovits_path && (
            <p className="mt-1 text-sm text-red-600">{errors.gpt_sovits_path}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            模型版本 <span className="text-red-500">*</span>
          </label>
          <select
            value={config.model_version}
            onChange={(e) => handleFieldChange('model_version', e.target.value)}
            onBlur={() => handleFieldBlur('model_version')}
            className={getFieldClassName('model_version')}
          >
            <option value="">请选择模型版本</option>
            <option value="v1">v1</option>
            <option value="v2">v2</option>
            <option value="v3">v3</option>
            <option value="v4">v4</option>
          </select>
          {touched.model_version && errors.model_version && (
            <p className="mt-1 text-sm text-red-600">{errors.model_version}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            最大翻译并发数 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={config.max_translator || 1}
            onChange={(e) => handleFieldChange('max_translator', parseInt(e.target.value) || 1)}
            onBlur={() => handleFieldBlur('max_translator')}
            className={getFieldClassName('max_translator')}
          />
          {touched.max_translator && errors.max_translator && (
            <p className="mt-1 text-sm text-red-600">{errors.max_translator}</p>
          )}
        </div>
      </div>
    </div>
  )
} 