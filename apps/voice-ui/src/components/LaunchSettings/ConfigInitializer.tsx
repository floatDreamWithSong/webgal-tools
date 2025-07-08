'use client'

import { useState } from 'react'
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('')
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
          {selectedTemplateId ? `已选择: ${selectedTemplateName}` : '选择配置模板'}
        </button>
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
        onClick={() => onInitialize(selectedTemplateId)}
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
          setSelectedTemplateId(templateId)
          setSelectedTemplateName(templateName || '')
        }}
        configType={configType}
      />
    </div>
  )
} 