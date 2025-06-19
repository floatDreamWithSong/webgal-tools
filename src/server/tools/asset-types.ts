// 资产类型定义和常量

export type AssetType = "background" | "figure" | "vocal" | "bgm" | "animation" | "video";

// 支持的文件扩展名映射
export const SUPPORTED_EXTENSIONS: Record<AssetType, string[]> = {
  background: ['.png', '.jpg', '.jpeg', '.webp'],
  figure: ['.png', '.jpg', '.jpeg', '.webp', '.json'],
  vocal: ['.mp3', '.wav', '.ogg'],
  bgm: ['.mp3', '.wav', '.ogg'],
  animation: ['.png', '.jpg', '.jpeg', '.webp', '.json'],
  video: ['.mp4', '.webm', '.mov']
};

// 扫描详情接口
export interface ScanDetails {
  method: string;
  sourceDirs: string[];
  extensions?: string[];
  maxDepth?: number;
  description: string;
  depthResults?: Array<{
    dir: string;
    depth: number;
    found: number;
  }>;
}

// 扫描结果接口
export interface ScanResult {
  assetPaths: Record<string, string[]>;
  scanDetails: Record<string, ScanDetails>;
}