'use client'

import { useState } from 'react'

interface ModelScannerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (filePath: string) => void
  modelType: 'gpt' | 'sovits'
  modelVersion: string
  gptSovitsPath: string
}

interface ModelFile {
  name: string
  path: string
  folder: string
  size?: string
}

export function ModelScanner({ 
  isOpen, 
  onClose, 
  onSelect, 
  modelType, 
  modelVersion, 
  gptSovitsPath 
}: ModelScannerProps) {
  const [files, setFiles] = useState<ModelFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const scanModels = async () => {
    if (!gptSovitsPath) {
      setError('请先设置 GPT-SoVITS 项目路径')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 调用后端API扫描文件
      const response = await fetch('/api/config/scan-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gptSovitsPath,
          modelVersion,
          modelType
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '扫描失败')
      }

      const data = await response.json()
      setFiles(data.files)
    } catch (err) {
      setError(err instanceof Error ? err.message : '扫描模型文件时出错')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (file: ModelFile) => {
    onSelect(file.path)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            选择 {modelType.toUpperCase()} 模型文件
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            扫描路径: {gptSovitsPath}/
            <span className="font-medium">
              {modelType === 'gpt' ? `GPT_weights_${modelVersion}` : `SoVITS_weights_${modelVersion}`}*
            </span>
            <br />
            <span className="text-xs text-gray-500">
              * 将扫描所有以该前缀开头的文件夹
            </span>
          </p>
          <button
            onClick={scanModels}
            disabled={loading || !gptSovitsPath}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? '扫描中...' : '扫描模型文件'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="overflow-y-auto max-h-96">
          {files.length > 0 ? (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  onClick={() => handleSelect(file)}
                  className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{file.path}</p>
                      <p className="text-xs text-blue-600">文件夹: {file.folder}</p>
                    </div>
                    {file.size && (
                      <span className="text-sm text-gray-400">{file.size}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : !loading && (
            <div className="text-center py-8 text-gray-500">
              暂无模型文件，请点击扫描按钮
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
} 