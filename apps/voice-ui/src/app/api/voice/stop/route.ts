import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // 由于现在使用同步调用，不再需要复杂的任务管理
    // 这个接口保留用于向后兼容，但实际功能已简化
    return NextResponse.json({ 
      success: true, 
      message: '语音生成任务已完成或不存在' 
    })
  } catch (error) {
    console.error('处理停止请求失败:', error)
    return NextResponse.json({ error: '处理请求失败' }, { status: 500 })
  }
} 