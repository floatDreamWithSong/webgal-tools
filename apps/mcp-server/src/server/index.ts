import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerPrompts } from "./prompt.js";
import { registerTools } from "./tool.js";

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
