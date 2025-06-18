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
// 读取 prompts 目录下的 webgal_script_assistant.txt 文件
const promptsDir = path.join(packageRoot, 'prompts');
const webgalScriptAssistantPrompt = await fs.readFile(path.join(promptsDir, 'webgal_script_assistant.txt'), 'utf-8');

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
        name: "webgal_script_assistant",
        description: "获取 WebGAL 脚本语法帮助提示词，提供脚本编写的详细指导"
      }
    ]
  };
});

// Prompt 获取处理器
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {

    case "webgal_script_assistant":
      return {
        description: "WebGAL 脚本助手",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: webgalScriptAssistantPrompt
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
