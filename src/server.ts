import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema, 
  CallToolRequest,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 使用 import.meta.url 来获取当前文件的URL
const __filename = fileURLToPath(import.meta.url);
// __dirname 是当前文件所在的目录 (e.g., /path/to/project/dist)
const __dirname = path.dirname(__filename);
// packageRoot 是项目的根目录 (e.g., /path/to/project)
// 因为编译后的文件在 dist 目录中，所以我们需要向上回退一级
const packageRoot = path.resolve(__dirname, '..');
const docsDir = path.join(packageRoot, 'docs');

export const getServer = () => server;

const server = new Server({
  name: "webgal-docs-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {},
    prompts: {},
    resources: {}
  }
});

// 工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_docs_directory",
        description: "获取文档目录说明，返回 README.md 的内容",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "get_doc_content",
        description: "获取具体文档内容，根据相对路径返回对应的 markdown 文件内容",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "文档的相对路径，例如: webgal-script/animation.md 或 getting-started.md"
            }
          },
          required: ["path"]
        }
      }
    ]
  };
});

// 工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_docs_directory":
      try {
        const readmePath = path.join(docsDir, 'README.md');
        const content = await fs.readFile(readmePath, 'utf-8');
        return {
          content: [
            {
              type: "text",
              text: `# WebGAL 文档目录\n\n${content}`
            }
          ]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `错误：无法读取文档目录 - ${errorMessage}`
            }
          ],
          isError: true
        };
      }

    case "get_doc_content":
      try {
        const docPath = args?.path as string;
        if (!docPath) {
          return {
            content: [
              {
                type: "text",
                text: "错误：请提供文档路径参数"
              }
            ],
            isError: true
          };
        }

        // 安全检查：确保路径在 docs 目录内
        const fullPath = path.join(docsDir, docPath);
        const normalizedPath = path.normalize(fullPath);
        
        if (!normalizedPath.startsWith(docsDir)) {
          return {
            content: [
              {
                type: "text",
                text: "错误：路径不在允许的文档目录范围内"
              }
            ],
            isError: true
          };
        }

        const content = await fs.readFile(normalizedPath, 'utf-8');
        return {
          content: [
            {
              type: "text",
              text: `# ${docPath}\n\n${content}`
            }
          ]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `错误：无法读取文档 ${args?.path} - ${errorMessage}`
            }
          ],
          isError: true
        };
      }

    default:
      return {
        content: [
          {
            type: "text",
            text: `错误：未知的工具名称 "${name}"`
          }
        ],
        isError: true
      };
  }
});

// Prompt 列表处理器
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "webgal_guide",
        description: "获取 WebGAL 开发指导提示词，帮助用户了解如何使用 WebGAL 创建视觉小说"
      },
      {
        name: "webgal_script_help",
        description: "获取 WebGAL 脚本语法帮助提示词，提供脚本编写的详细指导"
      },
      {
        name: "webgal_troubleshoot",
        description: "获取 WebGAL 问题排查提示词，帮助解决常见问题"
      }
    ]
  };
});

// Prompt 获取处理器
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "webgal_guide":
      return {
        description: "WebGAL 开发指导助手",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "你是一个 WebGAL 开发专家。WebGAL 是一个基于 Web 技术的视觉小说引擎。请根据用户的问题，提供准确、详细的 WebGAL 开发指导。你可以帮助用户：\n\n1. 了解 WebGAL 的基本概念和特性\n2. 学习 WebGAL 脚本语法\n3. 解决开发过程中的问题\n4. 优化游戏性能和用户体验\n5. 实现高级功能如 Live2D、Spine 动画等\n\n请始终保持友好、专业的态度，并提供具体可行的解决方案。"
            }
          }
        ]
      };

    case "webgal_script_help":
      return {
        description: "WebGAL 脚本语法助手",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "你是一个 WebGAL 脚本语法专家。请帮助用户学习和使用 WebGAL 脚本语法。你的专长包括：\n\n1. 基础语法：对话、旁白、场景切换\n2. 角色和背景管理\n3. 音频和视频播放\n4. 动画效果和特效\n5. 变量和逻辑控制\n6. 场景跳转和分支\n\n请提供清晰的语法示例，并解释每个功能的用法和参数。对于复杂的功能，请给出完整的使用示例。"
            }
          }
        ]
      };

    case "webgal_troubleshoot":
      return {
        description: "WebGAL 问题排查助手",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "你是一个 WebGAL 技术支持专家。请帮助用户诊断和解决 WebGAL 开发中遇到的问题。你的专长包括：\n\n1. 常见错误排查和解决\n2. 性能问题优化\n3. 兼容性问题处理\n4. 部署和发布相关问题\n5. 资源加载和管理问题\n6. Live2D 和 Spine 集成问题\n\n请仔细分析用户描述的问题，提供系统性的排查步骤和解决方案。如果需要更多信息，请主动询问相关细节。"
            }
          }
        ]
      };

    default:
      throw new Error(`未知的提示词: ${name}`);
  }
});

// Resource 列表处理器
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    const resources = [];
    
    // 递归获取所有文档文件
    async function getAllDocs(dir: string, basePath: string = ''): Promise<any[]> {
      const items = await fs.readdir(dir);
      const docs = [];
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        const relativePath = basePath ? `${basePath}/${item}` : item;
        
        if (stat.isDirectory()) {
          const subDocs = await getAllDocs(fullPath, relativePath);
          docs.push(...subDocs);
        } else if (item.endsWith('.md')) {
          docs.push({
            uri: `webgal://docs/${relativePath}`,
            name: relativePath,
            description: `WebGAL 文档: ${relativePath}`,
            mimeType: "text/markdown"
          });
        }
      }
      
      return docs;
    }
    
    const allDocs = await getAllDocs(docsDir);
    resources.push(...allDocs);
    
    return { resources };
  } catch (error) {
    console.error('获取资源列表失败:', error);
    return { resources: [] };
  }
});

// Resource 读取处理器
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  if (!uri.startsWith('webgal://docs/')) {
    throw new Error(`不支持的资源 URI: ${uri}`);
  }
  
  try {
    const docPath = uri.replace('webgal://docs/', '');
    const fullPath = path.join(docsDir, docPath);
    const normalizedPath = path.normalize(fullPath);
    
    // 安全检查
    if (!normalizedPath.startsWith(docsDir)) {
      throw new Error('路径不在允许的文档目录范围内');
    }
    
    const content = await fs.readFile(normalizedPath, 'utf-8');
    
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: content
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`无法读取资源 ${uri}: ${errorMessage}`);
  }
});
