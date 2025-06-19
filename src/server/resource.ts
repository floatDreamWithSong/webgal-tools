// import { ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
// import { Server } from "@modelcontextprotocol/sdk/server/index.js";
// import path from "path";
// import fs from 'fs/promises';
// import { docsDir, workDir } from "../config.js";

// // Resource 一般处理静态内容，比如文档、图片、视频等
// export const registerResources = (server: Server) => {

//   // Resource 列表处理器
//   server.setRequestHandler(ListResourcesRequestSchema, async () => {
//     try {
//       const resources = [];

//       // 递归获取所有文档文件
//       async function getAllDocs(dir: string, basePath: string = ''): Promise<any[]> {
//         const items = await fs.readdir(dir);
//         const docs = [];

//         for (const item of items) {
//           const fullPath = path.join(dir, item);
//           const stat = await fs.stat(fullPath);
//           const relativePath = basePath ? `${basePath}/${item}` : item;

//           if (stat.isDirectory()) {
//             const subDocs = await getAllDocs(fullPath, relativePath);
//             docs.push(...subDocs);
//           } else if (item.endsWith('.md')) {
//             docs.push({
//               uri: `webgal://docs/${relativePath}`,
//               name: relativePath,
//               description: `WebGAL 文档: ${relativePath}`,
//               mimeType: "text/markdown"
//             });
//           }
//         }

//         return docs;
//       }

//       const allDocs = await getAllDocs(docsDir);
//       resources.push(...allDocs);

//       return { resources };
//     } catch (error) {
//       console.error('获取资源列表失败:', error);
//       return { resources: [] };
//     }
//   });



//   // Resource 读取处理器
//   server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
//     const { uri } = request.params;

//     if (!uri.startsWith('webgal://docs/')) {
//       throw new Error(`不支持的资源 URI: ${uri}`);
//     }

//     try {
//       const docPath = uri.replace('webgal://docs/', '');
//       const fullPath = path.join(docsDir, docPath);
//       const normalizedPath = path.normalize(fullPath);

//       // 安全检查
//       if (!normalizedPath.startsWith(docsDir)) {
//         throw new Error('路径不在允许的文档目录范围内');
//       }

//       const content = await fs.readFile(normalizedPath, 'utf-8');

//       return {
//         contents: [
//           {
//             uri,
//             mimeType: "text/markdown",
//             text: content
//           }
//         ]
//       };
//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : String(error);
//       throw new Error(`无法读取资源 ${uri}: ${errorMessage}`);
//     }
//   });
// }