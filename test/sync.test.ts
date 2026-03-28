import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { ZenMoneyAPI } from "../src/api.js";
import { ZenState } from "../src/state.js";
import { registerSyncTools } from "../src/tools/sync.js";
import { makeDiffResponse } from "./fixtures.js";
import { getTextContent } from "./helpers.js";

async function setup() {
  const diffResp = makeDiffResponse();
  const api = {
    diff: vi.fn().mockResolvedValue(diffResp),
    suggest: vi.fn(),
  } as unknown as ZenMoneyAPI;

  const state = new ZenState(api);

  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerSyncTools(server, state);

  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  await client.connect(ct);

  return { api, state, client };
}

describe("sync_data", () => {
  it("should sync and return summary", async () => {
    const { client } = await setup();

    const result = await client.callTool({
      name: "sync_data",
      arguments: {},
    });

    const text = getTextContent(result);
    expect(text).toContain("Sync complete");
    expect(text).toContain('"accounts": 4');
    expect(text).toContain('"active_accounts": 3');
    expect(text).toContain('"categories": 3');
    expect(text).toContain('"merchants": 1');
    expect(text).toContain('"currencies": 3');
  });

  it("should pass force_full to state.sync", async () => {
    const { api, client } = await setup();

    await client.callTool({
      name: "sync_data",
      arguments: { force_full: true },
    });

    // On force full, serverTimestamp should be 0
    expect(api.diff).toHaveBeenCalledWith(
      expect.objectContaining({
        serverTimestamp: 0,
        forceFetch: expect.any(Array),
      })
    );
  });

  it("should handle sync errors", async () => {
    const { api, client } = await setup();
    vi.mocked(api.diff).mockRejectedValue(new Error("Auth failed"));

    const result = await client.callTool({
      name: "sync_data",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(getTextContent(result)).toContain("Auth failed");
  });
});
