# zenmoney-mcp

MCP server for [ZenMoney](https://zenmoney.ru) — access your personal finance data from any MCP-compatible AI client (Claude Desktop, Cursor, etc.).

## Features

| Tool | Description |
|------|-------------|
| `sync_data` | Sync data with ZenMoney (run first) |
| `list_accounts` | List wallets, cards, and cash accounts |
| `list_categories` | List expense/income categories with hierarchy |
| `list_merchants` | List known merchants/payees |
| `list_transactions` | List and filter recent transactions |
| `add_expense` | Add an expense transaction |
| `add_income` | Add an income transaction |
| `add_transfer` | Transfer money between accounts |
| `suggest_category` | Get auto-suggested category for a payee |

## Prerequisites

- Node.js >= 18
- A [ZenMoney](https://zenmoney.ru) account
- API token from [zerro.app/token](https://zerro.app/token)

## Quick start

No cloning or building needed — just add to your MCP client config:

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "zenmoney": {
      "command": "npx",
      "args": ["-y", "zenmoney-mcp"],
      "env": {
        "ZENMONEY_TOKEN": "your_token_here"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "zenmoney": {
      "command": "npx",
      "args": ["-y", "zenmoney-mcp"],
      "env": {
        "ZENMONEY_TOKEN": "your_token_here"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add zenmoney -- npx -y zenmoney-mcp
```

Replace `your_token_here` with your token from [zerro.app/token](https://zerro.app/token).

### From source

```bash
git clone https://github.com/a-tarasoff/zenmoney-mcp.git
cd zenmoney-mcp
npm install
npm run build
cp .env.example .env  # add your token
```

## Usage

Once configured, start a conversation and ask your AI client to:

1. **Sync first** — "Sync my ZenMoney data"
2. **Browse** — "Show me my accounts", "List my categories"
3. **Query** — "Show expenses for the last 7 days", "How much did I spend on groceries?"
4. **Add transactions** — "Add a 500 RUB expense for coffee today"

## Contributing

PRs welcome! Feel free to open issues for bugs or feature requests.

## License

[MIT](LICENSE)
