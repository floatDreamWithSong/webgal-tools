import { useState, useEffect, useCallback } from 'react'

export interface WorkDirHistory {
  path: string
  name: string
  addedAt: number
  lastUsed: number
}

export interface UseWorkDirReturn {
  // 历史工作目录
  history: WorkDirHistory[]
  
  // 当前工作目录
  currentWorkDir: string | null
  
  // 添加工作目录（包含验证）
  addWorkDir: (path: string) => Promise<boolean>
  
  // 添加已验证的工作目录（不验证）
  addValidatedWorkDir: (path: string) => Promise<boolean>
  
  // 选择工作目录
  selectWorkDir: (path: string) => void
  
  // 删除工作目录
  removeWorkDir: (path: string) => void
  
  // 清空历史
  clearHistory: () => void
  
  // 验证工作目录
  validateWorkDir: (path: string) => Promise<boolean>
  
  // 生成路由参数
  getRouteParam: (path: string) => string
  
  // 解析路由参数
  parseRouteParam: (param: string) => string | null
}

const STORAGE_KEY = 'webgal-voice-workdir-history'
const CURRENT_WORKDIR_KEY = 'webgal-voice-current-workdir'

export function useWorkDir(): UseWorkDirReturn {
  const [history, setHistory] = useState<WorkDirHistory[]>([])
  const [currentWorkDir, setCurrentWorkDir] = useState<string | null>(null)

  // 从localStorage加载历史记录
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY)
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory) as WorkDirHistory[]
        setHistory(parsedHistory.sort((a, b) => b.lastUsed - a.lastUsed))
      }
      
      const savedCurrent = localStorage.getItem(CURRENT_WORKDIR_KEY)
      if (savedCurrent) {
        setCurrentWorkDir(savedCurrent)
      }
    } catch (error) {
      console.error('Failed to load work directory history:', error)
    }
  }, [])

  // 保存历史记录到localStorage
  const saveHistory = useCallback((newHistory: WorkDirHistory[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory))
      setHistory(newHistory)
    } catch (error) {
      console.error('Failed to save work directory history:', error)
    }
  }, [])

  // 保存当前工作目录到localStorage
  const saveCurrentWorkDir = useCallback((path: string | null) => {
    try {
      if (path) {
        localStorage.setItem(CURRENT_WORKDIR_KEY, path)
      } else {
        localStorage.removeItem(CURRENT_WORKDIR_KEY)
      }
      setCurrentWorkDir(path)
    } catch (error) {
      console.error('Failed to save current work directory:', error)
    }
  }, [])

  // 验证工作目录
  const validateWorkDir = useCallback(async (path: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/validate/workdir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workDir: path }),
      })
      
      if (!response.ok) {
        return false
      }
      
      const data = await response.json()
      return data.valid === true
    } catch (error) {
      console.error('Failed to validate work directory:', error)
      return false
    }
  }, [])

  // 添加已验证的工作目录（不验证，假设已经验证过了）
  const addValidatedWorkDir = useCallback(async (path: string): Promise<boolean> => {
    const normalizedPath = path.replace(/\\/g, '/')
    const name = normalizedPath.split('/').pop() || normalizedPath
    const now = Date.now()

    setHistory(prevHistory => {
      // 检查是否已存在
      const existingIndex = prevHistory.findIndex(item => item.path === normalizedPath)
      
      let newHistory: WorkDirHistory[]
      if (existingIndex >= 0) {
        // 更新现有记录
        newHistory = [...prevHistory]
        newHistory[existingIndex] = {
          ...newHistory[existingIndex],
          lastUsed: now
        }
      } else {
        // 添加新记录
        const newItem: WorkDirHistory = {
          path: normalizedPath,
          name,
          addedAt: now,
          lastUsed: now
        }
        newHistory = [newItem, ...prevHistory]
      }

      // 按最后使用时间排序
      newHistory.sort((a, b) => b.lastUsed - a.lastUsed)
      
      // 保存到localStorage
      saveHistory(newHistory)
      
      return newHistory
    })

    return true
  }, [saveHistory])

  // 添加工作目录（包含验证）
  const addWorkDir = useCallback(async (path: string): Promise<boolean> => {
    // 验证目录
    const isValid = await validateWorkDir(path)
    if (!isValid) {
      return false
    }

    return await addValidatedWorkDir(path)
  }, [validateWorkDir, addValidatedWorkDir])

  // 选择工作目录
  const selectWorkDir = useCallback((path: string) => {
    // 更新最后使用时间
    setHistory(prevHistory => {
      const newHistory = prevHistory.map(item => 
        item.path === path 
          ? { ...item, lastUsed: Date.now() }
          : item
      )
      newHistory.sort((a, b) => b.lastUsed - a.lastUsed)
      saveHistory(newHistory)
      return newHistory
    })

    // 设置为当前工作目录
    saveCurrentWorkDir(path)
  }, [saveHistory, saveCurrentWorkDir])

  // 删除工作目录
  const removeWorkDir = useCallback((path: string) => {
    setHistory(prevHistory => {
      const newHistory = prevHistory.filter(item => item.path !== path)
      saveHistory(newHistory)
      return newHistory
    })

    // 如果删除的是当前工作目录，清空当前选择
    if (currentWorkDir === path) {
      saveCurrentWorkDir(null)
    }
  }, [saveHistory, currentWorkDir, saveCurrentWorkDir])

  // 清空历史
  const clearHistory = useCallback(() => {
    setHistory([])
    saveCurrentWorkDir(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(CURRENT_WORKDIR_KEY)
    } catch (error) {
      console.error('Failed to clear work directory history:', error)
    }
  }, [saveCurrentWorkDir])

  // 生成路由参数（URL安全的base64编码）
  const getRouteParam = useCallback((path: string): string => {
    try {
      // 使用更安全的方法：先URI编码，然后base64编码，最后替换URL不安全字符
      const encoded = btoa(encodeURIComponent(path))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
      return encoded
    } catch (error) {
      console.error('Failed to encode path:', error)
      return ''
    }
  }, [])

  // 解析路由参数
  const parseRouteParam = useCallback((param: string): string | null => {
    try {
      // 还原URL安全字符，然后base64解码，最后URI解码
      let base64 = param
        .replace(/-/g, '+')
        .replace(/_/g, '/')
      
      // 补充padding
      while (base64.length % 4) {
        base64 += '='
      }
      
      const decoded = atob(base64)
      return decodeURIComponent(decoded)
    } catch (error) {
      console.error('Failed to decode path:', error)
      return null
    }
  }, [])

  return {
    history,
    currentWorkDir,
    addWorkDir,
    addValidatedWorkDir,
    selectWorkDir,
    removeWorkDir,
    clearHistory,
    validateWorkDir,
    getRouteParam,
    parseRouteParam
  }
} 