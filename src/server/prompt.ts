import { ListPromptsRequestSchema, GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import fs from 'fs';
import path from "path";
import { promptsDir } from "../config.js";


// 读取 prompts 目录下的 webgal_script_assistant.txt 文件
const webgalScriptAssistantPrompt = fs.readFileSync(path.join(promptsDir, 'webgal_script_assistant.txt'), 'utf-8');

export const registerPrompts = (server: Server) => {
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
}