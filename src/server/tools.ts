import { ListToolsRequestSchema, CallToolRequestSchema, CallToolRequest } from "@modelcontextprotocol/sdk/types";
import fs from 'fs/promises';
import path from "path";
import { docsDir } from "../config.js";
import { server } from "./index.js";


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
