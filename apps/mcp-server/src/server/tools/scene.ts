import fs from 'fs/promises';
import path from 'path';
import { getEnvConfig } from '@webgal-mcp/config';

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
    name: "read_scene_script",
    description: "读取webgal脚本的内容，根据相对路径返回对应的脚本文件内容",
    inputSchema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          description: "webgal脚本文件名，例如: start.txt"
        }
      },
      required: ["file"]
    }
  },
  {
    name: "write_scene_script",
    description: "可通过overwrite或者append的方式写入scene文件夹下的webgal脚本（txt格式），其中start.txt一般是已经存在了的，无需再次创建",
    inputSchema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          description: "创建的脚本名称，例如: scene-02.txt"
        },
        content: {
          type: "string",
          description: "脚本内容"
        },
        mode: {
          type: "string",
          description: "写入模式，可选值为: overwrite(覆盖写入) 或 append(追加写入)",
          enum: ["overwrite", "append"]
        }
      },
      required: ["file", "content", "mode"]
    }
  }
];

// 扫描场景脚本
export async function scanSceneScript() {
  try {
    const workDir = getEnvConfig().WEBGAL_WORK_DIR!;
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

// 读取场景脚本
export async function readSceneScript(args: any) {
  try {
    const fileName = args?.file as string;
    
    if (!fileName) {
      return {
        content: [
          {
            type: "text",
            text: "错误：请提供脚本文件名参数"
          }
        ],
        isError: true
      };
    }

    const workDir = getEnvConfig().WEBGAL_WORK_DIR!;
    const sceneDir = path.join(workDir, 'scene');
    const fullPath = path.join(sceneDir, fileName);
    
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

    try {
      const content = await fs.readFile(normalizedPath, 'utf-8');
      return {
        content: [
          {
            type: "text",
            text: `# ${fileName}\n\n\`\`\`\n${content}\n\`\`\``
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `错误：无法读取文件 ${fileName} - 文件可能不存在`
          }
        ],
        isError: true
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `错误：读取脚本文件失败 - ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

// 写入场景脚本
export async function writeSceneScript(args: any) {
  try {
    const fileName = args?.file as string;
    const content = args?.content as string;
    const mode = args?.mode as string;
    
    if (!fileName || !content || !mode) {
      return {
        content: [
          {
            type: "text",
            text: "错误：请提供脚本文件名、内容和写入模式参数"
          }
        ],
        isError: true
      };
    }

    if (mode !== 'overwrite' && mode !== 'append') {
      return {
        content: [
          {
            type: "text",
            text: "错误：写入模式必须为 'overwrite' 或 'append'"
          }
        ],
        isError: true
      };
    }

    const workDir = getEnvConfig().WEBGAL_WORK_DIR!;
    const sceneDir = path.join(workDir, 'scene');
    const fullPath = path.join(sceneDir, fileName);
    
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
    
    if (mode === 'overwrite') {
      // 覆盖写入
      await fs.writeFile(normalizedPath, content, 'utf-8');
      return {
        content: [
          {
            type: "text",
            text: `成功覆盖写入脚本文件: ${fileName}`
          }
        ]
      };
    } else if (mode === 'append') {
      // 追加写入
      await fs.appendFile(normalizedPath, content, 'utf-8');
      return {
        content: [
          {
            type: "text",
            text: `成功追加内容到脚本文件: ${fileName}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: "错误：不合法的写入模式参数"
          }
        ],
        isError: true
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `错误：写入脚本文件失败 - ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}