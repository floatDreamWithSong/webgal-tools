import { AssetType, ScanResult, Live2DCharacterInfo } from './asset-types.js';
import { scanStandardAssets } from './asset-scanner.js';
import { scanStaticFigures, scanLive2DFigures, getLive2DCharacterDetails } from './figure-scanner.js';

// 资产工具的Schema定义
export const assetsToolsSchema = [
  {
    name: "scan_work_dir_assets",
    description: "扫描工作目录下的资产结构/路径，包括背景图片、音频、动画、视频等资产（不包括人物figure）",
    inputSchema: {
      type: "object",
      properties: {
        include_assets: {
          type: "array",
          description: "要扫描的资产类型，例如: ['background', 'vocal', 'bgm', 'animation', 'video']",
          items: {
            type: "string",
            enum: ["background", "vocal", "bgm", "animation", "video"]
          }
        }
      },
      required: ["include_assets"]
    }
  },
  {
    name: "scan_static_figures",
    description: "(注意：除非用户明确要求了使用图片，否则你不应该使用图片扫描，而应该使用live2d扫描) 扫描figure目录下的所有静态图片人物文件（.png, .jpg, .jpeg, .webp格式）",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "scan_live2d_figures",
    description: "扫描figure目录下的所有Live2D人物，查找以'model.json'结尾的文件，返回model.json文件路径列表",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "get_live2d_character_details",
    description: "获取指定Live2D角色的详细信息，包括可用的motion(角色动作)和expression(角色表情)。需要传入model.json文件路径数组",
    inputSchema: {
      type: "object",
      properties: {
        model_paths: {
          type: "array",
          description: "Live2D模型文件路径数组，相对于figure目录的路径",
          items: {
            type: "string"
          }
        }
      },
      required: ["model_paths"]
    }
  }
];

// 生成标准资产扫描报告
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

    if (details.extensions) {
      report += `**支持的扩展名**: ${details.extensions.join(', ')}\n`;
    }

    // 移除assetType前缀
    const processedPaths = paths.map(path => {
      const assetTypePrefix = `${assetType}/`;
      return path.startsWith(assetTypePrefix) ? path.slice(assetTypePrefix.length) : path;
    });
    
    report += `**找到的资产**: ${processedPaths.length} 个\n\n`;

    if (processedPaths.length > 0) {
      report += `**${assetType}文件列表**:\n`;
      processedPaths.forEach(file => report += `- ${file}\n`);
      report += "\n**警告**：Webgal资源在使用时不能携带资源前缀，例如background资产被使用时: background/asdad/bg.png 是错误的语法，而asdad/bg.png则是正确的。对于其它资产同理\n";
    } else {
      report += "搜索结果为空？是否正确按要求传入了有效的参数？\n";
    }
    report += `\n`;
  }

  return report;
}

// 生成静态图片人物扫描报告
function generateStaticFiguresReport(figures: string[]): string {
  let report = `# 静态图片人物扫描结果\n\n`;
  report += `**扫描方法**: 递归扫描figure目录\n`;
  report += `**支持的格式**: .png, .jpg, .jpeg, .webp\n`;
  report += `**找到的静态图片人物**: ${figures.length} 个\n\n`;

  if (figures.length > 0) {
    report += `**静态图片人物列表**:\n`;
    figures.forEach(figure => report += `- ${figure}\n`);
    report += "\n**警告**：使用时路径不需要包含figure/前缀\n";
  } else {
    report += `**提示**: 在figure目录下未找到任何静态图片人物文件\n`;
  }

  return report;
}

// 生成Live2D人物扫描报告
function generateLive2DFiguresReport(models: string[]): string {
  let report = `# Live2D人物扫描结果\n\n`;
  report += `**扫描方法**: 查找以'model.json'结尾的Live2D模型文件\n`;
  report += `**找到的Live2D模型**: ${models.length} 个\n\n`;

  if (models.length > 0) {
    report += `**Live2D模型文件列表**:\n`;
    models.forEach(model => report += `- ${model}\n`);
    report += "\n**提示**: 使用 get_live2d_character_details 工具可以获取具体角色的动作和表情信息\n";
    report += "**警告**：使用时路径不需要包含figure/前缀\n";
  } else {
    report += `**提示**: 在figure目录下未找到任何Live2D模型文件（以'model.json'结尾）\n`;
  }

  return report;
}

// 生成Live2D角色详细信息报告
function generateLive2DCharacterDetailsReport(characters: Live2DCharacterInfo[]): string {
  let report = `# Live2D角色详细信息\n\n`;
  report += `**查询的角色数量**: ${characters.length} 个\n\n`;

  characters.forEach((character, index) => {
    report += `## ${index + 1}. ${character.modelPath}\n`;
    
    if (character.motions.length > 0) {
      report += `**可用动作** (${character.motions.length}个):\n`;
      character.motions.forEach(motion => report += `- ${motion}\n`);
    } else {
      report += `**可用动作**: 无\n`;
    }

    if (character.expressions.length > 0) {
      report += `**可用表情** (${character.expressions.length}个):\n`;
      character.expressions.forEach(expr => report += `- ${expr}\n`);
    } else {
      report += `**可用表情**: 无\n`;
    }
    
    report += `\n`;
  });

  if (characters.length > 0) {
    report += "**警告**：使用时路径不需要包含figure/前缀\n";
  }

  return report;
}

// 扫描工作目录资产（不包括figure）
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
    const validAssetTypes: AssetType[] = ["background", "vocal", "bgm", "animation", "video"];
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
      const result = await scanStandardAssets(typedAssetType);
      scanResult.assetPaths[typedAssetType] = result.assets;
      scanResult.scanDetails[typedAssetType] = result.details;
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

// 扫描静态图片人物
export async function scanStaticFiguresHandler(_args: any) {
  try {
    const figures = await scanStaticFigures();
    const report = generateStaticFiguresReport(figures);

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
          text: `错误：扫描静态图片人物失败 - ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

// 扫描Live2D人物
export async function scanLive2DFiguresHandler(_args: any) {
  try {
    const models = await scanLive2DFigures();
    const report = generateLive2DFiguresReport(models);

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
          text: `错误：扫描Live2D人物失败 - ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

// 获取Live2D角色详细信息
export async function getLive2DCharacterDetailsHandler(args: any) {
  try {
    const modelPaths = args?.model_paths as string[];
    if (!modelPaths || !Array.isArray(modelPaths)) {
      return {
        content: [
          {
            type: "text",
            text: "错误：请提供Live2D模型文件路径数组"
          }
        ],
        isError: true
      };
    }

    if (modelPaths.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "错误：模型路径数组不能为空"
          }
        ],
        isError: true
      };
    }

    const characters = await getLive2DCharacterDetails(modelPaths);
    const report = generateLive2DCharacterDetailsReport(characters);

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
          text: `错误：获取Live2D角色详细信息失败 - ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}
