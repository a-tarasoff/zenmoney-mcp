import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { ZenMoneyAPI } from "../src/api.js";
import { ZenState } from "../src/state.js";
import { registerTransactionTools } from "../src/tools/transactions.js";
import {
  makeDiffResponse,
  makeTransaction,
  CHECKING,
  SAVINGS,
  EURO_CARD,
} from "./fixtures.js";
import { getTextContent } from "./helpers.js";

let server: McpServer;
let client: Client;
let api: ZenMoneyAPI;
let state: ZenState;

async function setup(opts?: { synced?: boolean; transactions?: ReturnType<typeof makeTransaction>[] }) {
  const diffResp = makeDiffResponse({
    transaction: opts?.transactions ?? [],
  });

  api = {
    diff: vi.fn().mockResolvedValue(diffResp),
    suggest: vi.fn(),
  } as unknown as ZenMoneyAPI;

  state = new ZenState(api);
  if (opts?.synced !== false) {
    await state.sync();
    // Reset mock so tool calls are tracked separately
    vi.mocked(api.diff).mockResolvedValue({
      ...diffResp,
      serverTimestamp: diffResp.serverTimestamp + 1,
    });
  }

  server = new McpServer({ name: "test", version: "1.0.0" });
  registerTransactionTools(server, api, state);

  client = new Client({ name: "test-client", version: "1.0.0" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st);
  await client.connect(ct);
}

async function callTool(name: string, args: Record<string, unknown>) {
  return client.callTool({ name, arguments: args });
}

describe("add_expense", () => {
  beforeEach(() => setup());

  it("should create an expense transaction", async () => {
    const result = await callTool("add_expense", {
      account: "Checking",
      amount: 42.5,
      date: "2026-03-20",
    });

    const text = getTextContent(result);
    expect(text).toContain("Expense added");
    expect(text).toContain("42.5 USD");
    expect(text).toContain("Checking");
    expect(text).toContain("2026-03-20");

    // Verify API was called with correct transaction shape
    expect(api.diff).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction: [
          expect.objectContaining({
            outcome: 42.5,
            income: 0,
            outcomeAccount: "acc-checking",
            incomeAccount: "acc-checking",
            outcomeInstrument: 1,
            incomeInstrument: 1,
            date: "2026-03-20",
          }),
        ],
      })
    );
  });

  it("should resolve account by UUID", async () => {
    const result = await callTool("add_expense", {
      account: "acc-checking",
      amount: 10,
      date: "2026-03-20",
    });
    expect(getTextContent(result)).toContain("Expense added");
  });

  it("should attach category", async () => {
    const result = await callTool("add_expense", {
      account: "Checking",
      amount: 25,
      date: "2026-03-20",
      category: "Food",
    });

    const text = getTextContent(result);
    expect(text).toContain("Food");

    expect(api.diff).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction: [expect.objectContaining({ tag: ["tag-food"] })],
      })
    );
  });

  it("should attach payee and comment", async () => {
    const result = await callTool("add_expense", {
      account: "Checking",
      amount: 15,
      date: "2026-03-20",
      payee: "Coffee Shop",
      comment: "morning coffee",
    });

    const text = getTextContent(result);
    expect(text).toContain("Coffee Shop");
    expect(text).toContain("morning coffee");
  });

  it("should error when account not found", async () => {
    const result = await callTool("add_expense", {
      account: "Nonexistent",
      amount: 10,
      date: "2026-03-20",
    });

    expect(result.isError).toBe(true);
    expect(getTextContent(result)).toContain("not found");
  });

  it("should error when not synced", async () => {
    await setup({ synced: false });

    const result = await callTool("add_expense", {
      account: "Checking",
      amount: 10,
      date: "2026-03-20",
    });

    expect(result.isError).toBe(true);
    expect(getTextContent(result)).toContain("not synced");
  });

  it("should handle API errors", async () => {
    vi.mocked(api.diff).mockRejectedValue(new Error("Network error"));

    const result = await callTool("add_expense", {
      account: "Checking",
      amount: 10,
      date: "2026-03-20",
    });

    expect(result.isError).toBe(true);
    expect(getTextContent(result)).toContain("Network error");
  });

  it("should use account instrument for currency", async () => {
    const result = await callTool("add_expense", {
      account: "Euro Card",
      amount: 100,
      date: "2026-03-20",
    });

    const text = getTextContent(result);
    expect(text).toContain("100 EUR");

    expect(api.diff).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction: [
          expect.objectContaining({
            outcomeInstrument: 2,
            incomeInstrument: 2,
          }),
        ],
      })
    );
  });

  it("should push transaction to local state on success", async () => {
    const before = state.transactions.length;
    await callTool("add_expense", {
      account: "Checking",
      amount: 10,
      date: "2026-03-20",
    });
    expect(state.transactions.length).toBe(before + 1);
  });
});

describe("add_income", () => {
  beforeEach(() => setup());

  it("should create an income transaction", async () => {
    const result = await callTool("add_income", {
      account: "Checking",
      amount: 3000,
      date: "2026-03-01",
    });

    const text = getTextContent(result);
    expect(text).toContain("Income added");
    expect(text).toContain("3000 USD");

    expect(api.diff).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction: [
          expect.objectContaining({
            income: 3000,
            outcome: 0,
            incomeAccount: "acc-checking",
            outcomeAccount: "acc-checking",
          }),
        ],
      })
    );
  });

  it("should error when account not found", async () => {
    const result = await callTool("add_income", {
      account: "Nonexistent",
      amount: 100,
      date: "2026-03-01",
    });
    expect(result.isError).toBe(true);
  });

  it("should error when not synced", async () => {
    await setup({ synced: false });
    const result = await callTool("add_income", {
      account: "Checking",
      amount: 100,
      date: "2026-03-01",
    });
    expect(result.isError).toBe(true);
  });
});

describe("add_transfer", () => {
  beforeEach(() => setup());

  it("should create a same-currency transfer", async () => {
    const result = await callTool("add_transfer", {
      from_account: "Checking",
      to_account: "Savings",
      amount: 500,
      date: "2026-03-20",
    });

    const text = getTextContent(result);
    expect(text).toContain("Transfer added");
    expect(text).toContain("Checking");
    expect(text).toContain("Savings");
    expect(text).toContain("500 USD");

    expect(api.diff).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction: [
          expect.objectContaining({
            outcome: 500,
            income: 500,
            outcomeAccount: "acc-checking",
            incomeAccount: "acc-savings",
            outcomeInstrument: 1,
            incomeInstrument: 1,
          }),
        ],
      })
    );
  });

  it("should create a cross-currency transfer with both amounts", async () => {
    const result = await callTool("add_transfer", {
      from_account: "Checking",
      to_account: "Euro Card",
      outcome_amount: 1000,
      income_amount: 920,
      date: "2026-03-20",
    });

    const text = getTextContent(result);
    expect(text).toContain("Transfer added");
    expect(text).toContain("1000 USD");
    expect(text).toContain("920 EUR");

    expect(api.diff).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction: [
          expect.objectContaining({
            outcome: 1000,
            income: 920,
            outcomeAccount: "acc-checking",
            incomeAccount: "acc-euro",
            outcomeInstrument: 1,
            incomeInstrument: 2,
          }),
        ],
      })
    );
  });

  it("should error on cross-currency transfer without income_amount", async () => {
    const result = await callTool("add_transfer", {
      from_account: "Checking",
      to_account: "Euro Card",
      amount: 1000,
      date: "2026-03-20",
    });

    expect(result.isError).toBe(true);
    const text = getTextContent(result);
    expect(text).toContain("Cross-currency");
    expect(text).toContain("USD");
    expect(text).toContain("EUR");
    expect(text).toContain("income_amount");
  });

  it("should allow outcome_amount as alternative to amount", async () => {
    const result = await callTool("add_transfer", {
      from_account: "Checking",
      to_account: "Savings",
      outcome_amount: 200,
      date: "2026-03-20",
    });

    const text = getTextContent(result);
    expect(text).toContain("Transfer added");

    expect(api.diff).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction: [expect.objectContaining({ outcome: 200, income: 200 })],
      })
    );
  });

  it("should error when neither amount nor outcome_amount given", async () => {
    const result = await callTool("add_transfer", {
      from_account: "Checking",
      to_account: "Savings",
      date: "2026-03-20",
    });

    expect(result.isError).toBe(true);
    expect(getTextContent(result)).toContain("outcome_amount");
  });

  it("should attach comment", async () => {
    await callTool("add_transfer", {
      from_account: "Checking",
      to_account: "Savings",
      amount: 100,
      date: "2026-03-20",
      comment: "monthly savings",
    });

    expect(api.diff).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction: [expect.objectContaining({ comment: "monthly savings" })],
      })
    );
  });

  it("should error when source account not found", async () => {
    const result = await callTool("add_transfer", {
      from_account: "Nonexistent",
      to_account: "Savings",
      amount: 100,
      date: "2026-03-20",
    });
    expect(result.isError).toBe(true);
    expect(getTextContent(result)).toContain("Source account");
  });

  it("should error when destination account not found", async () => {
    const result = await callTool("add_transfer", {
      from_account: "Checking",
      to_account: "Nonexistent",
      amount: 100,
      date: "2026-03-20",
    });
    expect(result.isError).toBe(true);
    expect(getTextContent(result)).toContain("Destination account");
  });

  it("should error when not synced", async () => {
    await setup({ synced: false });
    const result = await callTool("add_transfer", {
      from_account: "Checking",
      to_account: "Savings",
      amount: 100,
      date: "2026-03-20",
    });
    expect(result.isError).toBe(true);
  });

  it("should handle same-currency transfer with income_amount (both provided)", async () => {
    // Even for same currency, if income_amount is provided, use it
    const result = await callTool("add_transfer", {
      from_account: "Checking",
      to_account: "Savings",
      outcome_amount: 500,
      income_amount: 500,
      date: "2026-03-20",
    });

    expect(getTextContent(result)).toContain("Transfer added");
    expect(api.diff).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction: [expect.objectContaining({ outcome: 500, income: 500 })],
      })
    );
  });
});

describe("list_transactions", () => {
  it("should list transactions", async () => {
    const txs = [
      makeTransaction({
        id: "tx-expense",
        outcome: 50,
        income: 0,
        outcomeAccount: "acc-checking",
        incomeAccount: "acc-checking",
        outcomeInstrument: 1,
        incomeInstrument: 1,
        tag: ["tag-food"],
        payee: "Grocery Store",
        date: "2026-03-20",
      }),
      makeTransaction({
        id: "tx-income",
        income: 3000,
        outcome: 0,
        incomeAccount: "acc-checking",
        outcomeAccount: "acc-checking",
        incomeInstrument: 1,
        outcomeInstrument: 1,
        date: "2026-03-01",
      }),
    ];
    await setup({ transactions: txs });

    const result = await callTool("list_transactions", { start_date: "2026-03-01", end_date: "2026-03-31" });
    const text = getTextContent(result);

    expect(text).toContain("expense");
    expect(text).toContain("-50 USD");
    expect(text).toContain("Food");
    expect(text).toContain("Grocery Store");
    expect(text).toContain("income");
    expect(text).toContain("+3000 USD");
  });

  it("should list transfers between accounts", async () => {
    const txs = [
      makeTransaction({
        id: "tx-transfer",
        outcome: 500,
        income: 500,
        outcomeAccount: "acc-checking",
        incomeAccount: "acc-savings",
        outcomeInstrument: 1,
        incomeInstrument: 1,
        date: "2026-03-15",
      }),
    ];
    await setup({ transactions: txs });

    const result = await callTool("list_transactions", { start_date: "2026-03-01", end_date: "2026-03-31" });
    const text = getTextContent(result);
    expect(text).toContain("transfer");
    expect(text).toContain("Checking");
    expect(text).toContain("Savings");
  });

  it("should display cross-currency transfers with both currencies", async () => {
    const txs = [
      makeTransaction({
        id: "tx-cross",
        outcome: 1000,
        income: 920,
        outcomeAccount: "acc-checking",
        incomeAccount: "acc-euro",
        outcomeInstrument: 1,
        incomeInstrument: 2,
        date: "2026-03-15",
      }),
    ];
    await setup({ transactions: txs });

    const result = await callTool("list_transactions", { start_date: "2026-03-01", end_date: "2026-03-31" });
    const text = getTextContent(result);
    expect(text).toContain("transfer");
    expect(text).toContain("1000 USD");
    expect(text).toContain("920 EUR");
  });

  it("should filter by account", async () => {
    const txs = [
      makeTransaction({
        id: "tx-1",
        outcome: 50,
        outcomeAccount: "acc-checking",
        incomeAccount: "acc-checking",
        date: "2026-03-20",
      }),
      makeTransaction({
        id: "tx-2",
        outcome: 100,
        outcomeAccount: "acc-savings",
        incomeAccount: "acc-savings",
        date: "2026-03-20",
      }),
    ];
    await setup({ transactions: txs });

    const result = await callTool("list_transactions", {
      start_date: "2026-03-01",
      end_date: "2026-03-31",
      account: "Savings",
    });
    const text = getTextContent(result);
    expect(text).toContain("1)");
    expect(text).not.toContain("50");
  });

  it("should filter by category", async () => {
    const txs = [
      makeTransaction({
        id: "tx-food",
        outcome: 25,
        outcomeAccount: "acc-checking",
        incomeAccount: "acc-checking",
        tag: ["tag-food"],
        date: "2026-03-20",
      }),
      makeTransaction({
        id: "tx-nocat",
        outcome: 50,
        outcomeAccount: "acc-checking",
        incomeAccount: "acc-checking",
        tag: null,
        date: "2026-03-20",
      }),
    ];
    await setup({ transactions: txs });

    const result = await callTool("list_transactions", {
      start_date: "2026-03-01",
      end_date: "2026-03-31",
      category: "Food",
    });
    const text = getTextContent(result);
    expect(text).toContain("1)");
    expect(text).toContain("25");
  });

  it("should filter by date range", async () => {
    const txs = [
      makeTransaction({ id: "tx-recent", outcome: 10, date: "2026-03-25" }),
      makeTransaction({ id: "tx-old", outcome: 20, date: "2025-01-01" }),
    ];
    await setup({ transactions: txs });

    const result = await callTool("list_transactions", { start_date: "2026-03-01", end_date: "2026-03-31" });
    const text = getTextContent(result);
    // Only the recent one should show
    expect(text).toContain("Transactions (1)");
  });

  it("should respect limit", async () => {
    const txs = Array.from({ length: 10 }, (_, i) =>
      makeTransaction({
        id: `tx-${i}`,
        outcome: i * 10,
        date: "2026-03-20",
      })
    );
    await setup({ transactions: txs });

    const result = await callTool("list_transactions", {
      start_date: "2026-03-01",
      end_date: "2026-03-31",
      limit: 3,
    });
    const text = getTextContent(result);
    expect(text).toContain("Transactions (3)");
  });

  it("should show empty message when no transactions match", async () => {
    await setup({ transactions: [] });
    const result = await callTool("list_transactions", { start_date: "2026-03-01", end_date: "2026-03-31" });
    expect(getTextContent(result)).toContain("No transactions found");
  });

  it("should error when not synced", async () => {
    await setup({ synced: false });
    const result = await callTool("list_transactions", { start_date: "2026-03-01", end_date: "2026-03-31" });
    expect(result.isError).toBe(true);
  });

  it("should filter by explicit start_date and end_date range", async () => {
    const txs = [
      makeTransaction({ id: "tx-before", outcome: 10, date: "2025-12-31" }),
      makeTransaction({ id: "tx-jan-start", outcome: 20, date: "2026-01-01" }),
      makeTransaction({ id: "tx-jan-mid", outcome: 30, date: "2026-01-15" }),
      makeTransaction({ id: "tx-jan-end", outcome: 40, date: "2026-01-31" }),
      makeTransaction({ id: "tx-after", outcome: 50, date: "2026-02-01" }),
    ];
    await setup({ transactions: txs });

    const result = await callTool("list_transactions", {
      start_date: "2026-01-01",
      end_date: "2026-01-31",
    });
    const text = getTextContent(result);
    expect(text).toContain("Transactions (3)");
    expect(text).toContain("2026-01-01");
    expect(text).toContain("2026-01-15");
    expect(text).toContain("2026-01-31");
    expect(text).not.toContain("2025-12-31");
    expect(text).not.toContain("2026-02-01");
  });

  it("should support start_date alone (defaults end to today)", async () => {
    const txs = [
      makeTransaction({ id: "tx-old", outcome: 10, date: "2025-06-01" }),
      makeTransaction({ id: "tx-new", outcome: 20, date: "2026-04-01" }),
    ];
    await setup({ transactions: txs });

    const result = await callTool("list_transactions", {
      start_date: "2026-01-01",
    });
    const text = getTextContent(result);
    expect(text).toContain("Transactions (1)");
    expect(text).toContain("2026-04-01");
  });

  it("should support end_date alone (defaults start to unbounded)", async () => {
    const txs = [
      makeTransaction({ id: "tx-old", outcome: 10, date: "2024-06-01" }),
      makeTransaction({ id: "tx-mid", outcome: 20, date: "2025-06-01" }),
      makeTransaction({ id: "tx-future", outcome: 30, date: "2030-01-01" }),
    ];
    await setup({ transactions: txs });

    const result = await callTool("list_transactions", {
      end_date: "2025-12-31",
    });
    const text = getTextContent(result);
    expect(text).toContain("Transactions (2)");
    expect(text).not.toContain("2030-01-01");
  });

  it("should ignore days when start_date or end_date is provided", async () => {
    const txs = [
      makeTransaction({ id: "tx-old", outcome: 10, date: "2025-01-15" }),
    ];
    await setup({ transactions: txs });

    // days=30 from 2026-04-27 would exclude 2025-01-15, but explicit range includes it
    const result = await callTool("list_transactions", {
      days: 30,
      start_date: "2025-01-01",
      end_date: "2025-01-31",
    });
    const text = getTextContent(result);
    expect(text).toContain("Transactions (1)");
    expect(text).toContain("2025-01-15");
  });

  it("should error when start_date is after end_date", async () => {
    await setup({ transactions: [] });
    const result = await callTool("list_transactions", {
      start_date: "2026-02-01",
      end_date: "2026-01-01",
    });
    expect(result.isError).toBe(true);
    expect(getTextContent(result)).toContain("must be on or before");
  });

  it("should reject malformed date strings", async () => {
    await setup({ transactions: [] });
    const result = await callTool("list_transactions", {
      start_date: "01/15/2026",
    });
    expect(result.isError).toBe(true);
  });
});
