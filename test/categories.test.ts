import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { ZenMoneyAPI } from "../src/api.js";
import { ZenState } from "../src/state.js";
import { registerCategoryTools } from "../src/tools/categories.js";
import { makeDiffResponse } from "./fixtures.js";
import { getTextContent } from "./helpers.js";

let server: McpServer;
let client: Client;
let state: ZenState;

async function setup(opts?: { synced?: boolean }) {
  const diffResp = makeDiffResponse();
  const api = {
    diff: vi.fn().mockResolvedValue(diffResp),
    suggest: vi.fn(),
  } as unknown as ZenMoneyAPI;

  state = new ZenState(api);
  if (opts?.synced !== false) {
    await state.sync();
  }

  server = new McpServer({ name: "test", version: "1.0.0" });
  registerCategoryTools(server, state);

  client = new Client({ name: "test-client", version: "1.0.0" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  await client.connect(ct);
}

describe("list_categories", () => {
  beforeEach(() => setup());

  it("should list categories with hierarchy", async () => {
    const result = await client.callTool({
      name: "list_categories",
      arguments: {},
    });

    const text = getTextContent(result);
    expect(text).toContain("Categories (3)");
    expect(text).toContain("Food");
    expect(text).toContain("Restaurants");
    expect(text).toContain("Salary");
  });

  it("should show income/expense flags", async () => {
    const result = await client.callTool({
      name: "list_categories",
      arguments: {},
    });

    const text = getTextContent(result);
    expect(text).toContain("expense"); // Food is expense
    expect(text).toContain("income"); // Salary is income
  });

  it("should show tag IDs", async () => {
    const result = await client.callTool({
      name: "list_categories",
      arguments: {},
    });

    const text = getTextContent(result);
    expect(text).toContain("tag-food");
    expect(text).toContain("tag-salary");
  });

  it("should error when not synced", async () => {
    await setup({ synced: false });
    const result = await client.callTool({
      name: "list_categories",
      arguments: {},
    });
    expect(result.isError).toBe(true);
  });
});

describe("list_merchants", () => {
  beforeEach(() => setup());

  it("should list merchants", async () => {
    const result = await client.callTool({
      name: "list_merchants",
      arguments: {},
    });

    const text = getTextContent(result);
    expect(text).toContain("Merchants (1)");
    expect(text).toContain("Corner Cafe");
    expect(text).toContain("merchant-cafe");
  });

  it("should error when not synced", async () => {
    await setup({ synced: false });
    const result = await client.callTool({
      name: "list_merchants",
      arguments: {},
    });
    expect(result.isError).toBe(true);
  });
});
