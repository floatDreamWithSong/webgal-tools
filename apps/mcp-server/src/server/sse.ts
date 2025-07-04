import express, { Request, Response, Express } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { server } from './index.js';
import { logger } from '@webgal-mcp/logger';

// 存储多个并发连接的transport
const transports: { [sessionId: string]: SSEServerTransport } = {};

export const app: Express = express();

// 中间件
app.use(express.json());

// POST endpoint for message handling
const POST_ENDPOINT = '/messages';

app.post(POST_ENDPOINT, async (req: Request, res: Response) => {
  try {
    logger.info('收到消息请求:', req.body);
    
    // 从查询参数获取sessionId
    const sessionId = req.query.sessionId;
    
    if (typeof sessionId !== 'string') {
      res.status(400).json({ error: '无效的session ID' });
      return;
    }
    
    const transport = transports[sessionId];
    if (!transport) {
      res.status(400).json({ error: '未找到对应的transport' });
      return;
    }
    
    // 处理POST消息 - 重要：必须传递req.body
    await transport.handlePostMessage(req, res, req.body);
    
  } catch (error) {
    logger.error('处理消息时发生错误:', error);
    res.status(500).json({ error: '内部服务器错误' });
  }
});

// GET endpoint for establishing SSE connection
app.get('/connect', async (req: Request, res: Response) => {
  try {
    logger.info('收到连接请求');
    
    // 创建新的SSE transport
    const transport = new SSEServerTransport(POST_ENDPOINT, res);
    logger.info('创建新的transport，session ID:', transport.sessionId);
    
    // 存储transport
    transports[transport.sessionId] = transport;
    
    // 监听连接关闭事件
    res.on('close', () => {
      logger.info('SSE连接已关闭');
      delete transports[transport.sessionId];
    });
    
    // 连接MCP服务器
    await server.connect(transport);
    
    logger.info('SSE连接已建立');
    
  } catch (error) {
    logger.error('建立SSE连接时发生错误:', error);
    res.status(500).json({ error: '建立连接失败' });
  }
});

// 健康检查endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    activeConnections: Object.keys(transports).length,
    timestamp: new Date().toISOString()
  });
});

export function startSSEServer(port: number = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const httpServer = app.listen(port, () => {
      logger.info(`WebGAL MCP SSE服务器已启动，端口: ${port}`);
      logger.info(`连接端点: http://localhost:${port}/connect`);
      logger.info(`健康检查: http://localhost:${port}/health`);
      resolve();
    });
    
    httpServer.on('error', (error) => {
      logger.error('启动SSE服务器时发生错误:', error);
      reject(error);
    });
  });
} 