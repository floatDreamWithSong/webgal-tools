import { AssetType, ScanResult } from './asset-types.js';
import { scanCharacterAssets, scanStandardAssets, getAssetDirectories } from './asset-scanner.js';
import { getLive2DExpression, getLive2DMotions } from './live2d-utils.js';

// 资产工具的Schema定义
export const assetsToolsSchema = [
  {
    name: "scan_work_dir_assets",
    description: "可以扫描工作目录下的资产结构/路径，包括Live2D资产，图片，音频等。角色资产会进行浅层扫描。live2d的路径组成一般是 (前缀目录)/角色/角色服装/json模型",
    inputSchema: {
      type: "object",
      properties: {
        include_assets: {
          type: "array",
          description: "要扫描的资产类型，例如: ['background', 'figure', 'vocal', 'bgm']",
          items: {
            type: "string",
            enum: ["background", "figure", "vocal", "bgm", "animation", "video"]
          }
        }
      },
      required: ["include_assets"]
    }
  },
  {
    name: "get_live2d_expression",
    description: "获取指定Live2D模型目录下的所有表情文件，在调用此工具之前你应该清晰地知晓现有的live2d角色路径。工具会在该目录下搜索所有.exp.json表情文件",
    inputSchema: {
      type: "object",
      properties: {
        model_dir: {
          type: "string",
          description: "Live2D角色所在的目录，**不是服装目录**（例如：mygo/sakiko/casual是错误的，因为带有casual服饰），并且是相对于figure目录的相对路径！"
        }
      },
      required: ["model_dir"]
    }
  },
  {
    name: "get_live2d_motions",
    description: "获取指定Live2D模型目录下的所有动作文件，在调用此工具之前你应该清晰地知晓现有的live2d角色路径。工具会在该目录下搜索所有.mtn动作文件",
    inputSchema: {
      type: "object",
      properties: {
        model_dir: {
          type: "string",
          description: "Live2D角色所在的目录，**不是服装目录**（例如：mygo/sakiko/casual是错误的，因为带有casual服饰），并且是相对于figure目录的相对路径！"
        }
      },
      required: ["model_dir"]
    }
  }
];

// 导出Live2D表情获取函数
export { getLive2DExpression, getLive2DMotions };

// 生成扫描报告
function generateScanReport(scanResult: ScanResult): string {
  const { assetPaths, scanDetails } = scanResult;
  let report = `# 扫描到的资产文件\n\n`;

  for (const [assetType, paths] of Object.entries(assetPaths)) {
    const envKey = `WEBGAL_${assetType.toUpperCase()}_DIR`;
    const details = scanDetails[assetType];

    report += `## ${assetType} 资产\n`;
    report += `**扫描方法**: ${details.method}\n`;
    report += `**配置的目录**: ${details.sourceDirs.join(', ')}\n`;
    report += `**环境变量**: ${envKey}\n`;
    report += `**描述**: ${details.description}\n`;

    if (details.depthResults) {
      report += `**深度扫描结果**:\n`;
      details.depthResults.forEach((result: any) => {
        report += `  - ${result.dir}: 深度${result.depth}层找到${result.found}个资产\n`;
      });
    }

    if (details.extensions) {
      report += `**支持的扩展名**: ${details.extensions.join(', ')}\n`;
    }

    if (details.maxDepth) {
      report += `**最大扫描深度**: ${details.maxDepth}层\n`;
    }
    // 移除assetType前缀
    const processedPaths = paths.map(path => {
      // 移除开头的资产类型目录名（如 'background/', 'figure/' 等）
      const assetTypePrefix = `${assetType}/`;
      return path.startsWith(assetTypePrefix) ? path.slice(assetTypePrefix.length) : path;
    });
    report += `**找到的资产**: ${processedPaths.length} 个\n\n`;

    if (processedPaths.length > 0) {
      if (assetType === 'figure') {
        // 分类显示Live2D文件和角色目录
        const live2dFiles = processedPaths.filter(p => p.endsWith('.json'));
        const characterDirs = processedPaths.filter(p => p.endsWith('/'));

        if (live2dFiles.length > 0) {
          report += `**Live2D模型文件** (${live2dFiles.length}个):\n`;
          live2dFiles.forEach(file => report += `- ${file}\n`);
          if (characterDirs.length > 0) report += `\n`;
        }

        if (characterDirs.length > 0) {
          report += `**角色图片目录** (${characterDirs.length}个):\n`;
          characterDirs.forEach(dir => report += `- ${dir}\n`);
        }
      } else {
        report += `**${assetType}文件列表**:\n`;
        processedPaths.forEach(file => report += `- ${file}\n`);
      }
      report += "**警告**：Webgal资源在使用时不能携带资源前缀，例如background资产被使用时: background/asdad/bg.png 是错误的语法，而asdad/bg.png则是正确的。对于其它资产同理"
    }else{
      report+="搜索结果为空？是否正确按要求传入了有效的参数？"
    }
    report += `\n`;
  }

  return report;
}

// 扫描工作目录资产
export async function scanWorkDirAssets(args: any) {
  try {
    const includeAssets = args?.include_assets as string[];
    if (!includeAssets || !Array.isArray(includeAssets)) {
      return {
        content: [
          {
            type: "text",
            text: "错误：请提供要扫描的资产类型数组"
          }
        ],
        isError: true
      };
    }

    // 验证资产类型
    const validAssetTypes: AssetType[] = ["background", "figure", "vocal", "bgm", "animation", "video"];
    for (const assetType of includeAssets) {
      if (!validAssetTypes.includes(assetType as AssetType)) {
        return {
          content: [
            {
              type: "text",
              text: `错误：不支持的资产类型: ${assetType}`
            }
          ],
          isError: true
        };
      }
    }

    const scanResult: ScanResult = {
      assetPaths: {},
      scanDetails: {}
    };

    // 并行扫描所有资产类型
    const scanPromises = includeAssets.map(async (assetType: string) => {
      const typedAssetType = assetType as AssetType;
      if (typedAssetType === 'figure') {
        // 角色资产特殊处理
        const result = await scanCharacterAssets(typedAssetType);
        scanResult.assetPaths[typedAssetType] = result.assets;
        scanResult.scanDetails[typedAssetType] = result.details;
      } else {
        // 其他资产类型正常扫描
        const result = await scanStandardAssets(typedAssetType);
        scanResult.assetPaths[typedAssetType] = result.assets;
        scanResult.scanDetails[typedAssetType] = result.details;
      }
    });

    await Promise.all(scanPromises);

    const report = generateScanReport(scanResult);

    return {
      content: [
        {
          type: "text",
          text: report
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `错误：扫描资产文件失败 - ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}
