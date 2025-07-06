import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workDir } = body
    
    if (!workDir) {
      return NextResponse.json({ valid: false, error: '缺少工作目录参数' })
    }
    
    // 检查是否有任务正在运行
    if (global.currentVoiceTask) {
      return NextResponse.json({ valid: false, error: '已有任务正在运行，请等待当前任务完成或停止任务' })
    }
    
    // 检查目录是否存在
    if (!fs.existsSync(workDir)) {
      return NextResponse.json({ valid: false, error: '目录不存在' })
    }
    
    // 检查是否为目录
    const stats = fs.statSync(workDir)
    if (!stats.isDirectory()) {
      return NextResponse.json({ valid: false, error: '路径不是目录' })
    }
    
    // 检查目录权限
    try {
      fs.accessSync(workDir, fs.constants.R_OK | fs.constants.W_OK)
    } catch {
      return NextResponse.json({ valid: false, error: '目录权限不足' })
    }
    
    // 可选：检查是否看起来像 WebGAL 项目目录
    // 可以检查特定的文件或文件夹结构
    const gameDir = path.join(workDir, 'game')
    const hasGameDir = fs.existsSync(gameDir)
    
    return NextResponse.json({ 
      valid: true, 
      hasGameDir,
      message: hasGameDir ? 'WebGAL 项目目录' : '一般目录'
    })
  } catch (error) {
    console.error('验证工作目录失败:', error)
    return NextResponse.json({ valid: false, error: '验证失败' })
  }
} 