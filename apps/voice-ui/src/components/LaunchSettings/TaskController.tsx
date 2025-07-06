'use client'

import { TaskStatus, TaskConfig } from './types'

interface TaskControllerProps {
  configValid: boolean
  taskStatus: TaskStatus
  taskConfig: TaskConfig
  scriptFiles: string[]
  onTaskConfigChange: (updates: Partial<TaskConfig>) => void
  onStartTask: () => void
}

export function TaskController({ 
  configValid, 
  taskStatus, 
  taskConfig, 
  scriptFiles, 
  onTaskConfigChange, 
  onStartTask 
}: TaskControllerProps) {
  if (!configValid) return null

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">任务控制</h3>
      
      {taskStatus.isRunning && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">任务执行中</span>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-blue-600">运行中</span>
            </div>
          </div>
          <div className="text-xs text-blue-700 mb-2">{taskStatus.message}</div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${taskStatus.progress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            脚本文件
          </label>
          <select
            value={taskConfig.scriptFile}
            onChange={(e) => onTaskConfigChange({ scriptFile: e.target.value })}
            disabled={taskStatus.isRunning}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">请选择脚本文件</option>
            {scriptFiles.map(file => (
              <option key={file} value={file}>{file}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              最大并发数
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={taskConfig.maxTranslator}
              onChange={(e) => onTaskConfigChange({ maxTranslator: parseInt(e.target.value) })}
              disabled={taskStatus.isRunning}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <input
              type="checkbox"
              id="taskForceMode"
              checked={taskConfig.forceMode}
              onChange={(e) => onTaskConfigChange({ forceMode: e.target.checked })}
              disabled={taskStatus.isRunning}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:bg-gray-300"
            />
            <label htmlFor="taskForceMode" className="text-xs text-gray-700">
              强制重新生成
            </label>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={onStartTask}
            disabled={taskStatus.isRunning || !taskConfig.scriptFile}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              taskStatus.isRunning || !taskConfig.scriptFile
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {taskStatus.isRunning ? '任务执行中...请查看控制台输出' : '开始语音生成'}
          </button>
        </div>
      </div>
    </div>
  )
} 