'use client'

interface StatusCardProps {
  title: string
  isValid: boolean
  workDir?: string
  children?: React.ReactNode
}

export function StatusCard({ title, isValid, workDir, children }: StatusCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">{title}</h3>
      <div className="flex items-center space-x-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm text-gray-600">
          {isValid ? `${title}有效` : `${title}无效`}
        </span>
      </div>
      {workDir && (
        <div className="text-xs text-gray-500 break-all">
          {workDir}
        </div>
      )}
      {children}
    </div>
  )
} 