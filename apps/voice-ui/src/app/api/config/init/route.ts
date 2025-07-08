import { NextRequest, NextResponse } from 'next/server'
import { initializeConfig } from '@webgal-tools/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workDir, force = false, onlyVoice = false, onlyMcp = false, templateId } = body
    
    if (!workDir) {
      return NextResponse.json({ error: '缺少工作目录参数' }, { status: 400 })
    }
    
    const result = initializeConfig({
      workDir,
      force,
      onlyVoice,
      onlyMcp,
      templateId
    })
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        createdFiles: result.createdFiles,
        skippedFiles: result.skippedFiles
      })
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        errors: result.errors
      }, { status: 400 })
    }
  } catch (error) {
    console.error('初始化配置失败:', error)
    return NextResponse.json(
      { error: '初始化配置失败' },
      { status: 500 }
    )
  }
} 