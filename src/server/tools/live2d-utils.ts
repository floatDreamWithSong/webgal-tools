import fs from 'fs/promises';
import path from 'path';
import { workDir } from '../../config.js';

// 检查目录中是否包含Live2D资产（.json文件，非.exp.json）
export async function hasLive2DAssets(dirPath: string): Promise<boolean> {
  try {
    const files = await fs.readdir(dirPath);
    return files.some(file =>
      file.endsWith('.json') && !file.endsWith('.exp.json')
    );
  } catch (error) {
    return false;
  }
}

// 获取目录中的Live2D JSON文件列表
export async function getLive2DJsonFiles(dirPath: string): Promise<string[]> {
  const jsonFiles: string[] = [];

  try {
    const files = await fs.readdir(dirPath);
    for (const file of files) {
      if (file.endsWith('.json') && !file.endsWith('.exp.json')) {
        jsonFiles.push(path.join(dirPath, file));
      }
    }
  } catch (error) {
    // 目录不存在或无法访问，跳过
  }

  return jsonFiles;
}

// 递归扫描表情文件
export async function scanExpressionsRecursive(dirPath: string, expressions: Set<string>): Promise<void> {
  try {
    await fs.access(dirPath);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile() && entry.name.endsWith('.exp.json')) {
        // 找到表情文件，提取parentdir和basename
        const parentDir = path.basename(path.dirname(fullPath));
        const basename = path.basename(entry.name, '.exp.json');
        const expressionName = `${parentDir}_${basename}`;
        expressions.add(expressionName);
      } else if (entry.isDirectory()) {
        // 递归扫描子目录
        await scanExpressionsRecursive(fullPath, expressions);
      }
    }
  } catch (error) {
    // 目录不存在或无法访问，跳过
  }
}

// 获取指定Live2D模型目录下的表情文件
export async function getLive2DExpression(args: any) {
  try {
    const modelDir = args?.model_dir as string;
    if (!modelDir) {
      return {
        content: [
          {
            type: "text",
            text: "错误：请提供Live2D模型目录路径"
          }
        ],
        isError: true
      };
    }

    const fullModelDir = path.join(workDir,"figure", modelDir);
    const expressions = new Set<string>();

    // 在指定目录下递归搜索表情文件
    await scanExpressionsRecursive(fullModelDir, expressions);

    const expressionList = Array.from(expressions).sort();

    let report = `# Live2D模型表情文件\n\n`;
    report += `**模型目录**: ${modelDir}\n`;
    report += `**找到的表情**: ${expressionList.length} 个\n\n`;

    if (expressionList.length > 0) {
      report += `**表情列表**:\n`;
      expressionList.forEach(expr => report += `- ${expr}\n`);
    } else {
      report += `**提示**: 在指定目录下未找到任何.exp.json表情文件\n`;
    }

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
          text: `错误：获取Live2D表情文件失败 - ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

// 递归扫描动作文件
export async function scanMotionsRecursive(dirPath: string, motions: Set<string>): Promise<void> {
  try {
    await fs.access(dirPath);
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile() && entry.name.endsWith('.mtn')) {
        // 找到动作文件，提取parentdir和basename
        const parentDir = path.basename(path.dirname(fullPath));
        const basename = path.basename(entry.name, '.mtn');
        const motionName = `${parentDir}_${basename}`;
        motions.add(motionName);
      } else if (entry.isDirectory()) {
        // 递归扫描子目录
        await scanMotionsRecursive(fullPath, motions);
      }
    }
  } catch (error) {
    // 目录不存在或无法访问，跳过
  }
}

// 获取指定Live2D模型目录下的动作文件
export async function getLive2DMotions(args: any) {
  try {
    const modelDir = args?.model_dir as string;
    if (!modelDir) {
      return {
        content: [
          {
            type: "text",
            text: "错误：请提供Live2D模型目录路径"
          }
        ],
        isError: true
      };
    }

    const fullModelDir = path.join(workDir,"figure", modelDir);
    const motions = new Set<string>();

    // 在指定目录下递归搜索动作文件
    await scanMotionsRecursive(fullModelDir, motions);

    const motionList = Array.from(motions).sort();

    let report = `# Live2D模型动作文件\n\n`;
    report += `**模型目录**: ${modelDir}\n`;
    report += `**找到的动作**: ${motionList.length} 个\n\n`;

    if (motionList.length > 0) {
      report += `**动作列表**:\n`;
      motionList.forEach(motion => report += `- ${motion}\n`);
            report += "**警告**：Webgal资源在使用时不能携带资源前缀，例如background资产被使用时: background/asdad/bg.png 是错误的语法，而asdad/bg.png则是正确的。对于其它资产同理"
    } else {
      report += `**提示**: 在指定目录下未找到任何.mtn动作文件\n`;
    }

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
          text: `错误：获取Live2D动作文件失败 - ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}