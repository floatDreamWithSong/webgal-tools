import fs from 'fs/promises';
import path from 'path';
import { getEnvConfig } from '@webgal-mcp/config';
import { AssetType, SUPPORTED_EXTENSIONS, ScanDetails } from './asset-types.js';

// 获取环境变量配置的目录列表
export function getAssetDirectories(assetType: string): string[] {
  const envKey = `WEBGAL_${assetType.toUpperCase()}_DIR`;
  const envValue = process.env[envKey];

  if (envValue) {
    // 支持空格分隔的多个目录
    return envValue.split(' ')
      .map(dir => dir.trim())
      .filter(dir => dir.length > 0);
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
          const workDir = getEnvConfig().WEBGAL_WORK_DIR!;
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

// 扫描标准资产的主函数
export async function scanStandardAssets(assetType: AssetType): Promise<{assets: string[], details: ScanDetails}> {
  const assetDirs = getAssetDirectories(assetType);
  const extensions = SUPPORTED_EXTENSIONS[assetType] || [];
  const allFiles: string[] = [];

  const workDir = getEnvConfig().WEBGAL_WORK_DIR!;
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