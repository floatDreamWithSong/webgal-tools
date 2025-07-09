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

interface TemplateData {
  templates: TemplateListItem[]
  defaultTemplateId: string | null
  hasBuiltinTemplate: boolean
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
  const [templateData, setTemplateData] = useState<TemplateData>({
    templates: [],
    defaultTemplateId: null,
    hasBuiltinTemplate: false
  })
  const [loading, setLoading] = useState(true)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [setDefaultLoading, setSetDefaultLoading] = useState<string | null>(null)

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/config/templates')
      if (response.ok) {
        const data: TemplateData = await response.json()
        // 根据配置类型过滤模板
        const filteredTemplates = data.templates.filter((template: TemplateListItem) => 
          template.type === configType || template.type === 'all'
        )
        setTemplateData({
          ...data,
          templates: filteredTemplates
        })
      }
    } finally {
      setLoading(false)
    }
  }, [configType])

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
      // 每次打开模态框时重置选择状态
      setSelectedTemplateId(null)
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
      return '内置模板'
    }
    const template = templateData.templates.find(t => t.id === selectedTemplateId)
    return template ? template.name : '内置模板'
  }

  const handleDelete = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    // 检查是否为默认模板
    if (templateData.defaultTemplateId === templateId) {
      alert('默认模板不能删除，请先设置其他模板为默认模板')
      return
    }
    
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

  const handleSetDefault = async (templateId: string | null, e: React.MouseEvent) => {
    e.stopPropagation()
    
    setSetDefaultLoading(templateId || 'clear')
    try {
      const response = await fetch('/api/config/templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ templateId })
      })

      if (response.ok) {
        // 重新加载模板列表以更新默认模板状态
        await loadTemplates()
      } else {
        const error = await response.json()
        alert(`设置默认模板失败: ${error.error}`)
      }
    } catch (error) {
      console.error('设置默认模板失败:', error)
      alert('设置默认模板失败')
    } finally {
      setSetDefaultLoading(null)
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
              {/* 内置模板选项 */}
              <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="template"
                  value="builtin"
                  checked={selectedTemplateId === null}
                  onChange={() => handleTemplateSelect(null)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 flex items-center">
                    内置模板
                    {templateData.defaultTemplateId === null && (
                      <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        默认
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">使用系统内置的配置模板</div>
                </div>
                {templateData.defaultTemplateId !== null && (
                  <button
                    onClick={(e) => handleSetDefault(null, e)}
                    disabled={setDefaultLoading === 'clear'}
                    className="text-blue-500 hover:text-blue-700 disabled:text-gray-400 p-1"
                    title="设为默认模板"
                  >
                    {setDefaultLoading === 'clear' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )}
              </label>

              {/* 用户保存的模板 */}
              {templateData.templates.map((template) => (
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
                    <div className="text-sm font-medium text-gray-900 flex items-center">
                      {template.name}
                      {templateData.defaultTemplateId === template.id && (
                        <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          默认
                        </span>
                      )}
                    </div>
                    {template.description && (
                      <div className="text-sm text-gray-500">{template.description}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      类型: {template.type === 'all' ? '全部配置' : template.type === 'voice' ? '语音配置' : 'MCP配置'} | 
                      创建时间: {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {templateData.defaultTemplateId !== template.id && (
                      <button
                        onClick={(e) => handleSetDefault(template.id, e)}
                        disabled={setDefaultLoading === template.id}
                        className="text-blue-500 hover:text-blue-700 disabled:text-gray-400 p-1"
                        title="设为默认模板"
                      >
                        {setDefaultLoading === template.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(template.id, e)}
                      disabled={deleteLoading === template.id || templateData.defaultTemplateId === template.id}
                      className={`p-1 ${
                        templateData.defaultTemplateId === template.id
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-red-500 hover:text-red-700 disabled:text-gray-400'
                      }`}
                      title={templateData.defaultTemplateId === template.id ? '默认模板不能删除' : '删除模板'}
                    >
                      {deleteLoading === template.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </label>
              ))}

              {templateData.templates.length === 0 && (
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