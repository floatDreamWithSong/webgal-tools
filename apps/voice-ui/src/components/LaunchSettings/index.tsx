'use client'

import { useState, useEffect, useCallback } from 'react'
import { StatusCard } from './StatusCard'
import { ConfigInitializer } from './ConfigInitializer'
import { TaskController } from './TaskController'
import { TaskWarning } from './TaskWarning'
import { LaunchConfig, TaskConfig, TaskStatus } from './types'

interface LaunchSettingsProps {
  workDir: string | null
}

export function LaunchSettings({ workDir }: LaunchSettingsProps) {
  const [config, setConfig] = useState<LaunchConfig>({
    workDir: workDir || '',
    forceMode: false
  })
  
  const [taskConfig, setTaskConfig] = useState<TaskConfig>({
    scriptFile: '',
    maxTranslator: 1,
    forceMode: false
  })
  
  const [taskStatus, setTaskStatus] = useState<TaskStatus>({
    isRunning: false,
    progress: 0,
    message: '准备就绪'
  })
  
  const [workDirValid, setWorkDirValid] = useState(false)
  const [configValid, setConfigValid] = useState(false)
  const [scriptFiles, setScriptFiles] = useState<string[]>([])

  // 检查任务状态
  const checkTaskStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/voice/status?workDir=${encodeURIComponent(workDir || '')}`)
      if (response.ok) {
        const data = await response.json()
        if (!data.isRunning && taskStatus.isRunning) {
          setTaskStatus({
            isRunning: false,
            progress: data.progress || 100,
            message: data.message || '任务结束'
          })
        } else if (data.isRunning && !taskStatus.isRunning) {
          setTaskStatus({
            isRunning: true,
            progress: data.progress || 0,
            message: data.message || '任务执行中...'
          })
        } else if (data.isRunning && taskStatus.isRunning) {
          // 更新进度和消息
          setTaskStatus(prev => ({
            ...prev,
            progress: data.progress || prev.progress,
            message: data.message || prev.message
          }))
        }
      }
    } catch (error) {
      console.error('检查任务状态失败:', error)
    }
  }, [taskStatus.isRunning, workDir])

  // 定期检查任务状态
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (taskStatus.isRunning) {
      interval = setInterval(checkTaskStatus, 2000)
    }
    
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [taskStatus.isRunning, checkTaskStatus])

  // 验证工作目录
  const validateWorkDir = useCallback(async (workDir: string) => {
    if (!workDir.trim()) {
      setWorkDirValid(false)
      return
    }
    
    try {
      const response = await fetch('/api/validate/workdir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workDir })
      })
      
      if (response.ok) {
        const data = await response.json()
        setWorkDirValid(data.valid)
      } else {
        setWorkDirValid(false)
      }
    } catch {
      setWorkDirValid(false)
    }
  }, [])

  // 验证配置有效性
  const validateConfig = useCallback(async (workDir: string) => {
    if (!workDir) {
      setConfigValid(false)
      return
    }
    
    try {
      const response = await fetch('/api/validate/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workDir })
      })
      
      if (response.ok) {
        const data = await response.json()
        setConfigValid(data.valid)
        if (!data.valid) {
          console.log('配置验证失败:', data.error)
        }
      } else {
        setConfigValid(false)
        console.error('配置验证请求失败')
      }
    } catch {
      setConfigValid(false)
      console.error('配置验证异常')
    }
  }, [])

  // 加载脚本文件列表
  const loadScriptFiles = useCallback(async (workDir: string) => {
    try {
      const response = await fetch('/api/scripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ workDir })
      })
      
      if (response.ok) {
        const data = await response.json()
        setScriptFiles(data.files || [])
      }
    } catch (error) {
      console.error('加载脚本文件失败:', error)
    }
  }, [])

  // 初始化配置
  const initializeConfig = useCallback(async (templateId?: string | null) => {
    if (!workDir) {
      alert('请先选择工作目录')
      return
    }
    
    try {
      setTaskStatus({
        isRunning: true,
        progress: 0,
        message: '正在初始化配置...'
      })
      
      const response = await fetch('/api/config/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          workDir,
          force: config.forceMode,
          templateId
        })
      })
      
      if (response.ok) {
        setTaskStatus({
          isRunning: false,
          progress: 100,
          message: '配置初始化成功'
        })
        await validateConfig(workDir)
        await loadScriptFiles(workDir)
        window.location.reload()
      } else {
        const error = await response.json()
        setTaskStatus({
          isRunning: false,
          progress: 0,
          message: '配置初始化失败',
          error: error.message || '未知错误'
        })
      }
    } catch (error) {
      setTaskStatus({
        isRunning: false,
        progress: 0,
        message: '配置初始化失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }, [workDir, config.forceMode, validateConfig, loadScriptFiles])

  // 开始语音生成任务
  const startVoiceGeneration = useCallback(async () => {
    if (!workDir || !taskConfig.scriptFile.trim()) {
      alert('请选择脚本文件')
      return
    }
    
    if (!configValid) {
      alert('配置文件无效，请先初始化配置')
      return
    }
    
    try {
      setTaskStatus({
        isRunning: true,
        progress: 0,
        message: '正在启动语音生成任务...'
      })
      
      const response = await fetch('/api/voice/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workDir,
          scriptFile: taskConfig.scriptFile,
          maxTranslator: taskConfig.maxTranslator,
          forceMode: taskConfig.forceMode
        })
      })
      
      if (response.ok) {
        // 任务启动成功，状态会通过轮询更新
        // 这里不需要立即更新状态，因为后端会更新全局状态
      } else {
        const error = await response.json()
        setTaskStatus({
          isRunning: false,
          progress: 0,
          message: '任务启动失败',
          error: error.message || '未知错误'
        })
      }
    } catch (error) {
      setTaskStatus({
        isRunning: false,
        progress: 0,
        message: '任务启动失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }, [workDir, taskConfig, configValid])

  // 当workDir props改变时，更新内部状态并验证
  useEffect(() => {
    if (workDir) {
      setConfig(prev => ({ ...prev, workDir }))
      setTaskConfig(prev => ({ ...prev, workDir }))
      validateWorkDir(workDir)
      validateConfig(workDir)
      loadScriptFiles(workDir)
    } else {
      setWorkDirValid(false)
      setConfigValid(false)
    }
  }, [workDir, validateWorkDir, validateConfig, loadScriptFiles])

  if (!workDir) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center text-gray-500">
          <p className="text-lg">请先选择工作目录</p>
          <p className="text-sm mt-2">返回首页选择或添加工作目录</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <StatusCard 
        title="工作目录"
        isValid={workDirValid}
        workDir={workDir}
      >
        {!workDirValid && (
          <div className="text-xs text-red-600 mb-3">
            工作目录无效，无法验证配置
          </div>
        )}
      </StatusCard>

      <StatusCard 
        title="配置文件"
        isValid={configValid}
      >
        {!configValid && workDirValid && (
          <div className="text-xs text-red-600 mb-3">
            配置文件不存在，或者配置文件语法错误
          </div>
        )}
      </StatusCard>

      <ConfigInitializer 
        workDirValid={workDirValid}
        forceMode={config.forceMode}
        taskStatus={taskStatus}
        configValid={configValid}
        onForceModeChange={(forceMode) => setConfig(prev => ({ ...prev, forceMode }))}
        onInitialize={initializeConfig}
      />

      <TaskController 
        configValid={configValid}
        taskStatus={taskStatus}
        taskConfig={taskConfig}
        scriptFiles={scriptFiles}
        onTaskConfigChange={(updates) => setTaskConfig(prev => ({ ...prev, ...updates }))}
        onStartTask={startVoiceGeneration}
      />

      <TaskWarning isRunning={taskStatus.isRunning} />
    </div>
  )
} 