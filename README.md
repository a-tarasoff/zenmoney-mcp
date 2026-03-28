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

## Installation

```bash
git clone https://github.com/a-tarasoff/zenmoney-mcp.git
cd zenmoney-mcp
npm install
npm run build
```

## Configuration

1. Copy the example environment file and add your token:

```bash
cp .env.example .env
```

2. Edit `.env` and paste your token:

```
ZENMONEY_TOKEN=your_token_here
```

Get your token at [zerro.app/token](https://zerro.app/token).

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "zenmoney": {
      "command": "node",
      "args": ["/absolute/path/to/zenmoney-mcp/build/index.js"],
      "env": {
        "ZENMONEY_TOKEN": "your_token_here"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project or global config:

```json
{
  "mcpServers": {
    "zenmoney": {
      "command": "node",
      "args": ["/absolute/path/to/zenmoney-mcp/build/index.js"],
      "env": {
        "ZENMONEY_TOKEN": "your_token_here"
      }
    }
  }
}
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
