import { NextRequest, NextResponse } from 'next/server'

// 全局监控客户端连接管理
declare global {
  var monitorClients: Set<{
    controller: ReadableStreamDefaultController
    response: Response
  }>
}

// 初始化全局变量
if (typeof global.monitorClients === 'undefined') {
  global.monitorClients = new Set()
}

// 广播消息到所有监控客户端（内部函数）
function broadcastToMonitorClients(data: Record<string, unknown>) {
  const message = `data: ${JSON.stringify(data)}\n\n`
  const encoder = new TextEncoder()
  
  // 移除已断开的连接
  const disconnectedClients = new Set<{
    controller: ReadableStreamDefaultController
    response: Response
  }>()
  
  for (const client of global.monitorClients) {
    try {
      client.controller.enqueue(encoder.encode(message))
    } catch {
      disconnectedClients.add(client)
    }
  }
  
  // 清理断开的连接
  for (const client of disconnectedClients) {
    global.monitorClients.delete(client)
  }
}

// 将广播函数挂载到全局对象上，供其他模块使用
if (typeof global.broadcastToMonitorClients === 'undefined') {
  (global as Record<string, unknown>).broadcastToMonitorClients = broadcastToMonitorClients
}

export async function GET(request: NextRequest) {
  try {
    const stream = new ReadableStream({
      start(controller) {
        // 发送连接成功消息
        const connectMessage = `data: ${JSON.stringify({
          type: 'connect',
          message: '监控服务连接成功'
        })}\n\n`
        
        controller.enqueue(new TextEncoder().encode(connectMessage))
        
        // 将客户端添加到监控列表
        const client = { controller, response: new Response() }
        global.monitorClients.add(client)
        
        // 定期发送心跳
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeatMessage = `data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: Date.now()
            })}\n\n`
            
            controller.enqueue(new TextEncoder().encode(heartbeatMessage))
          } catch {
            // 客户端断开连接
            clearInterval(heartbeatInterval)
            global.monitorClients.delete(client)
          }
        }, 30000) // 30秒心跳
        
        // 监听客户端断开
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval)
          global.monitorClients.delete(client)
          controller.close()
        })
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })
  } catch (error) {
    console.error('监控服务连接失败:', error)
    return NextResponse.json({ error: '监控服务连接失败' }, { status: 500 })
  }
} 