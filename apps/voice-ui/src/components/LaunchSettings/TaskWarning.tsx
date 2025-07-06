'use client'

interface TaskWarningProps {
  isRunning: boolean
}

export function TaskWarning({ isRunning }: TaskWarningProps) {
  if (!isRunning) return null

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">任务执行中</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>语音合成任务正在后台执行，请勿关闭浏览器或刷新页面。</p>
            <p className="mt-1">您可以在 CMD 控制台查看详细的执行日志。</p>
          </div>
        </div>
      </div>
    </div>
  )
} 