'use client'

import { useState, useEffect, useCallback } from 'react'
import { TaskStatus } from './types'
import { TemplateSelectorModal } from '../ConfigManager/TemplateSelectorModal'

interface ConfigInitializerProps {
  workDirValid: boolean
  forceMode: boolean
  taskStatus: TaskStatus
  configValid: boolean // 添加配置有效性状态
  onForceModeChange: (forceMode: boolean) => void
  onInitialize: (templateId?: string | null) => void
  configType?: 'voice' | 'mcp' | 'all'
}

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

export function ConfigInitializer({ 
  workDirValid, 
  forceMode, 
  taskStatus, 
  configValid,
  onForceModeChange, 
  onInitialize,
  configType = 'voice'
}: ConfigInitializerProps) {
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  // 使用undefined作为初始值，表示用户尚未做出选择
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null | undefined>(undefined)
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('')
  const [templateData, setTemplateData] = useState<TemplateData>({
    templates: [],
    defaultTemplateId: null,
    hasBuiltinTemplate: false
  })

  // 加载模板数据
  const loadTemplateData = useCallback(async () => {
    try {
      const response = await fetch('/api/config/templates')
      if (response.ok) {
        const data: TemplateData = await response.json()
        setTemplateData(data)
      }
    } catch (error) {
      console.error('加载模板数据失败:', error)
    }
  }, [])

  useEffect(() => {
    loadTemplateData()
  }, [loadTemplateData])
  
  // 当模板数据加载完成后，如果有默认模板且用户未选择任何模板，则显示默认模板信息
  useEffect(() => {
    if (templateData.defaultTemplateId && selectedTemplateId === undefined) {
      const defaultTemplate = templateData.templates.find(t => t.id === templateData.defaultTemplateId)
      if (defaultTemplate) {
        // 不设置selectedTemplateId，保持undefined状态，表示用户未明确选择
        // 但更新selectedTemplateName以便在UI中显示默认模板名称
        setSelectedTemplateName(`${defaultTemplate.name} (默认)`)
      }
    }
  }, [templateData, selectedTemplateId])

  // 获取当前选择的模板名称
  const getCurrentTemplateName = () => {
    // 优先级1：用户明确选择了某个模板（包括内置模板）
    if (selectedTemplateId !== undefined) {
      // 如果选择了内置模板
      if (selectedTemplateId === null) {
        return '内置模板'
      }
      // 如果选择了自定义模板
      if (selectedTemplateId) {
        return selectedTemplateName || '自定义模板'
      }
    }
    
    // 优先级2：有默认模板且未明确选择其他模板
    if (templateData.defaultTemplateId) {
      const defaultTemplate = templateData.templates.find(t => t.id === templateData.defaultTemplateId)
      return defaultTemplate ? `${defaultTemplate.name} (默认)` : '默认模板'
    }
    
    // 优先级3：默认显示内置模板
    return '内置模板'
  }

  // 处理初始化
  const handleInitialize = () => {
    console.log('初始化配置，选择的模板ID:', selectedTemplateId, '默认模板ID:', templateData.defaultTemplateId)
    
    // 如果用户明确选择了模板（包括选择了内置模板，此时selectedTemplateId为null）
    if (selectedTemplateId !== undefined) {
      console.log('使用用户选择的模板:', selectedTemplateId)
      onInitialize(selectedTemplateId)
      return
    }
    
    // 如果没有明确选择，但有默认模板，则使用默认模板
    if (templateData.defaultTemplateId) {
      console.log('使用默认模板:', templateData.defaultTemplateId)
      onInitialize(templateData.defaultTemplateId)
      return
    }
    
    // 否则使用内置模板（传null）
    console.log('使用内置模板')
    onInitialize(null)
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">配置初始化</h3>
      
      {/* 模板选择按钮 */}
      <div className="mb-4">
        <button
          onClick={() => setShowTemplateModal(true)}
          disabled={taskStatus.isRunning}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-left hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500"
        >
          {getCurrentTemplateName()}
        </button>
        {/* 只有当有默认模板、未明确选择任何模板、且selectedTemplateId未被设置为null时，才显示默认模板提示 */}
        {templateData.defaultTemplateId && selectedTemplateId === undefined && (
          <p className="text-xs text-gray-500 mt-1">
            将使用您设置的默认模板进行初始化
          </p>
        )}
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <input
          type="checkbox"
          id="forceMode"
          checked={forceMode}
          onChange={(e) => onForceModeChange(e.target.checked)}
          disabled={taskStatus.isRunning}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:bg-gray-300"
        />
        <label htmlFor="forceMode" className="text-sm text-gray-700">
          强制重新初始化（覆盖现有配置）
        </label>
      </div>

      <button
        onClick={handleInitialize}
        disabled={taskStatus.isRunning || !workDirValid || (configValid && !forceMode)}
        className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          taskStatus.isRunning || !workDirValid || (configValid && !forceMode)
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {taskStatus.isRunning ? '等待任务完成' : 
         configValid && !forceMode ? '配置已初始化，可开启强制模式以重初始化' : 
         '初始化配置'}
      </button>

      {taskStatus.message && (
        <div className={`mt-3 p-2 rounded text-xs ${
          taskStatus.error 
            ? 'bg-red-50 text-red-700 border border-red-200'
            : taskStatus.isRunning
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {taskStatus.message}
          {taskStatus.error && (
            <div className="mt-1 text-red-600">
              错误: {taskStatus.error}
            </div>
          )}
        </div>
      )}

      {/* 模板选择弹窗 */}
      <TemplateSelectorModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onTemplateSelect={(templateId, templateName) => {
          // 明确设置selectedTemplateId，不再是undefined
          setSelectedTemplateId(templateId)
          // 确保当选择内置模板时，名称为"内置模板"
          setSelectedTemplateName(templateId === null ? '内置模板' : (templateName || ''))
        }}
        configType={configType}
      />
    </div>
  )
} 