import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { VoiceTask } from './generator.js';
import { TranslateConfig, CharacterVoiceConfig } from './config.js';
import { GPTSoVITSAPI } from './request.js';
import { UniversalAIService } from '../translate/ai-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

interface VoiceSynthesisTask extends VoiceTask {
  id: string;
  characterConfig: CharacterVoiceConfig;
}

export class ParallelProcessor {
  private translateWorkers: ChildProcess[] = [];
  private pendingTranslations = new Map<string, TranslateTask>();
  private completedTranslations = new Map<string, TranslateResult>();
  private voiceTasks: VoiceSynthesisTask[] = [];
  private completedVoiceTasks: VoiceTask[] = [];
  private api: GPTSoVITSAPI;
  private audioOutputDir: string;
  
  private totalTasks = 0;
  private completedTranslateCount = 0;
  private completedVoiceCount = 0;
  
  // 语音合成队列
  private voiceQueue: TranslateResult[] = [];
  private isVoiceSynthesizing = false;
  private currentCharacter: string | null = null;
  
  // 并发控制
  private maxTranslators: number;
  private activeTranslators = 0;
  private pendingTaskQueue: { config: TranslateConfig; task: TranslateTask }[] = [];
  private currentWorkerIndex = 0; // 轮询负载均衡的当前索引
  
  constructor(api: GPTSoVITSAPI, audioOutputDir: string) {
    this.api = api;
    this.audioOutputDir = audioOutputDir;
    // 从环境变量获取最大翻译并发数，默认为1（保持单线程）
    this.maxTranslators = parseInt(process.env.MAX_TRANSLATOR || '1');
    console.error(`🔧 最大翻译并发数: ${this.maxTranslators}`);
  }

  /**
   * 启动翻译子进程
   */
  private async startTranslateWorkers(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < this.maxTranslators; i++) {
      promises.push(this.createTranslateWorker(i));
    }
    
    await Promise.all(promises);
    console.error(`🚀 已启动 ${this.maxTranslators} 个翻译子进程`);
  }

  /**
   * 创建单个翻译子进程
   */
  private async createTranslateWorker(index: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'translate-worker.js');
      const worker = spawn('node', [workerPath], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc']
      });

      worker.on('message', (message: any) => {
        this.handleWorkerMessage(message, index);
      });

      worker.on('error', (error: any) => {
        console.error(`翻译子进程 ${index} 错误:`, error);
        reject(error);
      });

             worker.on('exit', (code: any) => {
         console.error(`翻译子进程 ${index} 退出，代码: ${code}`);
         this.activeTranslators--;
         // 重置轮询索引以避免指向已退出的进程
         this.currentWorkerIndex = 0;
         // 处理待处理队列
         this.processTranslateQueue();
       });

      this.translateWorkers[index] = worker;

      // 等待子进程准备就绪
      worker.once('message', (message: any) => {
        if (message.type === 'ready') {
          console.error(`🚀 翻译子进程 ${index} 已启动`);
          resolve();
        } else {
          reject(new Error(`翻译子进程 ${index} 启动失败`));
        }
      });
    });
  }

  /**
   * 处理翻译子进程的消息
   */
  private handleWorkerMessage(message: any, workerIndex: number): void {
    if (message.type === 'translated') {
      const result: TranslateResult = message.result;
      console.error(`✅ 翻译完成 [Worker ${workerIndex}]: ${result.character} - ${result.translatedText.substring(0, 20)}...`);
      
      this.completedTranslations.set(result.id, result);
      this.completedTranslateCount++;
      this.activeTranslators--;
      
      // 将翻译结果加入语音合成队列
      this.enqueueVoiceSynthesis(result);
      
      // 处理待处理队列
      this.processTranslateQueue();
      
      // 检查是否所有翻译都完成了
      if (this.completedTranslateCount >= this.totalTasks) {
        this.stopTranslateWorkers();
      }
    } else if (message.type === 'error') {
      console.error(`翻译子进程 ${workerIndex} 错误:`, message.message);
      this.activeTranslators--;
      this.processTranslateQueue();
    }
  }

  /**
   * 处理翻译任务队列
   */
  private processTranslateQueue(): void {
    while (this.pendingTaskQueue.length > 0 && this.activeTranslators < this.maxTranslators) {
      const { config, task } = this.pendingTaskQueue.shift()!;
      console.error(`🔄 从队列处理任务: ${task.character} (队列剩余: ${this.pendingTaskQueue.length})`);
      this.sendTranslateTask(config, task);
    }
  }

  /**
   * 发送翻译任务到可用的子进程（轮询负载均衡）
   */
  private sendTranslateTask(config: TranslateConfig, task: TranslateTask): void {
    // 如果已达到最大并发数，加入队列
    if (this.activeTranslators >= this.maxTranslators) {
      this.pendingTaskQueue.push({ config, task });
      console.error(`📋 任务加入队列: ${task.character} (当前活跃: ${this.activeTranslators}/${this.maxTranslators})`);
      return;
    }

    // 轮询负载均衡：从当前索引开始查找可用的子进程
    let attempts = 0;
    while (attempts < this.translateWorkers.length) {
      const workerIndex = this.currentWorkerIndex;
      const worker = this.translateWorkers[workerIndex];
      
      // 更新下一个轮询索引
      this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.translateWorkers.length;
      attempts++;
      
      if (worker && !worker.killed) {
        this.activeTranslators++;
        worker.send({
          type: 'translate',
          config,
          task
        });
        console.error(`📤 发送翻译任务到 Worker ${workerIndex}: ${task.character} (负载: ${this.activeTranslators}/${this.maxTranslators})`);
        return;
      }
    }
    
    // 如果所有子进程都不可用，加入队列
    this.pendingTaskQueue.push({ config, task });
    console.error(`⚠️ 所有子进程不可用，任务加入队列: ${task.character}`);
  }

  /**
   * 将翻译结果加入语音合成队列（使用智能插入法）
   */
  private enqueueVoiceSynthesis(translateResult: TranslateResult): void {
    // 智能插入法：从队列头部开始扫描，找到最后一个相同名字的任务
    let insertIndex = this.voiceQueue.length; // 默认插入到末尾
    
    for (let i = this.voiceQueue.length - 1; i >= 0; i--) {
      if (this.voiceQueue[i].character === translateResult.character) {
        insertIndex = i + 1; // 插入到最后一个相同角色任务之后
        break;
      }
    }
    
    this.voiceQueue.splice(insertIndex, 0, translateResult);
    console.error(`📝 语音任务入队: ${translateResult.character} (位置: ${insertIndex}, 队列长度: ${this.voiceQueue.length})`);
    
    // 尝试处理队列
    this.processVoiceQueue();
  }

  /**
   * 处理语音合成队列
   */
  private async processVoiceQueue(): Promise<void> {
    if (this.isVoiceSynthesizing || this.voiceQueue.length === 0) {
      return;
    }

    this.isVoiceSynthesizing = true;

    while (this.voiceQueue.length > 0) {
      const translateResult = this.voiceQueue.shift()!;
      
      // 如果需要切换角色，优先处理同一角色的任务
      if (this.currentCharacter && this.currentCharacter !== translateResult.character) {
        // 查找队列中是否有当前角色的任务
        const sameCharacterIndex = this.voiceQueue.findIndex(task => task.character === this.currentCharacter);
        if (sameCharacterIndex !== -1) {
          // 将当前任务放回队列，优先处理同角色任务
          this.voiceQueue.unshift(translateResult);
          const sameCharacterTask = this.voiceQueue.splice(sameCharacterIndex + 1, 1)[0];
          await this.synthesizeVoice(sameCharacterTask);
          continue;
        }
      }

      await this.synthesizeVoice(translateResult);
    }

    this.isVoiceSynthesizing = false;
  }

  /**
   * 执行语音合成
   */
  private async synthesizeVoice(translateResult: TranslateResult): Promise<void> {
    // 找到对应的语音任务
    const voiceTask = this.voiceTasks.find(task => task.id === translateResult.id);
    if (!voiceTask) {
      console.error(`❌ 未找到对应的语音任务: ${translateResult.id}`);
      this.completedVoiceCount++;
      return;
    }

    try {
      console.error(`🎵 开始语音合成: ${translateResult.character} (队列剩余: ${this.voiceQueue.length})`);
      
      // 检查是否需要切换角色模型
      if (this.currentCharacter !== translateResult.character) {
        console.error(`🔄 切换到角色: ${translateResult.character}`);
        
        // 设置角色模型
        await this.api.setGptModel(voiceTask.characterConfig.gpt);
        await this.api.setSovitsModel(
          voiceTask.characterConfig.sovits,
          voiceTask.characterConfig.inferrence_config?.prompt_language || '中文',
          voiceTask.characterConfig.inferrence_config?.text_language || '中文'
        );
        
        this.currentCharacter = translateResult.character;
      }

      // 生成语音
      const outputPath = await this.api.generateVoice(
        voiceTask.characterConfig.ref_audio,
        voiceTask.characterConfig.ref_text,
        translateResult.translatedText,
        voiceTask.characterConfig.inferrence_config || {}
      );

      // 下载音频文件
      const finalAudioPath = path.join(this.audioOutputDir, translateResult.audioFileName);
      await this.api.downloadAudio(outputPath, finalAudioPath);

      // 创建完成的任务
      const completedTask: VoiceTask = {
        character: translateResult.character,
        originalText: translateResult.originalText,
        targetText: translateResult.translatedText,
        audioFileName: translateResult.audioFileName
      };

      this.completedVoiceTasks.push(completedTask);
      this.completedVoiceCount++;

      console.error(`✅ 语音合成完成: ${translateResult.character} - ${translateResult.audioFileName}`);

    } catch (error) {
      console.error(`❌ 语音合成失败 ${translateResult.character}:`, error);
      this.completedVoiceCount++;
    }
  }

  /**
   * 停止所有翻译子进程
   */
  private stopTranslateWorkers(): void {
    for (let i = 0; i < this.translateWorkers.length; i++) {
      const worker = this.translateWorkers[i];
      if (worker && !worker.killed) {
        worker.kill();
        console.error(`🛑 翻译子进程 ${i} 已关闭`);
      }
    }
    this.translateWorkers = [];
    this.activeTranslators = 0;
    console.error('🛑 所有翻译子进程已关闭');
  }

  /**
   * 处理翻译和语音合成任务
   */
  async processTasksParallel(
    voiceTasks: VoiceTask[],
    characterConfigs: Map<string, CharacterVoiceConfig>,
    translateConfig: TranslateConfig,
    contextMap: Map<string, string>
  ): Promise<VoiceTask[]> {
    
    this.totalTasks = voiceTasks.length;
    this.completedTranslateCount = 0;
    this.completedVoiceCount = 0;
    this.completedVoiceTasks = [];
    this.voiceTasks = [];

    if (this.totalTasks === 0) {
      return [];
    }

    console.error(`🚀 开始并行处理 ${this.totalTasks} 个任务`);

    // 启动翻译子进程
    await this.startTranslateWorkers();

    // 准备语音任务
    for (const task of voiceTasks) {
      const characterConfig = characterConfigs.get(task.character);
      if (!characterConfig) {
        console.error(`❌ 角色 ${task.character} 未在配置中找到`);
        continue;
      }

      const voiceTask: VoiceSynthesisTask = {
        ...task,
        id: `${task.character}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        characterConfig
      };

      this.voiceTasks.push(voiceTask);

      // 发送翻译任务给子进程
      const translateTarget = characterConfig.translate_to;
      if (translateTarget) {
        const taskKey = `${task.character}:${task.originalText}`;
        const context = contextMap.get(taskKey);

        const translateTask: TranslateTask = {
          id: voiceTask.id,
          character: task.character,
          originalText: task.originalText,
          targetLanguage: translateTarget,
          audioFileName: task.audioFileName,
          context
        };

        this.sendTranslateTask(translateConfig, translateTask);
      } else {
        // 不需要翻译，直接使用原文进行语音合成
        const result: TranslateResult = {
          id: voiceTask.id,
          character: task.character,
          originalText: task.originalText,
          translatedText: task.originalText,
          audioFileName: task.audioFileName,
          success: true
        };
        
        this.completedTranslateCount++;
        this.enqueueVoiceSynthesis(result);
      }
    }

    // 等待所有任务完成
    return new Promise((resolve) => {
      const checkCompletion = () => {
        if (this.completedVoiceCount >= this.totalTasks) {
          console.error(`🎉 并行处理完成！成功处理 ${this.completedVoiceTasks.length}/${this.totalTasks} 个任务`);
          resolve(this.completedVoiceTasks);
        } else {
          setTimeout(checkCompletion, 100);
        }
      };
      
      checkCompletion();
    });
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopTranslateWorkers();
  }
} 