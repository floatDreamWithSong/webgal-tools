import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerPrompts } from "./prompt.js";
import { registerTools } from "./tool.js";

// 添加全局工作目录变量
let globalWorkDir: string = process.cwd();

// 提供设置工作目录的函数
export function setWorkDir(workDir: string): void {
  globalWorkDir = workDir;
}

// 提供获取工作目录的函数
export function getWorkDir(): string {
  return globalWorkDir;
}

export const server = new Server({
  name: "webgal-docs-server",
  version: "1.3.0"
}, {
  capabilities: {
    tools: {},
    prompts: {},
    resources: {}
  }
});

registerPrompts(server);
registerTools(server);
