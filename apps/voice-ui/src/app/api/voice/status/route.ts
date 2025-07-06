import { NextRequest, NextResponse } from 'next/server'

interface VoiceTaskStatus {
  isRunning: boolean
  workDir?: string
  startTime?: number
  endTime?: number
  progress?: number
  message?: string
}

declare global {
  var voiceTaskStatus: VoiceTaskStatus
  var updateVoiceTaskStatus: ((status: Partial<VoiceTaskStatus>) => void) | undefined
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

function updateVoiceTaskStatus(status: Partial<VoiceTaskStatus>) {
  global.voiceTaskStatus = { ...global.voiceTaskStatus, ...status }
}

if (typeof global.updateVoiceTaskStatus === 'undefined') {
  global.updateVoiceTaskStatus = updateVoiceTaskStatus
} 