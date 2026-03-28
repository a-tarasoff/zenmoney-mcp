#!/usr/bin/env node
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ZenMoneyAPI } from "./api.js";
import { ZenState } from "./state.js";
import { registerSyncTools } from "./tools/sync.js";
import { registerAccountTools } from "./tools/accounts.js";
import { registerCategoryTools } from "./tools/categories.js";
import { registerTransactionTools } from "./tools/transactions.js";
import { registerSuggestTools } from "./tools/suggest.js";

const token = process.env.ZENMONEY_TOKEN;
if (!token) {
  console.error(
    "ZENMONEY_TOKEN environment variable is required.\n" +
      "Get your token from https://zerro.app/token and set it in .env"
  );
  process.exit(1);
}

const api = new ZenMoneyAPI(token);
const state = new ZenState(api);

const server = new McpServer({
  name: "zenmoney-mcp",
  version: "0.1.0",
});

registerSyncTools(server, state);
registerAccountTools(server, state);
registerCategoryTools(server, state);
registerTransactionTools(server, api, state);
registerSuggestTools(server, api, state);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ZenMoney MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
