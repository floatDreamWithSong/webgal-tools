import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.resolve(__dirname, '../../resource/docs');

// 文档工具的Schema定义
export const docsToolsSchema = [
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
];

// 获取文档目录
export async function getDocsDirectory() {
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
}

// 获取文档内容
export async function getDocContent(args: any) {
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
}
