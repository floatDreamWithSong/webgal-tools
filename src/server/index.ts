import { Server } from "@modelcontextprotocol/sdk/server/index.js";

export const server = new Server({
  name: "webgal-docs-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {},
    prompts: {},
    resources: {}
  }
});