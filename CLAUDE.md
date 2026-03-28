# zenmoney-mcp

MCP server for ZenMoney personal finance. TypeScript, built with `@modelcontextprotocol/sdk`.

## Build & Run

```bash
npm install
npm run build   # tsc → build/
npm start       # node build/index.js
```

Requires `ZENMONEY_TOKEN` env var (from https://zerro.app/token). Set in `.env`.

## Structure

- `src/index.ts` — entry point, server setup
- `src/api.ts` — ZenMoney API client
- `src/state.ts` — in-memory state after sync
- `src/tools/` — MCP tool registrations (sync, accounts, categories, transactions, suggest)
