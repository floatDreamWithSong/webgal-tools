import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerResources } from "./resource.js";
import { registerPrompts } from "./prompt.js";
import { registerTools } from "./tool.js";

export const server = new Server({
  name: "webgal-docs-server",
  version: "1.0.3"
}, {
  capabilities: {
    tools: {},
    prompts: {},
    resources: {}
  }
});

registerResources(server);
registerPrompts(server);
registerTools(server);
