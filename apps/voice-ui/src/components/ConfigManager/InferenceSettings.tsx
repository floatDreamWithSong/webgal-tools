'use client'

import { useState, useEffect } from 'react'
import { InferrenceConfig } from './types'

interface InferenceSettingsProps {
  config: InferrenceConfig
  onConfigChange: (updates: Partial<InferrenceConfig>) => void
}

interface ValidationErrors {
  prompt_language?: string
  text_language?: string
  how_to_cut?: string
  top_k?: string
  top_p?: string
  temperature?: string
  speed?: string
  sample_steps?: string
  pause_second?: string
}

export function InferenceSettings({ config, onConfigChange }: InferenceSettingsProps) {
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // 校验函数
  const validateField = (field: string, value: unknown): string | undefined => {
    switch (field) {
      case 'prompt_language':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          return '提示语言是必填项'
        }
        break
      case 'text_language':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          return '文本语言是必填项'
        }
        break
      case 'how_to_cut':
        if (!value || typeof value !== 'string' || value.trim() === '') {
          return '切分方式是必填项'
        }
        break
      case 'top_k':
        if (value === undefined || value === null || value === '') {
          return 'top_k 是必填项'
        }
        const topKNum = Number(value)
        if (isNaN(topKNum) || topKNum < 1 || topKNum > 100) {
          return 'top_k 必须在 1-100 之间'
        }
        break
      case 'top_p':
        if (value === undefined || value === null || value === '') {
          return 'top_p 是必填项'
        }
        const topPNum = Number(value)
        if (isNaN(topPNum) || topPNum < 0 || topPNum > 1) {
          return 'top_p 必须在 0-1 之间'
        }
        break
      case 'temperature':
        if (value === undefined || value === null || value === '') {
          return 'temperature 是必填项'
        }
        const tempNum = Number(value)
        if (isNaN(tempNum) || tempNum < 0 || tempNum > 2) {
          return 'temperature 必须在 0-2 之间'
        }
        break
      case 'speed':
        if (value === undefined || value === null || value === '') {
          return 'speed 是必填项'
        }
        const speedNum = Number(value)
        if (isNaN(speedNum) || speedNum < 0.1 || speedNum > 5) {
          return 'speed 必须在 0.1-5 之间'
        }
        break
      case 'sample_steps':
        if (value === undefined || value === null || value === '') {
          return 'sample_steps 是必填项'
        }
        const stepsNum = Number(value)
        if (isNaN(stepsNum) || stepsNum < 1 || stepsNum > 50) {
          return 'sample_steps 必须在 1-50 之间'
        }
        break
      case 'pause_second':
        if (value === undefined || value === null || value === '') {
          return 'pause_second 是必填项'
        }
        const pauseNum = Number(value)
        if (isNaN(pauseNum) || pauseNum < 0 || pauseNum > 10) {
          return 'pause_second 必须在 0-10 之间'
        }
        break
    }
    return undefined
  }

  // 校验所有字段
  const validateAll = () => {
    const newErrors: ValidationErrors = {}
    
    newErrors.prompt_language = validateField('prompt_language', config.prompt_language)
    newErrors.text_language = validateField('text_language', config.text_language)
    newErrors.how_to_cut = validateField('how_to_cut', config.how_to_cut)
    newErrors.top_k = validateField('top_k', config.top_k)
    newErrors.top_p = validateField('top_p', config.top_p)
    newErrors.temperature = validateField('temperature', config.temperature)
    newErrors.speed = validateField('speed', config.speed)
    newErrors.sample_steps = validateField('sample_steps', config.sample_steps)
    newErrors.pause_second = validateField('pause_second', config.pause_second)
    
    setErrors(newErrors)
    return Object.values(newErrors).every(error => !error)
  }

  // 处理字段变化
  const handleFieldChange = (field: keyof ValidationErrors, value: unknown) => {
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
    const baseClass = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
    const hasError = touched[field] && errors[field]
    
    if (hasError) {
      return `${baseClass} border-red-500 focus:ring-red-500`
    }
    return `${baseClass} border-gray-300 focus:ring-blue-500`
  }

  // 组件挂载时进行初始校验
  useEffect(() => {
    validateAll()
  }, [validateAll])

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <h4 className="text-md font-medium text-gray-900 mb-4">推理配置</h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            提示语言 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.prompt_language}
            onChange={(e) => handleFieldChange('prompt_language', e.target.value)}
            onBlur={() => handleFieldBlur('prompt_language')}
            className={getFieldClassName('prompt_language')}
            placeholder="日文"
          />
          {touched.prompt_language && errors.prompt_language && (
            <p className="mt-1 text-sm text-red-600">{errors.prompt_language}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            文本语言 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.text_language}
            onChange={(e) => handleFieldChange('text_language', e.target.value)}
            onBlur={() => handleFieldBlur('text_language')}
            className={getFieldClassName('text_language')}
            placeholder="日文"
          />
          {touched.text_language && errors.text_language && (
            <p className="mt-1 text-sm text-red-600">{errors.text_language}</p>
          )}
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            切分方式 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.how_to_cut}
            onChange={(e) => handleFieldChange('how_to_cut', e.target.value)}
            onBlur={() => handleFieldBlur('how_to_cut')}
            className={getFieldClassName('how_to_cut')}
            placeholder="凑四句一切"
          />
          {touched.how_to_cut && errors.how_to_cut && (
            <p className="mt-1 text-sm text-red-600">{errors.how_to_cut}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            top_k <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={config.top_k}
            onChange={(e) => handleFieldChange('top_k', parseInt(e.target.value) || 0)}
            onBlur={() => handleFieldBlur('top_k')}
            className={getFieldClassName('top_k')}
          />
          {touched.top_k && errors.top_k && (
            <p className="mt-1 text-sm text-red-600">{errors.top_k}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            top_p <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={config.top_p}
            onChange={(e) => handleFieldChange('top_p', parseFloat(e.target.value) || 0)}
            onBlur={() => handleFieldBlur('top_p')}
            className={getFieldClassName('top_p')}
          />
          {touched.top_p && errors.top_p && (
            <p className="mt-1 text-sm text-red-600">{errors.top_p}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            temperature <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={config.temperature}
            onChange={(e) => handleFieldChange('temperature', parseFloat(e.target.value) || 0)}
            onBlur={() => handleFieldBlur('temperature')}
            className={getFieldClassName('temperature')}
          />
          {touched.temperature && errors.temperature && (
            <p className="mt-1 text-sm text-red-600">{errors.temperature}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            speed <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0.1"
            max="5"
            step="0.1"
            value={config.speed}
            onChange={(e) => handleFieldChange('speed', parseFloat(e.target.value) || 0)}
            onBlur={() => handleFieldBlur('speed')}
            className={getFieldClassName('speed')}
          />
          {touched.speed && errors.speed && (
            <p className="mt-1 text-sm text-red-600">{errors.speed}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            sample_steps <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={config.sample_steps}
            onChange={(e) => handleFieldChange('sample_steps', parseInt(e.target.value) || 0)}
            onBlur={() => handleFieldBlur('sample_steps')}
            className={getFieldClassName('sample_steps')}
          />
          {touched.sample_steps && errors.sample_steps && (
            <p className="mt-1 text-sm text-red-600">{errors.sample_steps}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            pause_second <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={config.pause_second}
            onChange={(e) => handleFieldChange('pause_second', parseFloat(e.target.value) || 0)}
            onBlur={() => handleFieldBlur('pause_second')}
            className={getFieldClassName('pause_second')}
          />
          {touched.pause_second && errors.pause_second && (
            <p className="mt-1 text-sm text-red-600">{errors.pause_second}</p>
          )}
        </div>

        <div className="col-span-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="if_sr"
              checked={config.if_sr}
              onChange={(e) => onConfigChange({ if_sr: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="if_sr" className="text-sm font-medium text-gray-700">
              启用 SR (Sample Rate)
            </label>
          </div>
        </div>
      </div>
    </div>
  )
} 