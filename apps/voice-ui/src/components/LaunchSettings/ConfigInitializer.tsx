'use client'

import { TaskStatus } from './types'

interface ConfigInitializerProps {
  workDirValid: boolean
  forceMode: boolean
  taskStatus: TaskStatus
  onForceModeChange: (forceMode: boolean) => void
  onInitialize: () => void
}

export function ConfigInitializer({ 
  workDirValid, 
  forceMode, 
  taskStatus, 
  onForceModeChange, 
  onInitialize 
}: ConfigInitializerProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">配置初始化</h3>
      
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
        onClick={onInitialize}
        disabled={taskStatus.isRunning || !workDirValid}
        className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          taskStatus.isRunning || !workDirValid
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {taskStatus.isRunning ? '等待任务完成' : '初始化配置'}
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
    </div>
  )
} 