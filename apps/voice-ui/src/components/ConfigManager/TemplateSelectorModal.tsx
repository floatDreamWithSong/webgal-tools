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

interface TemplateSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onTemplateSelect: (templateId: string | null, templateName?: string) => void
  configType?: 'voice' | 'mcp' | 'all'
}

export function TemplateSelectorModal({ 
  isOpen, 
  onClose, 
  onTemplateSelect,
  configType = 'voice' 
}: TemplateSelectorModalProps) {
  const [templates, setTemplates] = useState<TemplateListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

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
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen, loadTemplates])

  const handleTemplateSelect = (templateId: string | null) => {
    setSelectedTemplateId(templateId)
  }

  const handleConfirm = () => {
    onTemplateSelect(selectedTemplateId, getSelectedTemplateName())
    onClose()
  }

  // 获取选中模板的名称
  const getSelectedTemplateName = () => {
    if (selectedTemplateId === null) {
      return '默认模板'
    }
    const template = templates.find(t => t.id === selectedTemplateId)
    return template ? template.name : '默认模板'
  }

  const handleDelete = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定要删除这个模板吗？')) {
      return
    }

    setDeleteLoading(templateId)
    try {
      const response = await fetch(`/api/config/templates/${templateId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // 重新加载模板列表
        await loadTemplates()
        // 如果删除的是当前选中的模板，清空选择
        if (selectedTemplateId === templateId) {
          setSelectedTemplateId(null)
        }
      } else {
        alert('删除模板失败')
      }
    } catch (error) {
      console.error('删除模板失败:', error)
      alert('删除模板失败')
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleClose = () => {
    setSelectedTemplateId(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">选择配置模板</h3>
            {selectedTemplateId !== undefined && (
              <p className="text-sm text-gray-500 mt-1">
                当前选择: {getSelectedTemplateName()}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-600">加载模板中...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 默认模板选项 */}
              <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="template"
                  value="default"
                  checked={selectedTemplateId === null}
                  onChange={() => handleTemplateSelect(null)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">默认模板</div>
                  <div className="text-sm text-gray-500">使用系统默认配置</div>
                </div>
              </label>

              {/* 用户保存的模板 */}
              {templates.map((template) => (
                <label key={template.id} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={selectedTemplateId === template.id}
                    onChange={() => handleTemplateSelect(template.id)}
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
                  <button
                    onClick={(e) => handleDelete(template.id, e)}
                    disabled={deleteLoading === template.id}
                    className="text-red-500 hover:text-red-700 disabled:text-gray-400 p-1"
                    title="删除模板"
                  >
                    {deleteLoading === template.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </label>
              ))}

              {templates.length === 0 && (
                <div className="text-sm text-gray-500 py-8 text-center">
                  暂无保存的模板
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            确认选择
          </button>
        </div>
      </div>
    </div>
  )
} 