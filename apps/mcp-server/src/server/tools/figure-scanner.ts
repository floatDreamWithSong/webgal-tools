import fs from 'fs/promises';
import path from 'path';
import { getMcpConfig } from '@webgal-mcp/config';
import { Live2DCharacterInfo } from './asset-types.js';
import { getWorkDir } from '../index.js';

// 获取figure目录
function getFigureDirectories(): string[] {
  try {
    const mcpConfig = getMcpConfig();
    const configValue = mcpConfig.directories.figure;
    
    if (configValue) {
      return configValue.split(' ')
        .map(dir => dir.trim())
        .filter(dir => dir.length > 0);
    }
  } catch (error) {
    console.error('获取figure目录配置失败，使用默认值:', error);
  }
  
  return ['figure'];
}

// 扫描静态图片人物
export async function scanStaticFigures(): Promise<string[]> {
  const workDir = getWorkDir(); // 使用全局工作目录
  const figureDirs = getFigureDirectories();
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
  const staticFigures: string[] = [];

  for (const figureDir of figureDirs) {
    const fullDir = path.join(workDir, figureDir);
    await scanDirectoryForImages(fullDir, imageExtensions, staticFigures, figureDir, workDir);
  }

  return [...new Set(staticFigures)].sort();
}

// 递归扫描目录中的图片文件
async function scanDirectoryForImages(
  dirPath: string, 
  extensions: string[], 
  results: string[], 
  baseDir: string,
  workDir: string
): Promise<void> {
  try {
    await fs.access(dirPath);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          const relativePath = path.relative(path.join(workDir, baseDir), fullPath);
          results.push(relativePath.replace(/\\/g, '/'));
        }
      } else if (entry.isDirectory()) {
        await scanDirectoryForImages(fullPath, extensions, results, baseDir, workDir);
      }
    }
  } catch (error) {
    // 目录不存在或无法访问，跳过
  }
}

// 扫描Live2D人物（只返回model.json路径）
export async function scanLive2DFigures(): Promise<string[]> {
  const workDir = getWorkDir(); // 使用全局工作目录
  const figureDirs = getFigureDirectories();
  const live2dModels: string[] = [];

  for (const figureDir of figureDirs) {
    const fullDir = path.join(workDir, figureDir);
    await scanDirectoryForLive2DModels(fullDir, live2dModels, figureDir, workDir);
  }

  return live2dModels.sort();
}

// 递归扫描目录中的Live2D模型文件
async function scanDirectoryForLive2DModels(
  dirPath: string, 
  results: string[], 
  baseDir: string,
  workDir: string
): Promise<void> {
  try {
    await fs.access(dirPath);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile() && entry.name.endsWith('model.json')) {
        const relativePath = path.relative(path.join(workDir, baseDir), fullPath);
        const modelPath = relativePath.replace(/\\/g, '/');
        results.push(modelPath);
      } else if (entry.isDirectory()) {
        await scanDirectoryForLive2DModels(fullPath, results, baseDir, workDir);
      }
    }
  } catch (error) {
    // 目录不存在或无法访问，跳过
  }
}

// 获取指定Live2D模型的详细信息
export async function getLive2DCharacterDetails(modelPaths: string[]): Promise<Live2DCharacterInfo[]> {
  const workDir = getWorkDir(); // 使用全局工作目录
  const figureDirs = getFigureDirectories();
  const characterDetails: Live2DCharacterInfo[] = [];

  for (const modelPath of modelPaths) {
    let found = false;
    let errorMessage = '';

    // 尝试在所有figure目录中找到该模型文件
    for (const figureDir of figureDirs) {
      const fullModelPath = path.join(workDir, figureDir, modelPath);
      
      try {
        // 先判断文件是否存在
        await fs.access(fullModelPath);
        
        // 文件存在，读取并解析JSON
        const fileContent = await fs.readFile(fullModelPath, 'utf-8');
        const modelData = JSON.parse(fileContent);
        
        // 提取motions字段的键名
        const motions: string[] = [];
        if (modelData.motions && typeof modelData.motions === 'object') {
          motions.push(...Object.keys(modelData.motions));
        }
        
        // 提取expressions字段中每个item的name属性
        const expressions: string[] = [];
        if (Array.isArray(modelData.expressions)) {
          for (const expr of modelData.expressions) {
            if (expr && typeof expr === 'object' && expr.name) {
              expressions.push(expr.name);
            }
          }
        }
        
        characterDetails.push({
          modelPath,
          motions: motions.sort(),
          expressions: expressions.sort()
        });
        
        found = true;
        break;
      } catch (error) {
        if (error instanceof Error) {
          if ((error as any).code === 'ENOENT') {
            // 文件不存在，继续尝试下一个目录
            errorMessage = `文件不存在: ${modelPath}`;
            continue;
          } else {
            // JSON解析错误或其他错误
            errorMessage = `解析文件失败: ${error.message}`;
            break;
          }
        } else {
          errorMessage = `未知错误: ${String(error)}`;
          break;
        }
      }
    }
    
    if (!found) {
      // 文件未找到或解析失败，返回错误信息
      characterDetails.push({
        modelPath: `错误: ${modelPath} - ${errorMessage}`,
        motions: [],
        expressions: []
      });
    }
  }

  return characterDetails;
} 