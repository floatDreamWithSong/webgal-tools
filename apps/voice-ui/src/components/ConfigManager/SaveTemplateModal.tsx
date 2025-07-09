'use client'

import { useState } from 'react'

interface SaveTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, description: string, type: 'voice' | 'mcp' | 'all', setAsDefault: boolean) => void
  loading?: boolean
  configType?: 'voice' | 'mcp' | 'all'
}

export function SaveTemplateModal({ 
  isOpen, 
  onClose, 
  onSave, 
  loading = false,
  configType = 'voice'
}: SaveTemplateModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'voice' | 'mcp' | 'all'>(configType)
  const [setAsDefault, setSetAsDefault] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('模板名称不能为空')
      return
    }

    setError('')
    onSave(name.trim(), description.trim(), type, setAsDefault)
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setType(configType)
    setSetAsDefault(false)
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">保存配置模板</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              模板名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入模板名称"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              模板描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="描述这个模板的用途..."
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              模板类型
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'voice' | 'mcp' | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="voice">语音配置</option>
              {/* <option value="mcp">MCP配置</option> */}
              {/* <option value="all">全部配置</option> */}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="setAsDefault"
              checked={setAsDefault}
              onChange={(e) => setSetAsDefault(e.target.checked)}
              disabled={loading}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:bg-gray-300"
            />
            <label htmlFor="setAsDefault" className="text-sm text-gray-700">
              设置为默认模板
            </label>
          </div>

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? '保存中...' : '保存模板'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 