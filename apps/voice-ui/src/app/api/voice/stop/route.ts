import { NextResponse } from 'next/server'

export async function POST() {
  try {
    if (global.currentVoiceTask) {
      // 停止当前任务
      if (global.currentVoiceTask.wrapper) {
        try {
          await global.currentVoiceTask.wrapper.stop()
        } catch (error) {
          console.error('停止任务失败:', error)
        }
      }
      
      // 清理全局任务状态
      global.currentVoiceTask = null
      
      return NextResponse.json({ 
        success: true, 
        message: '任务已停止' 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: '没有正在运行的任务' 
      })
    }
  } catch (error) {
    console.error('停止任务失败:', error)
    return NextResponse.json({ error: '停止任务失败' }, { status: 500 })
  }
} 