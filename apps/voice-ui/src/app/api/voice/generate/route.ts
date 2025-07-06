import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { VoiceWrapper } from '@/lib/voice-wrapper'

// 初始化全局变量
if (typeof global.currentVoiceTask === 'undefined') {
  global.currentVoiceTask = null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workDir, scriptFile, forceMode = false } = body
    
    if (!workDir || !scriptFile) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }
    
    // 检查是否有任务正在运行
    if (global.currentVoiceTask) {
      return NextResponse.json({ error: '已有任务正在运行，请等待当前任务完成或停止任务' }, { status: 409 })
    }
    
    // 检查工作目录和脚本文件是否存在
    if (!fs.existsSync(workDir)) {
      return NextResponse.json({ error: '工作目录不存在' }, { status: 400 })
    }
    
    const scriptPath = path.resolve(workDir, scriptFile)
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ error: '脚本文件不存在' }, { status: 400 })
    }
    
    try {
      // 创建语音包装器
      const wrapper = new VoiceWrapper({
        workDir,
        onLog: (message) => {
          // 直接广播，避免调用console.log导致递归
          if (global.broadcastToMonitorClients) {
            global.broadcastToMonitorClients({
              type: 'log',
              message: message
            })
            
            // 解析消息并广播监控事件
            parseAndBroadcastOutput(message)
          }
        },
        onError: (error) => {
          // 直接广播，避免调用console.error导致递归
          if (global.broadcastToMonitorClients) {
            global.broadcastToMonitorClients({
              type: 'log',
              message: `❌ ${error}`
            })
          }
        }
      })
      
      // 设置当前任务
      global.currentVoiceTask = {
        wrapper,
        workDir,
        scriptFile,
        startTime: Date.now()
      }
      
      // 广播任务开始事件
      if (global.broadcastToMonitorClients) {
        global.broadcastToMonitorClients({
          type: 'tasks_reset'
        })
        
        global.broadcastToMonitorClients({
          type: 'log',
          message: `🚀 开始语音生成任务: ${scriptFile}`
        })
      }
      
      // 处理脚本文件路径：去除scene前缀
      let processedScriptFile = scriptFile
      if (scriptFile.startsWith('scene/')) {
        processedScriptFile = scriptFile.substring(6) // 去除 'scene/' 前缀
      }
      
      // 异步执行语音生成
      wrapper.generateVoice(processedScriptFile, forceMode)
        .then((result) => {
          const duration = global.currentVoiceTask ? Date.now() - global.currentVoiceTask.startTime : 0
          
          if (result.success) {
            if (global.broadcastToMonitorClients) {
              global.broadcastToMonitorClients({
                type: 'log',
                message: `✅ 语音生成任务完成！耗时: ${Math.round(duration / 1000)}秒`
              })
            }
          } else {
            if (global.broadcastToMonitorClients) {
              global.broadcastToMonitorClients({
                type: 'log',
                message: `❌ 语音生成任务失败: ${result.message}`
              })
            }
          }
          
          // 清理当前任务
          global.currentVoiceTask = null
        })
        .catch((error) => {
          console.error('语音生成任务错误:', error)
          if (global.broadcastToMonitorClients) {
            global.broadcastToMonitorClients({
              type: 'log',
              message: `❌ 任务错误: ${error instanceof Error ? error.message : String(error)}`
            })
          }
          global.currentVoiceTask = null
        })
      
      return NextResponse.json({ 
        success: true, 
        message: '语音生成任务已启动',
        taskId: Date.now().toString()
      })
    } catch (error) {
      console.error('启动语音生成任务失败:', error)
      return NextResponse.json({ 
        error: '启动任务失败',
        details: error instanceof Error ? error.message : '未知错误'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('启动语音生成任务失败:', error)
    return NextResponse.json({ error: '启动任务失败' }, { status: 500 })
  }
}

// 解析voice程序的输出并广播监控事件
function parseAndBroadcastOutput(output: string) {
  if (!global.broadcastToMonitorClients) return
  
  const lines = output.split('\n').filter(line => line.trim())
  
  for (const line of lines) {
    // 这里可以根据voice程序的实际输出格式来解析
    // 示例解析规则：
    
    if (line.includes('翻译完成') || line.includes('translate completed')) {
      global.broadcastToMonitorClients({
        type: 'task_update',
        task: {
          id: `translate_${Date.now()}`,
          type: 'translate',
          character: '未知',
          text: line,
          status: 'completed',
          progress: 100,
          timestamp: Date.now()
        }
      })
    } else if (line.includes('语音生成完成') || line.includes('voice generated')) {
      global.broadcastToMonitorClients({
        type: 'task_update',
        task: {
          id: `voice_${Date.now()}`,
          type: 'voice',
          character: '未知',
          text: line,
          status: 'completed',
          progress: 100,
          timestamp: Date.now()
        }
      })
    } else if (line.includes('处理中') || line.includes('processing')) {
      global.broadcastToMonitorClients({
        type: 'task_update',
        task: {
          id: `processing_${Date.now()}`,
          type: 'voice',
          character: '未知',
          text: line,
          status: 'processing',
          progress: 50,
          timestamp: Date.now()
        }
      })
    }
  }
}

export async function GET() {
  try {
    // 返回当前任务状态
    if (global.currentVoiceTask) {
      const duration = Date.now() - global.currentVoiceTask.startTime
      return NextResponse.json({
        isRunning: true,
        workDir: global.currentVoiceTask.workDir,
        scriptFile: global.currentVoiceTask.scriptFile,
        startTime: global.currentVoiceTask.startTime,
        duration: duration
      })
    } else {
      return NextResponse.json({
        isRunning: false
      })
    }
  } catch (error) {
    console.error('获取任务状态失败:', error)
    return NextResponse.json({ error: '获取任务状态失败' }, { status: 500 })
  }
} 