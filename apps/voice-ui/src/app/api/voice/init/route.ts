import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { initializeVoiceConfig } from '@/lib/voice-wrapper'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workDir, force = false } = body
    
    if (!workDir) {
      return NextResponse.json({ error: '缺少工作目录参数' }, { status: 400 })
    }
    
    // 检查是否有任务正在运行
    if (global.currentVoiceTask) {
      return NextResponse.json({ error: '已有任务正在运行，请等待当前任务完成或停止任务' }, { status: 409 })
    }
    
    // 检查工作目录是否存在
    if (!fs.existsSync(workDir)) {
      return NextResponse.json({ error: '工作目录不存在' }, { status: 400 })
    }
    
    // 直接调用voice包的初始化功能
    const result = await initializeVoiceConfig(workDir, force)
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: result.message,
        output: result.details
      })
    } else {
      return NextResponse.json({ 
        error: result.message,
        details: result.details
      }, { status: 500 })
    }
  } catch (error) {
    console.error('初始化语音配置失败:', error)
    return NextResponse.json({ error: '初始化失败' }, { status: 500 })
  }
} 