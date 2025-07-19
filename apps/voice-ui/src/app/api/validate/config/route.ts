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
    
    const configPath = path.join(workDir, 'voice.config.json')
    
    // 检查配置文件是否存在
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({ valid: false, error: '配置文件不存在' })
    }
    
    try {
      // 尝试解析配置文件
      const configContent = fs.readFileSync(configPath, 'utf-8')
      const config = JSON.parse(configContent)
      
      // 基本验证
      const requiredFields = ['volume', 'gpt_sovits_url', 'gpt_sovits_path', 'model_version', 'characters']
      const missingFields = requiredFields.filter(field => !config[field])
      
      if (missingFields.length > 0) {
        return NextResponse.json({ 
          valid: false, 
          error: `配置文件缺少必要字段: ${missingFields.join(', ')}` 
        })
      }
      
      // 验证 characters 数组
      if (!Array.isArray(config.characters)) {
        return NextResponse.json({ valid: false, error: 'characters 必须是数组' })
      }
      
      // 验证每个角色配置
      for (let i = 0; i < config.characters.length; i++) {
        const char = config.characters[i]
        const requiredCharFields = ['character_name', 'gpt', 'sovits', 'ref_audio']
        const missingCharFields = requiredCharFields.filter(field => !char[field])
        
        if (missingCharFields.length > 0) {
          return NextResponse.json({ 
            valid: false, 
            error: `角色 ${i + 1} 缺少必要字段: ${missingCharFields.join(', ')}` 
          })
        }
      }
      
      // 注释掉路径存在性检查，只验证格式正确性
      // if (config.gpt_sovits_path && config.gpt_sovits_path.trim() && !fs.existsSync(config.gpt_sovits_path)) {
      //   return NextResponse.json({ 
      //     valid: false, 
      //     error: `GPT-SoVITS路径不存在: ${config.gpt_sovits_path}` 
      //   })
      // }
      
      return NextResponse.json({ 
        valid: true, 
        charactersCount: config.characters.length,
        translateEnabled: config.translate?.check || false
      })
    } catch {
      return NextResponse.json({ valid: false, error: '配置文件格式错误' })
    }
  } catch (error) {
    console.error('验证配置文件失败:', error)
    return NextResponse.json({ valid: false, error: '验证失败' })
  }
} 