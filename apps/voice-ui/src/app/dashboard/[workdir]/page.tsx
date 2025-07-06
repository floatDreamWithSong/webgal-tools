'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ConfigManager } from '@/components/ConfigManager'
import { LaunchSettings } from '@/components/LaunchSettings'
import { useWorkDir } from '@/hooks/useWorkDir'

export default function Dashboard() {
  const [workDir, setWorkDir] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const params = useParams()
  const router = useRouter()
  const { parseRouteParam, selectWorkDir } = useWorkDir()

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const workdirParam = params.workdir as string
        if (!workdirParam) {
          setError('缺少工作目录参数')
          return
        }

        // 解析工作目录
        const decodedWorkDir = parseRouteParam(workdirParam)
        if (!decodedWorkDir) {
          setError('无效的工作目录参数')
          return
        }

        setWorkDir(decodedWorkDir)
        
        // 选择这个工作目录（更新历史记录）
        selectWorkDir(decodedWorkDir)

        // 检查配置文件是否存在，如果不存在则自动初始化
        const configResponse = await fetch('/api/validate/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workDir: decodedWorkDir })
        })

        if (!configResponse.ok) {
          // 配置文件不存在，尝试自动初始化
          const initResponse = await fetch('/api/voice/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workDir: decodedWorkDir, force: false })
          })

          if (!initResponse.ok) {
            const initData = await initResponse.json()
            setError(`配置初始化失败: ${initData.error || '未知错误'}`)
            return
          }
        }

      } catch (err) {
        setError('初始化dashboard失败')
        console.error('Dashboard initialization error:', err)
      } finally {
        setIsInitializing(false)
      }
    }

    initializeDashboard()
  }, [params.workdir, parseRouteParam, selectWorkDir])

  const handleBackToHome = () => {
    router.push('/')
  }

  if (isInitializing) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在初始化项目...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-red-800 mb-2">初始化失败</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={handleBackToHome}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">WebGAL 语音合成管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">当前项目</div>
                <div className="text-xs text-gray-500 truncate max-w-xs" title={workDir || ''}>
                  {workDir || 'Unknown'}
                </div>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">服务正常</span>
              <button
                onClick={handleBackToHome}
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
                title="返回首页"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：配置管理 */}
        <div className="w-1/2 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">配置管理</h2>
            <p className="text-sm text-gray-600 mt-1">管理语音合成配置和角色设置</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <ConfigManager workDir={workDir} />
            </div>
          </div>
        </div>

        {/* 右侧：启动设置 */}
        <div className="w-1/2 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">启动设置</h2>
            <p className="text-sm text-gray-600 mt-1">初始化配置并启动语音生成任务</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <LaunchSettings workDir={workDir} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 