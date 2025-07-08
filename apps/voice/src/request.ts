import { EventSource } from 'eventsource';
import fs from 'fs';
import path from 'path';
import { logger } from '@webgal-tools/logger';

// 语言选项映射（基于原代码中的 dict_language）
const LANGUAGE_OPTIONS = {
  '中文': 'all_zh',
  '英文': 'en', 
  '日文': 'all_ja',
  '粤语': 'all_yue',
  '韩文': 'all_ko',
  '中英混合': 'zh',
  '日英混合': 'ja',
  '粤英混合': 'yue',
  '韩英混合': 'ko',
  '多语种混合': 'auto',
  '多语种混合(粤语)': 'auto_yue'
};

// 文本切分选项
const TEXT_CUT_OPTIONS = {
  '不切': 'no_cut',
  '凑四句一切': 'cut1',
  '凑50字一切': 'cut2', 
  '按中文句号。切': 'cut3',
  '按英文句号.切': 'cut4',
  '按标点符号切': 'cut5'
};

interface VoiceGenerationConfig {
  prompt_language?: keyof typeof LANGUAGE_OPTIONS;
  text_language?: keyof typeof LANGUAGE_OPTIONS;
  how_to_cut?: keyof typeof TEXT_CUT_OPTIONS;
  top_k?: number;           // 1-100
  top_p?: number;           // 0-1, step 0.05
  temperature?: number;     // 0-1, step 0.05
  ref_text_free?: boolean;
  speed?: number;           // 0.6-1.65, step 0.05
  if_freeze?: boolean;
  inp_refs?: string[] | null;  // 多个参考音频路径
  sample_steps?: number;    // [4, 8, 16, 32] or [4, 8, 16, 32, 64, 128] for v3
  if_sr?: boolean;          // 仅v3模型可用
  pause_second?: number;    // 0.1-0.5, step 0.01
}

interface ModelVersionInfo {
  version: string;
  isV3V4?: boolean;
}

interface GradioResponse {
  event_id: string;
}

interface SSEMessage {
  msg: string;
  event_id: string;
  output?: {
    data: Array<{
      path: string;
      url: string;
      orig_name: string;
      size?: number;
      mime_type?: string;
      meta: {
        _type: string;
      };
    }>;
    is_generating: boolean;
    success?: boolean;
  };
  success?: boolean;
}

class GPTSoVITSAPI {
  private baseUrl: string;
  private sessionHash: string;
  private modelVersion: ModelVersionInfo;

  constructor(baseUrl: string = 'http://localhost:9872', modelVersion: string = 'v2') {
    this.baseUrl = baseUrl;
    this.sessionHash = this.generateSessionHash();
    this.modelVersion = {
      version: modelVersion,
      isV3V4: ['v3', 'v4'].includes(modelVersion)
    };
  }

  private generateSessionHash(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * 验证参数是否在允许范围内
   */
  private validateConfig(config: VoiceGenerationConfig): void {
    // 验证语言选项
    if (config.prompt_language && !(config.prompt_language in LANGUAGE_OPTIONS)) {
      throw new Error(`Invalid prompt_language. Must be one of: ${Object.keys(LANGUAGE_OPTIONS).join(', ')}`);
    }
    
    if (config.text_language && !(config.text_language in LANGUAGE_OPTIONS)) {
      throw new Error(`Invalid text_language. Must be one of: ${Object.keys(LANGUAGE_OPTIONS).join(', ')}`);
    }

    // 验证文本切分选项
    if (config.how_to_cut && !(config.how_to_cut in TEXT_CUT_OPTIONS)) {
      throw new Error(`Invalid how_to_cut. Must be one of: ${Object.keys(TEXT_CUT_OPTIONS).join(', ')}`);
    }

    // 验证数值范围
    if (config.top_k !== undefined && (config.top_k < 1 || config.top_k > 100)) {
      throw new Error('top_k must be between 1 and 100');
    }

    if (config.top_p !== undefined && (config.top_p < 0 || config.top_p > 1)) {
      throw new Error('top_p must be between 0 and 1');
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 1)) {
      throw new Error('temperature must be between 0 and 1');
    }

    if (config.speed !== undefined && (config.speed < 0.6 || config.speed > 1.65)) {
      throw new Error('speed must be between 0.6 and 1.65');
    }

    if (config.pause_second !== undefined && (config.pause_second < 0.1 || config.pause_second > 0.5)) {
      throw new Error('pause_second must be between 0.1 and 0.5');
    }

    // 验证采样步数
    if (config.sample_steps !== undefined) {
      const validSteps = this.modelVersion.isV3V4 ? [4, 8, 16, 32, 64, 128] : [4, 8, 16, 32];
      if (!validSteps.includes(config.sample_steps)) {
        throw new Error(`sample_steps must be one of: ${validSteps.join(', ')}`);
      }
    }

    // v3暂不支持ref_text_free模式
    if (this.modelVersion.isV3V4 && config.ref_text_free === true) {
      throw new Error('ref_text_free mode is not supported in v3/v4 models');
    }

    // if_sr仅在v3模型中可用
    if (config.if_sr === true && this.modelVersion.version !== 'v3') {
      throw new Error('if_sr (super resolution) is only available in v3 model');
    }

    // 验证多参考音频（v3v4不支持）
    if (config.inp_refs && config.inp_refs.length > 0 && this.modelVersion.isV3V4) {
      throw new Error('Multiple reference audios (inp_refs) are not supported in v3/v4 models');
    }
  }

  /**
   * 验证音频文件
   */
  private validateAudioFile(audioPath: string): void {
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    const stats = fs.statSync(audioPath);
    const supportedExtensions = ['.wav', '.mp3', '.flac', '.m4a'];
    const ext = path.extname(audioPath).toLowerCase();
    
    if (!supportedExtensions.includes(ext)) {
      throw new Error(`Unsupported audio format. Supported formats: ${supportedExtensions.join(', ')}`);
    }

    // 检查文件大小（参考音频建议3-10秒，这里简单检查文件大小）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (stats.size > maxSize) {
      console.warn('Warning: Audio file is large. Reference audio should be 3-10 seconds long.');
    }
  }

  /**
   * 发送请求到 Gradio 队列
   */
  private async sendToQueue(data: any[], fnIndex: number, triggerId: number): Promise<string> {
    const response = await fetch(`${this.baseUrl}/queue/join?__theme=light`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify({
        data,
        event_data: null,
        fn_index: fnIndex,
        trigger_id: triggerId,
        session_hash: this.sessionHash,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: GradioResponse = await response.json() as GradioResponse;
    return result.event_id;
  }

  /**
   * 通过 SSE 监听任务完成状态
   */
  private async waitForCompletion(eventId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`${this.baseUrl}/queue/data?session_hash=${this.sessionHash}`);
      
      const timeout = setTimeout(() => {
        eventSource.close();
        reject(new Error('Timeout waiting for completion'));
      }, 60000); // 60秒超时

      eventSource.onmessage = (event) => {
        try {
          const data: SSEMessage = JSON.parse(event.data);
          
          if (data.event_id === eventId) {
            if (data.msg === 'process_completed') {
              clearTimeout(timeout);
              eventSource.close();
              if (data.success && data.output) {
                resolve(data.output);
              } else {
                reject(new Error('Process completed but failed'));
              }
            } else if (data.msg === 'process_generating') {
              console.log('Generation in progress...');
            }
          } else if (data.msg === 'close_stream') {
            clearTimeout(timeout);
            eventSource.close();
          }
        } catch (error) {
          clearTimeout(timeout);
          eventSource.close();
          reject(new Error(`Failed to parse SSE data: ${error}`));
        }
      };

      eventSource.onerror = (error) => {
        clearTimeout(timeout);
        eventSource.close();
        reject(new Error(`SSE error: ${error}`));
      };
    });
  }

  /**
   * 将音频文件上传到 Gradio
   */
  private async prepareAudioFile(audioPath: string): Promise<any> {
    this.validateAudioFile(audioPath);
    
    // 使用现有的 sessionHash 作为 upload_id
    const uploadUrl = `${this.baseUrl}/upload?upload_id=${this.sessionHash}`;
        
    // 创建 FormData
    const formData = new FormData();
    const fileName = path.basename(audioPath);
    const fileBuffer = fs.readFileSync(audioPath);
    const fileBlob = new Blob([fileBuffer], { type: this.getMimeType(path.extname(fileName)) });
    formData.append('files', fileBlob, fileName);
    
    // 上传文件
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }
    
    const uploadedFiles = await response.json() as string[];
    
    if (!uploadedFiles || uploadedFiles.length === 0) {
      throw new Error('No file data returned from upload');
    }
    
    const uploadedFilePath = uploadedFiles[0];
    
    logger.info("音频文件上传成功", [uploadedFilePath]);
    
    // 构造返回对象，保持与原来格式一致
    return {
      path: uploadedFilePath.replace(/\\/g, '/'),
      url: `${this.baseUrl}/file=${uploadedFilePath.replace(/\\/g, '/')}`,
      orig_name: fileName,
      size: fs.statSync(audioPath).size,
      mime_type: this.getMimeType(path.extname(fileName)),
      meta: {
        _type: 'gradio.FileData'
      }
    };
  }

  /**
   * 准备多个参考音频文件
   */
  private async prepareMultipleAudioFiles(audioPaths: string[]): Promise<any[]> {
    if (this.modelVersion.isV3V4) {
      throw new Error('Multiple reference audios are not supported in v3/v4 models');
    }

    const audioFiles = [];
    for (const audioPath of audioPaths) {
      const audioFile = await this.prepareAudioFile(audioPath);
      audioFiles.push(audioFile);
    }
    return audioFiles;
  }

  /**
   * 获取文件MIME类型
   */
  private getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.flac': 'audio/flac',
      '.m4a': 'audio/mp4'
    };
    return mimeTypes[extension.toLowerCase()] || 'audio/wav';
  }

  /**
   * 设置 GPT 模型
   */
  async setGptModel(modelName: string): Promise<boolean> {
    try {
      if (!modelName.endsWith('.ckpt')) {
        throw new Error('GPT model name must end with .ckpt');
      }

      const eventId = await this.sendToQueue([modelName], 3, Date.now());
      await this.waitForCompletion(eventId);
      
      console.log(`Successfully loaded GPT model: ${modelName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to set GPT model: ${error}`);
      return false;
    }
  }

  /**
   * 设置 SoVITS 模型
   */
  async setSovitsModel(
    modelName: string, 
    promptLanguage: keyof typeof LANGUAGE_OPTIONS = '中文', 
    textLanguage: keyof typeof LANGUAGE_OPTIONS = '中文'
  ): Promise<boolean> {
    try {
      if (!modelName.endsWith('.pth')) {
        throw new Error('SoVITS model name must end with .pth');
      }

      if (!(promptLanguage in LANGUAGE_OPTIONS)) {
        throw new Error(`Invalid promptLanguage. Must be one of: ${Object.keys(LANGUAGE_OPTIONS).join(', ')}`);
      }

      if (!(textLanguage in LANGUAGE_OPTIONS)) {
        throw new Error(`Invalid textLanguage. Must be one of: ${Object.keys(LANGUAGE_OPTIONS).join(', ')}`);
      }

      const eventId = await this.sendToQueue([modelName, promptLanguage, textLanguage], 2, Date.now());
      await this.waitForCompletion(eventId);
      
      console.log(`Successfully loaded SoVITS model: ${modelName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to set SoVITS model: ${error}`);
      return false;
    }
  }

  /**
   * 生成语音
   */
  async generateVoice(
    refVoicePath: string,
    refVoiceText: string,
    targetText: string,
    config: VoiceGenerationConfig = {}
  ): Promise<string> {
    try {
      // 验证配置
      this.validateConfig(config);

      // 验证目标文本
      if (!targetText || targetText.trim().length === 0) {
        throw new Error('Target text cannot be empty');
      }

      // 准备主参考音频文件
      const audioFileData = await this.prepareAudioFile(refVoicePath);

      // 设置默认配置（根据原表单的默认值）
      const defaultConfig: VoiceGenerationConfig = {
        prompt_language: '日文',
        text_language: '日文',
        how_to_cut: '凑四句一切',
        top_k: 15,
        top_p: 1,
        temperature: 1,
        ref_text_free: false,
        speed: 1,
        if_freeze: false,
        inp_refs: null,
        sample_steps: this.modelVersion.isV3V4 ? (this.modelVersion.version === 'v3' ? 32 : 8) : 8,
        if_sr: false,
        pause_second: 0.3,
        ...config
      };

      // 准备多参考音频文件（如果有）
      let inpRefsData = null;
      if (defaultConfig.inp_refs && defaultConfig.inp_refs.length > 0) {
        if (this.modelVersion.isV3V4) {
          console.warn('Multiple reference audios will be ignored in v3/v4 models');
          inpRefsData = null;
        } else {
          inpRefsData = await this.prepareMultipleAudioFiles(defaultConfig.inp_refs);
        }
      }

      // 构建请求数据数组（按照原函数参数顺序）
      const requestData = [
        audioFileData,                                    // inp_ref
        refVoiceText,                                     // prompt_text
        defaultConfig.prompt_language,                    // prompt_language
        targetText,                                       // text
        defaultConfig.text_language,                      // text_language
        defaultConfig.how_to_cut,                         // how_to_cut
        defaultConfig.top_k,                              // top_k
        defaultConfig.top_p,                              // top_p
        defaultConfig.temperature,                        // temperature
        defaultConfig.ref_text_free,                      // ref_text_free
        defaultConfig.speed,                              // speed
        defaultConfig.if_freeze,                          // if_freeze
        inpRefsData,                                      // inp_refs
        defaultConfig.sample_steps,                       // sample_steps
        defaultConfig.if_sr,                              // if_sr_Checkbox
        defaultConfig.pause_second                        // pause_second_slider
      ];

      console.log('Starting voice generation...');
      console.log('Config:', defaultConfig);
      
      const eventId = await this.sendToQueue(requestData, 1, Date.now());
      const result = await this.waitForCompletion(eventId);

      if (result.data && result.data.length > 0) {
        const outputAudio = result.data[0];
        console.log(`Voice generation completed: ${outputAudio.path}`);
        return outputAudio.path;
      } else {
        throw new Error('No audio data returned from generation');
      }
    } catch (error) {
      logger.error(`Voice generation failed: ${error}`);
      throw error;
    }
  }

  /**
   * 获取可用的语言选项
   */
  static getLanguageOptions(): string[] {
    return Object.keys(LANGUAGE_OPTIONS);
  }

  /**
   * 获取可用的文本切分选项
   */
  static getTextCutOptions(): string[] {
    return Object.keys(TEXT_CUT_OPTIONS);
  }

  /**
   * 获取模型版本允许的采样步数
   */
  getSampleStepsOptions(): number[] {
    return this.modelVersion.isV3V4 ? [4, 8, 16, 32, 64, 128] : [4, 8, 16, 32];
  }

  /**
   * 获取音频文件的下载URL
   */
  getAudioDownloadUrl(audioPath: string): string {
    return `${this.baseUrl}/file=${audioPath.replace(/\\/g, '/')}`;
  }

  /**
   * 下载生成的音频文件
   */
  async downloadAudio(audioPath: string, outputPath: string): Promise<void> {
    const url = this.getAudioDownloadUrl(audioPath);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(outputPath, buffer);
    console.log(`Audio saved to: ${outputPath}`);
  }
}

// 导出函数形式的 API
let apiInstance: GPTSoVITSAPI | null = null;

function getAPIInstance(modelVersion: string = 'v2'): GPTSoVITSAPI {
  if (!apiInstance) {
    apiInstance = new GPTSoVITSAPI('http://localhost:9872', modelVersion);
  }
  return apiInstance;
}

/**
 * 设置 GPT 模型
 */
export async function set_gpt_model(modelName: string): Promise<boolean> {
  return await getAPIInstance().setGptModel(modelName);
}

/**
 * 设置 SoVITS 模型
 */
export async function set_sovits_model(
  modelName: string, 
  promptLanguage: keyof typeof LANGUAGE_OPTIONS = '日文',
  textLanguage: keyof typeof LANGUAGE_OPTIONS = '日文'
): Promise<boolean> {
  return await getAPIInstance().setSovitsModel(modelName, promptLanguage, textLanguage);
}

/**
 * 生成语音
 */
export async function generate_voice(
  refVoicePath: string,
  refVoiceText: string,
  targetText: string,
  config: VoiceGenerationConfig = {}
): Promise<string> {
  return await getAPIInstance().generateVoice(refVoicePath, refVoiceText, targetText, config);
}

// 导出类型和常量
export { 
  GPTSoVITSAPI, 
  VoiceGenerationConfig, 
  LANGUAGE_OPTIONS, 
  TEXT_CUT_OPTIONS 
};