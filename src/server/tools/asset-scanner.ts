import fs from 'fs/promises';
import path from 'path';
import { workDir } from '../../config.js';
import { AssetType, SUPPORTED_EXTENSIONS, ScanDetails } from './asset-types.js';

// 获取环境变量配置的目录列表
export function getAssetDirectories(assetType: string): string[] {
  const envKey = `WEBGAL_${assetType.toUpperCase()}_DIR`;
  const envValue = process.env[envKey];

  if (envValue) {
    // 支持分号分隔的多个目录
    return envValue.split(' ')
      .map(dir => dir.trim())
      .filter(dir => dir.length > 0)
  }

  // 默认目录
  return [assetType];
}

// 扫描单个目录中的文件
export async function scanDirectory(dirPath: string, extensions: string[], shallow: boolean = false): Promise<string[]> {
  const files: string[] = [];

  try {
    await fs.access(dirPath);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          const relativePath = path.relative(workDir, fullPath);
          files.push(relativePath.replace(/\\/g, '/'));
        }
      } else if (entry.isDirectory() && !shallow) {
        // 递归扫描子目录（仅在非浅层扫描时）
        const subFiles = await scanDirectory(fullPath, extensions, false);
        files.push(...subFiles);
      }
    }
  } catch (error) {
    // 目录不存在或无法访问，跳过
  }

  return files;
}

// 检查目录中是否包含图片资产
export async function hasImageAssets(dirPath: string): Promise<boolean> {
  try {
    const files = await fs.readdir(dirPath);
    return files.some(file =>
      ['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(file).toLowerCase())
    );
  } catch (error) {
    return false;
  }
}

// 在指定深度扫描角色资产
export async function scanCharacterAssetsAtDepth(dirPath: string, targetDepth: number): Promise<string[]> {
  const characters: string[] = [];

  async function scanAtDepth(currentPath: string, currentDepth: number): Promise<void> {
    try {
      await fs.access(currentPath);
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(currentPath, entry.name);

          if (currentDepth === targetDepth) {
            // 达到目标深度，检查是否有资产文件
            const hasImages = await hasImageAssets(fullPath);
            const hasLive2D = await hasLive2DAssets(fullPath);

            if (hasImages || hasLive2D) {
              // 如果是Live2D资产，列出具体的json文件
              if (hasLive2D) {
                const jsonFiles = await getLive2DJsonFiles(fullPath);
                for (const jsonFile of jsonFiles) {
                  const relativePath = path.relative(workDir, jsonFile);
                  characters.push(relativePath.replace(/\\/g, '/'));
                }
              } else {
                // 如果只是图片资产，返回目录
                const relativePath = path.relative(workDir, fullPath);
                characters.push(relativePath.replace(/\\/g, '/') + '/');
              }
            }
          } else if (currentDepth < targetDepth) {
            // 还未达到目标深度，继续向下扫描
            await scanAtDepth(fullPath, currentDepth + 1);
          }
        }
      }
    } catch (error) {
      // 目录不存在或无法访问，跳过
    }
  }

  await scanAtDepth(dirPath, 1);
  return characters;
}

// 扫描角色资产的主函数
export async function scanCharacterAssets(assetType: AssetType): Promise<{assets: string[], details: ScanDetails}> {
  const figureDirs = getAssetDirectories('figure');
  const scanResults: string[] = [];
  const depthDetails: any[] = [];

  for (const figureDir of figureDirs) {
    const fullDir = path.join(workDir, figureDir);
    // 逐级扩大深度扫描
    for (let depth = 1; depth <= 4; depth++) {
      const charactersAtDepth = await scanCharacterAssetsAtDepth(fullDir, depth);
      if (charactersAtDepth.length > 0) {
        scanResults.push(...charactersAtDepth);
        depthDetails.push({
          dir: figureDir,
          depth: depth,
          found: charactersAtDepth.length
        });
        break; // 找到资产后不再增加深度
      }
    }
  }

  const details: ScanDetails = {
    method: '逐级扩大深度扫描',
    maxDepth: 3,
    sourceDirs: figureDirs,
    depthResults: depthDetails,
    description: '扫描角色目录（包含图片或Live2D资产）'
  };

  return {
    assets: [...new Set(scanResults)].sort(),
    details
  };
}

// 扫描标准资产的主函数
export async function scanStandardAssets(assetType: AssetType): Promise<{assets: string[], details: ScanDetails}> {
  const assetDirs = getAssetDirectories(assetType);
  const extensions = SUPPORTED_EXTENSIONS[assetType] || [];
  const allFiles: string[] = [];

  for (const assetDir of assetDirs) {
    const fullDir = path.join(workDir, assetDir);
    const files = await scanDirectory(fullDir, extensions);
    allFiles.push(...files);
  }

  const details: ScanDetails = {
    method: '标准文件扫描',
    sourceDirs: assetDirs,
    extensions: extensions,
    description: '扫描指定扩展名的文件'
  };

  return {
    assets: [...new Set(allFiles)].sort(),
    details
  };
}

// 需要从live2d-utils.ts导入的函数声明
import { hasLive2DAssets, getLive2DJsonFiles } from './live2d-utils.js';