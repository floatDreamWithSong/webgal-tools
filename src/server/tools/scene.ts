import fs from 'fs/promises';
import path from 'path';
import { workDir } from '../../config.js';

// 场景工具的Schema定义
export const sceneToolsSchema = [
  {
    name: "scan_scene_script",
    description: "可以扫描scene文件夹下的webgal脚本（txt格式），其中start.txt是作为webgal编译器的必要存在的入口文件",
    inputSchema: {
      type: "object", 
      properties: {},
      required: []
    }
  },
  {
    name: "edit_scene_script",
    description: "可以修改scene文件夹下的webgal脚本（txt格式），其中start.txt是作为webgal编译器的必要存在的入口文件",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "脚本的相对路径，例如: ./start.txt"
        },
        actions: {
          type: "array",
          description: "你对原文件进行的全部修改操作",
          items: {
            type: "object",
            description: `你对原文件进行的一个修改操作，支持以下三种操作类型：
1. 替换操作：指定start和end行号，将这个范围内的内容替换为新文本
2. 插入操作：只指定start行号（end为-1或不指定），在指定行之前插入新文本
3. 删除操作：指定start和end行号，text为空字符串，删除指定范围的行`,
            properties: {
              start: {
                type: "number",
                description: "需要修改的原文内容的起始行号（1-based），对于插入操作，内容会在此行之前插入"
              },
              end: {
                type: "number",
                description: "需要修改的原文内容的截止行号（1-based），如果是插入操作可以设为-1或不指定"
              },
              text: {
                type: "string",
                description: "需要插入或者替换的内容，如果为空字符串且指定了start和end，则为删除操作"
              }
            },
            required: ["start", "text"]
          }
        }
      },
      required: ["path"]
    }
  },
  {
    name: "create_scene_script",
    description: "可以创建scene文件夹下的webgal脚本（txt格式），其中start.txt一般是已经存在了的，无需再次创建",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "脚本的相对路径，例如: ./scene-02.txt"
        },
        content: {
          type: "string",
          description: "脚本内容"
        }
      },
      required: ["path", "content"]
    }
  }
];

// 扫描场景脚本
export async function scanSceneScript() {
  try {
    const sceneDir = path.join(workDir, 'scene');
    const scriptFiles: string[] = [];

    try {
      await fs.access(sceneDir);
      const files = await fs.readdir(sceneDir);
      
      for (const file of files) {
        if (file.endsWith('.txt')) {
          const filePath = path.join(sceneDir, file);
          const stat = await fs.lstat(filePath);
          
          if (stat.isFile()) {
            scriptFiles.push(file);
          }
        }
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `错误：scene目录不存在或无法访问 - ${sceneDir}`
          }
        ],
        isError: true
      };
    }

    // 对文件列表排序，确保start.txt在最前面
    scriptFiles.sort((a, b) => {
      if (a === 'start.txt') return -1;
      if (b === 'start.txt') return 1;
      return a.localeCompare(b);
    });

    return {
      content: [
        {
          type: "text",
          text: `# Scene脚本文件列表\n\n找到 ${scriptFiles.length} 个脚本文件:\n\n${scriptFiles.map(file => `- ${file}`).join('\n')}`
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `错误：扫描scene脚本失败 - ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

// 创建场景脚本
export async function createSceneScript(args: any) {
  try {
    const scriptPath = args?.path as string;
    const content = args?.content as string;
    
    if (!scriptPath || !content) {
      return {
        content: [
          {
            type: "text",
            text: "错误：请提供脚本路径和内容参数"
          }
        ],
        isError: true
      };
    }

    const sceneDir = path.join(workDir, 'scene');
    const fullPath = path.join(sceneDir, scriptPath.replace(/^\.\//, ''));
    
    // 安全检查：确保路径在scene目录内
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(sceneDir)) {
      return {
        content: [
          {
            type: "text",
            text: "错误：路径不在允许的scene目录范围内"
          }
        ],
        isError: true
      };
    }

    // 确保scene目录存在
    await fs.mkdir(sceneDir, { recursive: true });
    
    // 检查文件是否已存在
    try {
      await fs.access(normalizedPath);
      return {
        content: [
          {
            type: "text",
            text: `错误：文件 ${scriptPath} 已存在，请使用edit_scene_script来修改现有文件`
          }
        ],
        isError: true
      };
    } catch {
      // 文件不存在，可以创建
    }

    await fs.writeFile(normalizedPath, content, 'utf-8');
    
    return {
      content: [
        {
          type: "text",
          text: `成功创建脚本文件: ${scriptPath}`
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `错误：创建脚本文件失败 - ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

// 编辑场景脚本
export async function editSceneScript(args: any) {
  try {
    const scriptPath = args?.path as string;
    const actions = args?.actions as Array<{start: number, end?: number, text: string}>;
    
    if (!scriptPath) {
      return {
        content: [
          {
            type: "text",
            text: "错误：请提供脚本路径参数"
          }
        ],
        isError: true
      };
    }

    const sceneDir = path.join(workDir, 'scene');
    const fullPath = path.join(sceneDir, scriptPath.replace(/^\.\//, ''));
    
    // 安全检查：确保路径在scene目录内
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(sceneDir)) {
      return {
        content: [
          {
            type: "text",
            text: "错误：路径不在允许的scene目录范围内"
          }
        ],
        isError: true
      };
    }

    // 读取原文件内容
    let originalContent: string;
    try {
      originalContent = await fs.readFile(normalizedPath, 'utf-8');
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `错误：无法读取文件 ${scriptPath} - 文件可能不存在`
          }
        ],
        isError: true
      };
    }

    let lines = originalContent.split('\n');
    
    // 如果没有提供actions，返回当前文件内容
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `# 当前文件内容: ${scriptPath}\n\n\`\`\`\n${originalContent}\n\`\`\``
          }
        ]
      };
    }

    // 按start行号倒序排序，这样可以从后往前修改，避免行号变化的问题
    const sortedActions = [...actions].sort((a, b) => b.start - a.start);

    for (const action of sortedActions) {
      const { start, end, text } = action;
      
      // 验证行号（转换为0-based）
      const startIdx = start - 1;
      const endIdx = end ? end - 1 : startIdx;
      
      if (startIdx < 0) {
        return {
          content: [
            {
              type: "text",
              text: `错误：起始行号 ${start} 无效，行号应该从1开始`
            }
          ],
          isError: true
        };
      }

      if (end && end !== -1) {
        // 替换或删除操作
        if (endIdx < startIdx) {
          return {
            content: [
              {
                type: "text",
                text: `错误：结束行号 ${end} 不能小于起始行号 ${start}`
              }
            ],
            isError: true
          };
        }
        
        if (endIdx >= lines.length) {
          return {
            content: [
              {
                type: "text",
                text: `错误：结束行号 ${end} 超出文件范围（文件共 ${lines.length} 行）`
              }
            ],
            isError: true
          };
        }

        // 替换指定范围的行
        const newLines = text?.split('\n') || [];
        lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
      } else {
        // 插入操作
        if (startIdx > lines.length) {
          return {
            content: [
              {
                type: "text",
                text: `错误：插入位置 ${start} 超出文件范围（文件共 ${lines.length} 行）`
              }
            ],
            isError: true
          };
        }
        
        // 在指定行之前插入新内容
        const newLines = text.split('\n');
        lines.splice(startIdx, 0, ...newLines);
      }
    }

    const newContent = lines.join('\n');
    await fs.writeFile(normalizedPath, newContent, 'utf-8');
    
    return {
      content: [
        {
          type: "text",
          text: `成功修改脚本文件: ${scriptPath}\n\n执行了 ${actions.length} 个修改操作`
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `错误：修改脚本文件失败 - ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}
