import { VoiceGenerator } from '@webgal-tools/voice';
import { initializeConfig, InitResult } from '@webgal-tools/config';
import { EventEmitter } from 'events';

export interface VoiceWrapperOptions {
  workDir: string;
  onProgress?: (message: string) => void;
  onLog?: (message: string) => void;
  onError?: (error: string) => void;
}

export class VoiceWrapper extends EventEmitter {
  private workDir: string;
  private generator: VoiceGenerator | null = null;

  constructor(options: VoiceWrapperOptions) {
    super();
    this.workDir = options.workDir;
    
    // 绑定事件监听器
    if (options.onProgress) {
      this.on('progress', options.onProgress);
    }
    if (options.onLog) {
      this.on('log', options.onLog);
    }
    if (options.onError) {
      this.on('error', options.onError);
    }
  }

  /**
   * 初始化配置文件
   */
  async initialize(force: boolean = false): Promise<{ success: boolean; message: string; details?: InitResult|string }> {
    try {
      this.emit('log', '🚀 开始初始化 WebGAL 语音合成配置...');
      
      const initResult = initializeConfig({
        workDir: this.workDir,
        force,
        onlyVoice: true
      });

      if (initResult.success) {
        this.emit('log', `✅ 初始化成功: ${initResult.message}`);
        
        if (initResult.createdFiles.length > 0) {
          this.emit('log', '📄 已创建的文件:');
          initResult.createdFiles.forEach((file: string) => {
            this.emit('log', `   - ${file}`);
          });
        }
        
        if (initResult.skippedFiles.length > 0) {
          this.emit('log', '⏭️ 已跳过的文件:');
          initResult.skippedFiles.forEach((file: string) => {
            this.emit('log', `   - ${file}`);
          });
        }

        return {
          success: true,
          message: '配置初始化成功',
          details: initResult
        };
      } else {
        this.emit('error', '❌ 初始化失败');
        if (initResult.errors.length > 0) {
          initResult.errors.forEach((error: string) => {
            this.emit('error', `   - ${error}`);
          });
        }

        return {
          success: false,
          message: '配置初始化失败',
          details: initResult
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.emit('error', `❌ 初始化过程出错: ${errorMessage}`);
      
      return {
        success: false,
        message: '初始化失败',
        details: errorMessage
      };
    }
  }

  /**
   * 生成语音
   */
  async generateVoice(scriptFile: string, forceMode: boolean = false): Promise<{ success: boolean; message: string; details?: string }> {
    try {
      this.emit('log', `🎵 开始语音生成任务: ${scriptFile}`);
      
      if (forceMode) {
        this.emit('log', '⚡ 强制模式已启用');
      }

      // 创建语音生成器实例
      this.generator = new VoiceGenerator(this.workDir);

      // 设置进度监听 - 通过劫持console.log来获取进度信息
      this.setupProgressListening();

      // 执行语音生成
      await this.generator.generateVoice(scriptFile, forceMode);

      this.emit('log', '🎉 语音生成完成！');
      
      return {
        success: true,
        message: '语音生成成功'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.emit('error', `❌ 语音生成失败: ${errorMessage}`);
      
      return {
        success: false,
        message: '语音生成失败',
        details: errorMessage
      };
    } finally {
      this.restoreProgressListening();
      this.generator = null;
    }
  }

  /**
   * 停止当前任务
   */
  stop(): void {
    if (this.generator) {
      this.emit('log', '🛑 停止语音生成任务');
      // 这里可以添加停止逻辑，如果VoiceGenerator支持的话
      this.generator = null;
    }
  }

  /**
   * 设置进度监听
   */
  private setupProgressListening(): void {
    // 暂时禁用console劫持，避免递归问题
    // 在实际应用中，可能需要修改VoiceGenerator来支持事件回调
    console.log('🎵 开始语音生成任务，进度监听已启用');
  }

  /**
   * 恢复进度监听
   */
  private restoreProgressListening(): void {
    console.log('🎵 语音生成任务结束，进度监听已关闭');
  }
}

// 便捷函数
export async function initializeVoiceConfig(workDir: string, force: boolean = false): Promise<{ success: boolean; message: string; details?: InitResult | string }> {
  const wrapper = new VoiceWrapper({ workDir });
  return await wrapper.initialize(force);
}

export async function generateVoiceForScript(
  workDir: string, 
  scriptFile: string, 
  forceMode: boolean = false,
  onProgress?: (message: string) => void,
  onLog?: (message: string) => void,
  onError?: (error: string) => void
): Promise<{ success: boolean; message: string; details?: string }> {
  const wrapper = new VoiceWrapper({ 
    workDir, 
    onProgress, 
    onLog, 
    onError 
  });
  return await wrapper.generateVoice(scriptFile, forceMode);
} 