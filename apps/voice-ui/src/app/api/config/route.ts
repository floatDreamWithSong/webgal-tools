import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// 获取配置文件
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workDir = searchParams.get('workDir')
    
    if (!workDir) {
      return NextResponse.json({ error: '缺少工作目录参数' }, { status: 400 })
    }
    
    const configPath = path.join(workDir, 'voice.config.json')
    
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ error: '配置文件不存在' }, { status: 404 })
    }
    
    const configContent = fs.readFileSync(configPath, 'utf-8')
    const config = JSON.parse(configContent)
    
    return NextResponse.json(config)
  } catch (error) {
    console.error('读取配置文件失败:', error)
    return NextResponse.json({ error: '读取配置文件失败' }, { status: 500 })
  }
}

// 保存配置文件
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workDir, config } = body
    
    if (!workDir || !config) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }
    
    // 验证工作目录是否存在
    if (!fs.existsSync(workDir)) {
      return NextResponse.json({ error: '工作目录不存在' }, { status: 400 })
    }
    
    const configPath = path.join(workDir, 'voice.config.json')
    
    // 创建备份
    if (fs.existsSync(configPath)) {
      const configBackUpPath = path.resolve(workDir,'.voice-config-backups')
      if(!fs.existsSync(configBackUpPath)){
        fs.mkdirSync(configBackUpPath)
      }
      const backupPath = path.join(configBackUpPath, `voice.config.json.backup.${Date.now()}`)
      fs.copyFileSync(configPath, backupPath)
    }
    
    // 保存配置文件
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
    
    return NextResponse.json({ success: true, message: '配置保存成功' })
  } catch (error) {
    console.error('保存配置文件失败:', error)
    return NextResponse.json({ error: '保存配置文件失败' }, { status: 500 })
  }
} 