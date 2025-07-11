import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workDir } = body
    
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
    
    const files: string[] = []
    
    // 查找可能的脚本文件位置
    const searchPaths = [
      path.join(workDir, 'scene'), // scene 目录
    ]
    
    // 支持的脚本文件扩展名
    const scriptExtensions = ['.txt', '.ws', '.webgal', '.script']
    
    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath) && fs.statSync(searchPath).isDirectory()) {
        try {
          const dirFiles = fs.readdirSync(searchPath)
          
          for (const file of dirFiles) {
            const filePath = path.join(searchPath, file)
            const stats = fs.statSync(filePath)
            
            // 只处理文件，不处理子目录
            if (stats.isFile()) {
              const ext = path.extname(file).toLowerCase()
              
              // 检查文件扩展名
              if (scriptExtensions.includes(ext)) {
                // 计算相对路径
                const relativePath = path.relative(workDir, filePath)
                files.push(relativePath.replace(/\\/g, '/'))
              }
            }
          }
        } catch (error) {
          // 忽略无法读取的目录
          console.warn(`无法读取目录 ${searchPath}:`, error)
        }
      }
    }
    
    // 去重并排序
    const uniqueFiles = Array.from(new Set(files)).sort()
    
    return NextResponse.json({ 
      files: uniqueFiles,
      count: uniqueFiles.length
    })
  } catch (error) {
    console.error('获取脚本文件列表失败:', error)
    return NextResponse.json({ error: '获取脚本文件列表失败' }, { status: 500 })
  }
} 