import { ListToolsRequestSchema, CallToolRequestSchema, CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
// 导入所有工具模块
import {
  // 文档工具
  docsToolsSchema, getDocsDirectory, getDocContent,
  // 资产工具
  assetsToolsSchema, scanWorkDirAssets, getLive2DExpression,
  // 场景工具
  sceneToolsSchema, scanSceneScript, createSceneScript, editSceneScript
} from "./tools/index.js";

export const registerTools = (server: Server) => {

  // 工具列表处理器
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        ...docsToolsSchema,
        ...assetsToolsSchema,
        ...sceneToolsSchema
      ]
    };
  });

  // 工具调用处理器
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      // 文档工具
      case "get_docs_directory":
        return await getDocsDirectory();

      case "get_doc_content":
        return await getDocContent(args);

      // 资产工具
      case "scan_work_dir_assets":
        return await scanWorkDirAssets(args);

      case "get_live2d_expression":
        return await getLive2DExpression(args);

      // 场景脚本工具
      case "scan_scene_script":
        return await scanSceneScript();

      case "create_scene_script":
        return await createSceneScript(args);

      case "edit_scene_script":
        return await editSceneScript(args);

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

}