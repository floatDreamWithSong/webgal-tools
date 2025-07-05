import fs from 'fs';
import path from 'path';
import { ScannedModelFiles } from '@webgal-tools/config';
import { logger } from '@webgal-tools/logger';

/**
 * 模型文件扫描器
 * 用于扫描指定文件夹中的GPT权重文件、SoVITS模型文件和参考音频文件
 */
export class ModelScanner {
  // 支持的音频文件格式
  private static readonly AUDIO_EXTENSIONS = ['.wav', '.mp3', '.flac', '.ogg', '.m4a'];
  
  // GPT权重文件扩展名
  private static readonly GPT_EXTENSION = '.ckpt';
  
  // SoVITS模型文件扩展名
  private static readonly SOVITS_EXTENSION = '.pth';

  /**
   * 扫描指定文件夹中的模型文件
   * @param gptDir GPT权重文件夹路径
   * @param sovitsDir SoVITS模型文件夹路径
   * @param refAudioDir 参考音频文件夹路径
   * @returns 扫描到的模型文件信息
   */
  static scanModelFiles(
    g_s_base_dir: string,
    gptDir: string,
    sovitsDir: string,
    refAudioDir: string
  ): ScannedModelFiles {
    logger.info(`开始扫描模型文件`);
    logger.info(`GPT权重文件夹: ${gptDir}`);
    logger.info(`SoVITS模型文件夹: ${sovitsDir}`);
    logger.info(`参考音频文件夹: ${refAudioDir}`);

    const result: ScannedModelFiles = {
      gpt_files: [],
      sovits_files: [],
      ref_audio_files: []
    };

    // 扫描GPT权重文件
    if (fs.existsSync(gptDir)) {
      result.gpt_files = this.scanFilesInDirectory(gptDir, [this.GPT_EXTENSION], g_s_base_dir);
      logger.info(`扫描到 ${result.gpt_files.length} 个GPT权重文件`);
    } else {
      logger.warn(`GPT权重文件夹不存在: ${gptDir}`);
    }

    // 扫描SoVITS模型文件
    if (fs.existsSync(sovitsDir)) {
      result.sovits_files = this.scanFilesInDirectory(sovitsDir, [this.SOVITS_EXTENSION], g_s_base_dir);
      logger.info(`扫描到 ${result.sovits_files.length} 个SoVITS模型文件`);
    } else {
      logger.warn(`SoVITS模型文件夹不存在: ${sovitsDir}`);
    }

    // 扫描参考音频文件
    if (fs.existsSync(refAudioDir)) {
      result.ref_audio_files = this.scanFilesInDirectory(refAudioDir, this.AUDIO_EXTENSIONS);
      logger.info(`扫描到 ${result.ref_audio_files.length} 个参考音频文件`);
    } else {
      logger.warn(`参考音频文件夹不存在: ${refAudioDir}`);
    }

    return result;
  }

  /**
   * 扫描指定目录中的文件
   * @param directory 目录路径
   * @param extensions 支持的文件扩展名列表
   * @returns 文件路径列表
   */
  private static scanFilesInDirectory(directory: string, extensions: string[], baseDir?: string): string[] {
    const files: string[] = [];
    
    try {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          // 递归扫描子目录
          files.push(...this.scanFilesInDirectory(fullPath, extensions, baseDir));
        } else if (entry.isFile()) {
          // 检查文件扩展名
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            let relativePath: string;
            if (baseDir) {
              relativePath = path.relative(baseDir, fullPath);
            } else {
              relativePath = fullPath;
            }
            
            // 标准化路径分隔符（在Windows上统一使用正斜杠）
            relativePath = relativePath.replace(/\\/g, '/');
            files.push(relativePath);
          }
        }
      }
    } catch (error) {
      logger.error(`扫描目录失败 ${directory}:`, error);
    }
    
    return files;
  }

  /**
   * 从参考音频文件名中提取参考文本
   * @param audioPath 音频文件路径
   * @returns 参考文本
   */
  static extractRefTextFromAudioFileName(audioPath: string): string {
    const fileName = path.basename(audioPath, path.extname(audioPath));
    
    // 尝试从文件名中提取参考文本
    // 假设文件名格式为：prefix_text.wav 或 (prefix)text.wav
    const patterns = [
      /^\([^)]+\)(.+)$/, // (prefix)text
      /^[^_]+_(.+)$/, // prefix_text
      /^(.+)_[^_]+$/, // text_suffix
      /^(.+)$/ // 整个文件名
    ];

    for (const pattern of patterns) {
      const match = fileName.match(pattern);
      if (match && match[1] && match[1].trim()) {
        return match[1].trim();
      }
    }

    // 如果无法提取，返回文件名本身
    return fileName;
  }
} 