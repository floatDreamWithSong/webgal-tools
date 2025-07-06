import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// 全局任务状态管理
declare global {
  var voiceTaskStatus: {
    isRunning: boolean
    workDir?: string
    startTime?: number
    endTime?: number
    progress?: number
    message?: string
  }
}

// 初始化全局状态
if (typeof global.voiceTaskStatus === 'undefined') {
  global.voiceTaskStatus = {
    isRunning: false
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workDir = searchParams.get('workDir')
    
    // 如果没有指定工作目录，返回全局状态
    if (!workDir) {
      return NextResponse.json({
        isRunning: global.voiceTaskStatus.isRunning,
        progress: global.voiceTaskStatus.progress || 0,
        message: global.voiceTaskStatus.message || '',
        startTime: global.voiceTaskStatus.startTime,
        endTime: global.voiceTaskStatus.endTime
      })
    }
    
    // 检查指定工作目录的任务状态
    // 这里可以添加更详细的状态检查逻辑
    return NextResponse.json({
      isRunning: global.voiceTaskStatus.isRunning && global.voiceTaskStatus.workDir === workDir,
      progress: global.voiceTaskStatus.progress || 0,
      message: global.voiceTaskStatus.message || '',
      startTime: global.voiceTaskStatus.startTime,
      endTime: global.voiceTaskStatus.endTime
    })
  } catch (error) {
    console.error('获取任务状态失败:', error)
    return NextResponse.json({ 
      error: '获取任务状态失败',
      isRunning: false
    }, { status: 500 })
  }
}

// 导出更新状态的函数，供其他模块使用
export function updateVoiceTaskStatus(status: Partial<typeof global.voiceTaskStatus>) {
  global.voiceTaskStatus = { ...global.voiceTaskStatus, ...status }
}

// 将更新函数挂载到全局对象上
if (typeof global.updateVoiceTaskStatus === 'undefined') {
  (global as Record<string, unknown>).updateVoiceTaskStatus = updateVoiceTaskStatus
} 