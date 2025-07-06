import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { logger } from '@webgal-tools/logger'

// 扫描指定目录中的文件
function scanFilesInDirectory(directory: string, extensions: string[], baseDir?: string): string[] {
  const files: string[] = []
  
  try {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name)
      
      // 检查是否为软链接
      let isSymlink = false
      let isDirectory = false
      try {
        const stats = fs.statSync(fullPath)
        isSymlink = stats.isSymbolicLink()
        isDirectory = stats.isDirectory()
      } catch {
        // 忽略错误，继续处理
      }
      
      logger.debug(`扫描路径: ${fullPath}, 类型: ${entry.isDirectory() ? '目录' : '文件'}, 软链接: ${isSymlink}, 实际是目录: ${isDirectory}`)
      
      if (entry.isDirectory() || isSymlink || isDirectory) {
        // 递归扫描子目录（包括软链接指向的目录）
        try {
          const subFiles = scanFilesInDirectory(fullPath, extensions, baseDir)
          logger.debug(`子目录 ${fullPath} 中找到 ${subFiles.length} 个文件`)
          files.push(...subFiles)
        } catch (error) {
          logger.error(`无法访问目录 ${fullPath}:`, error)
        }
      } else if (entry.isFile()) {
        // 检查文件扩展名
        const ext = path.extname(entry.name).toLowerCase()
        
        if (extensions.includes(ext)) {
          let relativePath: string
          if (baseDir) {
            relativePath = path.relative(baseDir, fullPath)
          } else {
            relativePath = fullPath
          }
          
          // 标准化路径分隔符（在Windows上统一使用正斜杠）
          relativePath = relativePath.replace(/\\/g, '/')
          logger.debug(`找到匹配文件: ${relativePath}`)
          files.push(relativePath)
        }
      }
    }
  } catch (error) {
    logger.error(`扫描目录失败 ${directory}:`, error)
  }
  
  return files
}

export async function POST(request: NextRequest) {
  try {
    const { gptSovitsPath, modelVersion, modelType } = await request.json()

    if (!gptSovitsPath || !modelVersion || !modelType) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 构建扫描路径 - 查找以特定前缀开头的文件夹
    const prefix = modelType === 'gpt' 
      ? `GPT_weights_${modelVersion}` 
      : `SoVITS_weights_${modelVersion}`
    
    const baseDir = gptSovitsPath
    const targetFolders: string[] = []

    // 扫描基础目录，查找以指定前缀开头的文件夹
    if (fs.existsSync(baseDir)) {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith(prefix)) {
          targetFolders.push(path.join(baseDir, entry.name))
        }
      }
    }

    if (targetFolders.length === 0) {
      return NextResponse.json(
        { error: `未找到以 ${prefix} 开头的文件夹` },
        { status: 404 }
      )
    }

    // 扫描所有匹配的文件夹
    const allFiles: Array<{ name: string; path: string; folder: string }> = []
    const fileExtension = modelType === 'gpt' ? '.ckpt' : '.pth'

    for (const folder of targetFolders) {
      const files = scanFilesInDirectory(folder, [fileExtension], baseDir)
      for (const filePath of files) {
        const fileName = path.basename(filePath)
        const folderName = path.basename(folder)
        allFiles.push({
          name: fileName,
          path: filePath,
          folder: folderName
        })
      }
    }

    return NextResponse.json({
      files: allFiles,
      scannedFolders: targetFolders.map(f => path.basename(f))
    })

  } catch (error) {
    logger.error('扫描模型文件失败:', error)
    return NextResponse.json(
      { error: '扫描模型文件失败' },
      { status: 500 }
    )
  }
} 