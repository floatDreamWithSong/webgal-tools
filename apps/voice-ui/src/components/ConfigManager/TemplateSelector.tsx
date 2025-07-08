'use client'

import { useState, useEffect, useCallback } from 'react'

interface TemplateListItem {
  id: string
  name: string
  description?: string
  type: 'voice' | 'mcp' | 'all'
  createdAt: string
  updatedAt: string
}

interface TemplateSelectorProps {
  onTemplateSelect: (templateId: string | null) => void
  selectedTemplateId?: string | null
  configType?: 'voice' | 'mcp' | 'all'
}

export function TemplateSelector({ 
  onTemplateSelect, 
  selectedTemplateId, 
  configType = 'voice' 
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<TemplateListItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/config/templates')
      if (response.ok) {
        const data = await response.json()
        // 根据配置类型过滤模板
        const filteredTemplates = data.filter((template: TemplateListItem) => 
          template.type === configType || template.type === 'all'
        )
        setTemplates(filteredTemplates)
      }
    } finally {
      setLoading(false)
    }
  }, [configType])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handleTemplateChange = (templateId: string) => {
    if (templateId === 'default') {
      onTemplateSelect(null)
    } else {
      onTemplateSelect(templateId)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-sm text-gray-600">加载模板中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        选择配置模板
      </label>
      
      <div className="space-y-2">
        {/* 默认模板选项 */}
        <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
          <input
            type="radio"
            name="template"
            value="default"
            checked={selectedTemplateId === null}
            onChange={() => handleTemplateChange('default')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">默认模板</div>
            <div className="text-sm text-gray-500">使用系统默认配置</div>
          </div>
        </label>

        {/* 用户保存的模板 */}
        {templates.map((template) => (
          <label key={template.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="radio"
              name="template"
              value={template.id}
              checked={selectedTemplateId === template.id}
              onChange={() => handleTemplateChange(template.id)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{template.name}</div>
              {template.description && (
                <div className="text-sm text-gray-500">{template.description}</div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                类型: {template.type === 'all' ? '全部配置' : template.type === 'voice' ? '语音配置' : 'MCP配置'} | 
                创建时间: {new Date(template.createdAt).toLocaleDateString()}
              </div>
            </div>
          </label>
        ))}

        {templates.length === 0 && (
          <div className="text-sm text-gray-500 py-2 text-center">
            暂无保存的模板
          </div>
        )}
      </div>
    </div>
  )
} 