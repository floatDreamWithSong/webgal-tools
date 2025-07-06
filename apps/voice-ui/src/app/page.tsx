'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkDir } from '@/hooks/useWorkDir'

export default function Home() {
  const [workDirInput, setWorkDirInput] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  
  const { 
    history, 
    addValidatedWorkDir, 
    removeWorkDir, 
    clearHistory, 
    getRouteParam 
  } = useWorkDir()

  const handleAddWorkDir = async () => {
    if (!workDirInput.trim()) {
      setError('请输入工作目录路径')
      return
    }

    setIsAdding(true)
    setError('')

    try {
      // 直接调用验证API获取详细错误信息
      const response = await fetch('/api/validate/workdir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workDir: workDirInput.trim() }),
      })
      
      const data = await response.json()
      
      if (data.valid) {
        // 验证成功，添加到历史记录
        const success = await addValidatedWorkDir(workDirInput.trim())
        if (success) {
          // 成功添加后跳转到dashboard
          const routeParam = getRouteParam(workDirInput.trim())
          router.push(`/dashboard/${routeParam}`)
        } else {
          setError('添加工作目录失败')
        }
      } else {
        // 显示具体的验证错误信息
        setError(data.error || '工作目录无效')
      }
    } catch {
      setError('验证工作目录失败，请检查路径是否正确')
    } finally {
      setIsAdding(false)
    }
  }

  const handleSelectWorkDir = (path: string) => {
    const routeParam = getRouteParam(path)
    router.push(`/dashboard/${routeParam}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddWorkDir()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">WebGAL Voice UI</h1>
          <p className="text-gray-600">语音合成管理工具</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Add Work Directory */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">添加工作目录</h2>
              <p className="text-gray-600 mb-4">
                请输入WebGAL项目的工作目录路径。这将作为语音合成的项目根目录。
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="workdir" className="block text-sm font-medium text-gray-700 mb-2">
                    工作目录路径
                  </label>
                  <input
                    id="workdir"
                    type="text"
                    value={workDirInput}
                    onChange={(e) => setWorkDirInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="例如: D:/WebGAL/新的游戏/game"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isAdding}
                  />
                </div>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                
                <button
                  onClick={handleAddWorkDir}
                  disabled={isAdding}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isAdding ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>验证中...</span>
                    </>
                  ) : (
                    <>
                      <span>➕</span>
                      <span>添加工作目录</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right: History */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">历史工作目录</h2>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-sm text-gray-500 hover:text-red-600 cursor-pointer hover:bg-red-500/20 rounded-full p-1"
                    title="清空历史"
                  >
                    🗑️清空
                  </button>
                )}
              </div>
              
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">暂无历史记录</p>
                  <p className="text-sm text-gray-400 mt-2">添加工作目录后会显示在这里</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.path}
                      className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => handleSelectWorkDir(item.path)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600">
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-500 truncate" title={item.path}>
                            {item.path}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(item.lastUsed).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeWorkDir(item.path)
                            }}
                            className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="删除"
                          >
                            ✕
                          </button>
                          <span className="text-gray-300">→</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>选择或添加工作目录后，系统将自动加载项目配置并进入管理界面</p>
        </div>
      </div>
    </div>
  )
}
