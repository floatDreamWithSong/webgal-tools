'use client'

interface ConfigNavigationProps {
  activeSection: 'basic' | 'translate' | 'characters'
  onSectionChange: (section: 'basic' | 'translate' | 'characters') => void
}

export function ConfigNavigation({ activeSection, onSectionChange }: ConfigNavigationProps) {
  return (
    <div className="border-b border-gray-200 flex-shrink-0">
      <nav className="flex space-x-6">
        <button
          onClick={() => onSectionChange('basic')}
          className={`py-2 px-1 text-sm font-medium border-b-2 ${
            activeSection === 'basic'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          基本设置
        </button>
        <button
          onClick={() => onSectionChange('translate')}
          className={`py-2 px-1 text-sm font-medium border-b-2 ${
            activeSection === 'translate'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          翻译设置
        </button>
        <button
          onClick={() => onSectionChange('characters')}
          className={`py-2 px-1 text-sm font-medium border-b-2 ${
            activeSection === 'characters'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          角色配置
        </button>
      </nav>
    </div>
  )
} 