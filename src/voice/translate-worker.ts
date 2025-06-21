#!/usr/bin/env node
import { UniversalAIService } from '../translate/ai-service.js';
import { TranslateConfig } from './config.js';

// 创建AI服务实例
const aiService = new UniversalAIService();

interface TranslateTask {
  id: string;
  character: string;
  originalText: string;
  targetLanguage: string;
  audioFileName: string;
  context?: string;
}

interface TranslateResult {
  id: string;
  character: string;
  originalText: string;
  translatedText: string;
  audioFileName: string;
  success: boolean;
  error?: string;
}

// 处理父进程发送的消息
process.on('message', async (message: { type: string; config?: TranslateConfig; task?: TranslateTask }) => {
  if (message.type === 'translate') {
    const { task } = message;
    const { config } = message;
    
    if (!task || !config) {
      process.send!({
        type: 'error',
        message: 'Missing task or config'
      });
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      try {
        if (retryCount > 0) {
          console.error(`[翻译子进程] 重试翻译 (${retryCount}/${maxRetries}): ${task.character} - ${task.originalText.substring(0, 20)}...`);
        } else {
          console.error(`[翻译子进程] 开始翻译: ${task.character} - ${task.originalText.substring(0, 20)}...`);
        }
        
        const translatedText = await aiService.translate(
          task.character,
          task.originalText,
          task.targetLanguage,
          config,
          task.context
        );

        // 检查翻译结果是否为空字符串
        if (!translatedText || translatedText.trim() === '') {
          if (retryCount < maxRetries) {
            retryCount++;
            console.error(`[翻译子进程] 翻译结果为空，准备重试 (${retryCount}/${maxRetries})`);
            // 添加短暂延迟后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          } else {
            console.error(`[翻译子进程] 翻译结果为空，已达最大重试次数，使用原文`);
            throw new Error('翻译结果为空字符串');
          }
        }

        const result: TranslateResult = {
          id: task.id,
          character: task.character,
          originalText: task.originalText,
          translatedText,
          audioFileName: task.audioFileName,
          success: true
        };

        // 发送翻译结果给父进程
        process.send!({
          type: 'translated',
          result
        });
        
        return; // 成功完成，退出重试循环

      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.error(`[翻译子进程] 翻译失败，准备重试 (${retryCount}/${maxRetries}):`, error instanceof Error ? error.message : String(error));
          // 添加短暂延迟后重试
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        } else {
          console.error(`[翻译子进程] 翻译失败，已达最大重试次数:`, error instanceof Error ? error.message : String(error));
          
          const result: TranslateResult = {
            id: task.id,
            character: task.character,
            originalText: task.originalText,
            translatedText: task.originalText, // 失败时使用原文
            audioFileName: task.audioFileName,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };

          process.send!({
            type: 'translated',
            result
          });
          
          return; // 达到最大重试次数，退出
        }
      }
    }
  }
});

// 通知父进程子进程已准备就绪
process.send!({
  type: 'ready'
});

console.error('[翻译子进程] 已启动并准备接收任务'); 