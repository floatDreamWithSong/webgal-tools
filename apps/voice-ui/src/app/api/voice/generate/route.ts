import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { startVoiceService } from '@webgal-tools/voice'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workDir, scriptFile, forceMode = false } = body
    
    if (!workDir || !scriptFile) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }
    
    // 检查工作目录和脚本文件是否存在
    if (!fs.existsSync(workDir)) {
      return NextResponse.json({ error: '工作目录不存在' }, { status: 400 })
    }
    
    const scriptPath = path.resolve(workDir, scriptFile)
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ error: '脚本文件不存在' }, { status: 400 })
    }
    
    // 处理脚本文件路径：去除scene前缀
    let processedScriptFile = scriptFile
    if (scriptFile.startsWith('scene/')) {
      processedScriptFile = scriptFile.substring(6) // 去除 'scene/' 前缀
    }
    
    // 直接调用 voice 包的服务
    const result = await startVoiceService({
      workDir,
      scriptFile: processedScriptFile,
      forceMode
    })
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: '语音生成完成'
      })
    } else {
      return NextResponse.json({ 
        error: result.error || '语音生成失败'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('语音生成失败:', error)
    return NextResponse.json({ 
      error: '语音生成失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
} 