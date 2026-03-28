import { vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { ZenMoneyAPI, DiffResponse } from "../src/api.js";
import { ZenState } from "../src/state.js";
import { makeDiffResponse } from "./fixtures.js";

export function createMockApi(diffResponse?: Partial<DiffResponse>) {
  const resp = makeDiffResponse(diffResponse);
  return {
    diff: vi.fn().mockResolvedValue(resp),
    suggest: vi.fn().mockResolvedValue([]),
  } as unknown as ZenMoneyAPI;
}

export async function createSyncedState(diffResponse?: Partial<DiffResponse>) {
  const api = createMockApi(diffResponse);
  const state = new ZenState(api);
  await state.sync();
  return { api, state };
}

export async function createMcpPair() {
  const server = new McpServer({ name: "test-server", version: "1.0.0" });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  return { server, client, clientTransport, serverTransport };
}

export async function connectPair(pair: {
  server: McpServer;
  client: Client;
  clientTransport: InMemoryTransport;
  serverTransport: InMemoryTransport;
}) {
  await pair.server.connect(pair.serverTransport);
  await pair.client.connect(pair.clientTransport);
}

export function getTextContent(result: any): string {
  return result.content
    .filter((c: any) => c.type === "text")
    .map((c: any) => c.text)
    .join("\n");
}
