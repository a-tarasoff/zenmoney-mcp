import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { ZenMoneyAPI } from "../src/api.js";
import { ZenState } from "../src/state.js";
import { registerAccountTools } from "../src/tools/accounts.js";
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
  registerAccountTools(server, state);

  client = new Client({ name: "test-client", version: "1.0.0" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  await client.connect(ct);
}

describe("list_accounts", () => {
  beforeEach(() => setup());

  it("should list active accounts by default", async () => {
    const result = await client.callTool({
      name: "list_accounts",
      arguments: {},
    });

    const text = getTextContent(result);
    expect(text).toContain("Accounts (3)");
    expect(text).toContain("Checking");
    expect(text).toContain("Savings");
    expect(text).toContain("Euro Card");
    expect(text).not.toContain("Old Account");
  });

  it("should include archived accounts when requested", async () => {
    const result = await client.callTool({
      name: "list_accounts",
      arguments: { include_archived: true },
    });

    const text = getTextContent(result);
    expect(text).toContain("Accounts (4)");
    expect(text).toContain("Old Account");
    expect(text).toContain("(archived)");
  });

  it("should show balance and currency", async () => {
    const result = await client.callTool({
      name: "list_accounts",
      arguments: {},
    });

    const text = getTextContent(result);
    expect(text).toContain("5000");
    expect(text).toContain("USD");
    expect(text).toContain("EUR");
  });

  it("should show bank name from company", async () => {
    const result = await client.callTool({
      name: "list_accounts",
      arguments: {},
    });

    const text = getTextContent(result);
    expect(text).toContain("Test Bank");
  });

  it("should show account IDs", async () => {
    const result = await client.callTool({
      name: "list_accounts",
      arguments: {},
    });

    const text = getTextContent(result);
    expect(text).toContain("acc-checking");
    expect(text).toContain("acc-euro");
  });

  it("should error when not synced", async () => {
    await setup({ synced: false });
    const result = await client.callTool({
      name: "list_accounts",
      arguments: {},
    });
    expect(result.isError).toBe(true);
    expect(getTextContent(result)).toContain("not synced");
  });
});
