import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { ZenMoneyAPI } from "../src/api.js";
import { ZenState } from "../src/state.js";
import { registerSuggestTools } from "../src/tools/suggest.js";
import { makeDiffResponse } from "./fixtures.js";
import { getTextContent } from "./helpers.js";

let api: ZenMoneyAPI;
let client: Client;

async function setup() {
  const diffResp = makeDiffResponse();
  api = {
    diff: vi.fn().mockResolvedValue(diffResp),
    suggest: vi.fn().mockResolvedValue([
      { tag: ["tag-food"], merchant: "merchant-cafe", payee: "Corner Cafe" },
    ]),
  } as unknown as ZenMoneyAPI;

  const state = new ZenState(api);
  await state.sync();

  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerSuggestTools(server, api, state);

  client = new Client({ name: "test-client", version: "1.0.0" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  await client.connect(ct);
}

describe("suggest_category", () => {
  beforeEach(() => setup());

  it("should return suggestions with category name", async () => {
    const result = await client.callTool({
      name: "suggest_category",
      arguments: { payee: "Cafe Corner" },
    });

    const text = getTextContent(result);
    expect(text).toContain("Food");
    expect(text).toContain("Corner Cafe");
  });

  it("should call API with payee", async () => {
    await client.callTool({
      name: "suggest_category",
      arguments: { payee: "Starbucks" },
    });

    expect(api.suggest).toHaveBeenCalledWith([{ payee: "Starbucks" }]);
  });

  it("should handle empty suggestions", async () => {
    vi.mocked(api.suggest).mockResolvedValue([{}]);

    const result = await client.callTool({
      name: "suggest_category",
      arguments: { payee: "Unknown Place" },
    });

    const text = getTextContent(result);
    expect(text).toContain('Suggestions for "Unknown Place"');
  });

  it("should handle no suggestion returned", async () => {
    vi.mocked(api.suggest).mockResolvedValue([]);

    const result = await client.callTool({
      name: "suggest_category",
      arguments: { payee: "Nowhere" },
    });

    expect(getTextContent(result)).toContain("No suggestions found");
  });

  it("should handle API errors", async () => {
    vi.mocked(api.suggest).mockRejectedValue(new Error("API down"));

    const result = await client.callTool({
      name: "suggest_category",
      arguments: { payee: "Test" },
    });

    expect(result.isError).toBe(true);
    expect(getTextContent(result)).toContain("API down");
  });

  it("should show tag ID when tag name not found in state", async () => {
    vi.mocked(api.suggest).mockResolvedValue([
      { tag: ["unknown-tag-id"], merchant: null, payee: null },
    ]);

    const result = await client.callTool({
      name: "suggest_category",
      arguments: { payee: "Test" },
    });

    expect(getTextContent(result)).toContain("unknown-tag-id");
  });
});
