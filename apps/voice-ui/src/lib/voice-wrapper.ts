import { startVoiceService } from '@webgal-tools/voice';
import { initializeConfig, InitResult } from '@webgal-tools/config';

export interface VoiceWrapperOptions {
  workDir: string;
  onLog?: (message: string) => void;
  onError?: (error: string) => void;
}

export class VoiceWrapper {
  private workDir: string;
  private isRunning: boolean = false;

  constructor(options: VoiceWrapperOptions) {
    this.workDir = options.workDir;
    
    // 绑定日志回调
    if (options.onLog) {
      this.onLog = options.onLog;
    }
    if (options.onError) {
      this.onError = options.onError;
    }
  }

  private onLog: (message: string) => void = () => {};
  private onError: (error: string) => void = () => {};

  /**
   * 初始化配置文件
   */
  async initialize(force: boolean = false): Promise<{ success: boolean; message: string; details?: InitResult|string }> {
    try {
      this.onLog('🚀 开始初始化 WebGAL 语音合成配置...');
      
      const initResult = initializeConfig({
        workDir: this.workDir,
        force,
        onlyVoice: true
      });

      if (initResult.success) {
        this.onLog(`✅ 初始化成功: ${initResult.message}`);
        
        if (initResult.createdFiles.length > 0) {
          this.onLog('📄 已创建的文件:');
          initResult.createdFiles.forEach((file: string) => {
            this.onLog(`   - ${file}`);
          });
        }
        
        if (initResult.skippedFiles.length > 0) {
          this.onLog('⏭️ 已跳过的文件:');
          initResult.skippedFiles.forEach((file: string) => {
            this.onLog(`   - ${file}`);
          });
        }

        return {
          success: true,
          message: '配置初始化成功',
          details: initResult
        };
      } else {
        this.onError('❌ 初始化失败');
        if (initResult.errors.length > 0) {
          initResult.errors.forEach((error: string) => {
            this.onError(`   - ${error}`);
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
      this.onError(`❌ 初始化过程出错: ${errorMessage}`);
      
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
    if (this.isRunning) {
      return {
        success: false,
        message: '已有任务正在运行'
      };
    }

    try {
      this.isRunning = true;
      this.onLog(`🎵 开始语音生成任务: ${scriptFile}`);
      
      if (forceMode) {
        this.onLog('⚡ 强制模式已启用');
      }

      // 直接使用新的 voice 包接口
      const result = await startVoiceService({
        workDir: this.workDir,
        scriptFile,
        forceMode
      });

      if (result.success) {
        this.onLog('🎉 语音生成完成！');
        return {
          success: true,
          message: '语音生成成功'
        };
      } else {
        this.onError(`❌ 语音生成失败: ${result.error}`);
        return {
          success: false,
          message: '语音生成失败',
          details: result.error
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.onError(`❌ 语音生成失败: ${errorMessage}`);
      
      return {
        success: false,
        message: '语音生成失败',
        details: errorMessage
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 停止当前任务
   */
  stop(): void {
    if (this.isRunning) {
      this.onLog('🛑 停止语音生成任务');
      this.isRunning = false;
    }
  }

  /**
   * 检查是否正在运行
   */
  isTaskRunning(): boolean {
    return this.isRunning;
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
  onLog?: (message: string) => void,
  onError?: (error: string) => void
): Promise<{ success: boolean; message: string; details?: string }> {
  const wrapper = new VoiceWrapper({ 
    workDir, 
    onLog, 
    onError 
  });
  return await wrapper.generateVoice(scriptFile, forceMode);
}