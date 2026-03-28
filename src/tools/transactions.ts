import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZenMoneyAPI } from "../api.js";
import type { ZenState } from "../state.js";

export function registerTransactionTools(
  server: McpServer,
  api: ZenMoneyAPI,
  state: ZenState
) {
  server.tool(
    "add_expense",
    "Add an expense transaction to ZenMoney. Requires account name/id, amount, and date. Optionally accepts category, payee, and comment.",
    {
      account: z
        .string()
        .describe("Account name or UUID to deduct from"),
      amount: z.number().positive().describe("Expense amount (positive number)"),
      date: z
        .string()
        .describe("Transaction date in YYYY-MM-DD format"),
      category: z
        .string()
        .optional()
        .describe("Category name or UUID"),
      payee: z.string().optional().describe("Payee/merchant name"),
      comment: z.string().optional().describe("Transaction comment"),
    },
    async ({ account, amount, date, category, payee, comment }) => {
      if (!state.isSynced) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Data not synced yet. Please run sync_data first.",
            },
          ],
          isError: true,
        };
      }

      const acc = resolveAccount(state, account);
      if (!acc) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Account "${account}" not found. Use list_accounts to see available accounts.`,
            },
          ],
          isError: true,
        };
      }

      const instrumentId = acc.instrument ?? state.getUser()?.currency ?? 1;
      const user = state.getUser();
      if (!user) {
        return {
          content: [
            { type: "text" as const, text: "User not found. Run sync_data first." },
          ],
          isError: true,
        };
      }

      const tagIds = category ? resolveTag(state, category) : null;
      const now = Math.floor(Date.now() / 1000);

      const transaction = {
        id: randomUUID(),
        changed: now,
        created: now,
        user: user.id,
        deleted: false,
        hold: null,
        viewed: false,
        incomeInstrument: instrumentId,
        incomeAccount: acc.id,
        income: 0,
        incomeBankID: null as string | null,
        outcomeInstrument: instrumentId,
        outcomeAccount: acc.id,
        outcome: amount,
        outcomeBankID: null as string | null,
        opIncome: null as number | null,
        opIncomeInstrument: null as number | null,
        opOutcome: null as number | null,
        opOutcomeInstrument: null as number | null,
        tag: tagIds,
        merchant: null as string | null,
        payee: payee ?? null,
        originalPayee: null,
        comment: comment ?? null,
        date,
        mcc: null,
        latitude: null,
        longitude: null,
        reminderMarker: null,
        qrCode: null,
      };

      try {
        const resp = await api.diff({
          currentClientTimestamp: now,
          serverTimestamp: state.serverTimestamp,
          transaction: [transaction],
        });

        state.serverTimestamp = resp.serverTimestamp;
        state.transactions.push(transaction);

        const instr = state.getInstrument(instrumentId);
        const currency = instr?.shortTitle ?? "";
        const catName = tagIds
          ? tagIds
              .map((id) => state.tags.find((t) => t.id === id)?.title ?? id)
              .join(", ")
          : "uncategorized";

        return {
          content: [
            {
              type: "text" as const,
              text: `Expense added:\n- Amount: ${amount} ${currency}\n- Account: ${acc.title}\n- Date: ${date}\n- Category: ${catName}${payee ? `\n- Payee: ${payee}` : ""}${comment ? `\n- Comment: ${comment}` : ""}\n- ID: ${transaction.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to add expense: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "add_income",
    "Add an income transaction to ZenMoney.",
    {
      account: z.string().describe("Account name or UUID to credit"),
      amount: z.number().positive().describe("Income amount (positive number)"),
      date: z.string().describe("Transaction date in YYYY-MM-DD format"),
      category: z.string().optional().describe("Category name or UUID"),
      payee: z.string().optional().describe("Payer name"),
      comment: z.string().optional().describe("Transaction comment"),
    },
    async ({ account, amount, date, category, payee, comment }) => {
      if (!state.isSynced) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Data not synced yet. Please run sync_data first.",
            },
          ],
          isError: true,
        };
      }

      const acc = resolveAccount(state, account);
      if (!acc) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Account "${account}" not found. Use list_accounts to see available accounts.`,
            },
          ],
          isError: true,
        };
      }

      const instrumentId = acc.instrument ?? state.getUser()?.currency ?? 1;
      const user = state.getUser();
      if (!user) {
        return {
          content: [
            { type: "text" as const, text: "User not found. Run sync_data first." },
          ],
          isError: true,
        };
      }

      const tagIds = category ? resolveTag(state, category) : null;
      const now = Math.floor(Date.now() / 1000);

      const transaction = {
        id: randomUUID(),
        changed: now,
        created: now,
        user: user.id,
        deleted: false,
        hold: null,
        viewed: false,
        incomeInstrument: instrumentId,
        incomeAccount: acc.id,
        income: amount,
        incomeBankID: null as string | null,
        outcomeInstrument: instrumentId,
        outcomeAccount: acc.id,
        outcome: 0,
        outcomeBankID: null as string | null,
        opIncome: null as number | null,
        opIncomeInstrument: null as number | null,
        opOutcome: null as number | null,
        opOutcomeInstrument: null as number | null,
        tag: tagIds,
        merchant: null as string | null,
        payee: payee ?? null,
        originalPayee: null,
        comment: comment ?? null,
        date,
        mcc: null,
        latitude: null,
        longitude: null,
        reminderMarker: null,
        qrCode: null,
      };

      try {
        const resp = await api.diff({
          currentClientTimestamp: now,
          serverTimestamp: state.serverTimestamp,
          transaction: [transaction],
        });

        state.serverTimestamp = resp.serverTimestamp;
        state.transactions.push(transaction);

        const instr = state.getInstrument(instrumentId);
        const currency = instr?.shortTitle ?? "";

        return {
          content: [
            {
              type: "text" as const,
              text: `Income added:\n- Amount: ${amount} ${currency}\n- Account: ${acc.title}\n- Date: ${date}\n- ID: ${transaction.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to add income: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "add_transfer",
    "Transfer money between two accounts in ZenMoney. For cross-currency transfers, specify both outcome_amount (source) and income_amount (destination). For same-currency transfers, just use outcome_amount (or amount as alias).",
    {
      from_account: z.string().describe("Source account name or UUID"),
      to_account: z.string().describe("Destination account name or UUID"),
      amount: z.number().positive().optional().describe("Transfer amount (alias for outcome_amount, for same-currency transfers)"),
      outcome_amount: z.number().positive().optional().describe("Amount debited from source account (in source account currency)"),
      income_amount: z.number().positive().optional().describe("Amount credited to destination account (in destination account currency). Required for cross-currency transfers."),
      date: z.string().describe("Transaction date in YYYY-MM-DD format"),
      comment: z.string().optional().describe("Transfer comment"),
    },
    async ({ from_account, to_account, amount, outcome_amount, income_amount, date, comment }) => {
      if (!state.isSynced) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Data not synced yet. Please run sync_data first.",
            },
          ],
          isError: true,
        };
      }

      const fromAcc = resolveAccount(state, from_account);
      const toAcc = resolveAccount(state, to_account);

      if (!fromAcc) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Source account "${from_account}" not found.`,
            },
          ],
          isError: true,
        };
      }
      if (!toAcc) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Destination account "${to_account}" not found.`,
            },
          ],
          isError: true,
        };
      }

      const user = state.getUser();
      if (!user) {
        return {
          content: [
            { type: "text" as const, text: "User not found. Run sync_data first." },
          ],
          isError: true,
        };
      }

      const resolvedOutcome = outcome_amount ?? amount;
      if (!resolvedOutcome) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Either 'amount' or 'outcome_amount' must be provided.",
            },
          ],
          isError: true,
        };
      }

      const outcomeInstrument =
        fromAcc.instrument ?? user.currency ?? 1;
      const incomeInstrument =
        toAcc.instrument ?? user.currency ?? 1;
      const isCrossCurrency = outcomeInstrument !== incomeInstrument;

      if (isCrossCurrency && !income_amount) {
        const fromInstr = state.getInstrument(outcomeInstrument);
        const toInstr = state.getInstrument(incomeInstrument);
        return {
          content: [
            {
              type: "text" as const,
              text: `Cross-currency transfer: source account is ${fromInstr?.shortTitle ?? "?"} and destination is ${toInstr?.shortTitle ?? "?"}. Please provide income_amount (the amount in ${toInstr?.shortTitle ?? "destination currency"}).`,
            },
          ],
          isError: true,
        };
      }

      const resolvedIncome = income_amount ?? resolvedOutcome;
      const now = Math.floor(Date.now() / 1000);

      const transaction = {
        id: randomUUID(),
        changed: now,
        created: now,
        user: user.id,
        deleted: false,
        hold: null,
        viewed: false,
        incomeInstrument,
        incomeAccount: toAcc.id,
        income: resolvedIncome,
        incomeBankID: null as string | null,
        outcomeInstrument,
        outcomeAccount: fromAcc.id,
        outcome: resolvedOutcome,
        outcomeBankID: null as string | null,
        opIncome: null as number | null,
        opIncomeInstrument: null as number | null,
        opOutcome: null as number | null,
        opOutcomeInstrument: null as number | null,
        tag: null as string[] | null,
        merchant: null as string | null,
        payee: null as string | null,
        originalPayee: null,
        comment: comment ?? null,
        date,
        mcc: null,
        latitude: null,
        longitude: null,
        reminderMarker: null,
        qrCode: null,
      };

      try {
        const resp = await api.diff({
          currentClientTimestamp: now,
          serverTimestamp: state.serverTimestamp,
          transaction: [transaction],
        });

        state.serverTimestamp = resp.serverTimestamp;
        state.transactions.push(transaction);

        const fromInstr = state.getInstrument(outcomeInstrument);
        const toInstr = state.getInstrument(incomeInstrument);
        const amountLine = isCrossCurrency
          ? `- From amount: ${resolvedOutcome} ${fromInstr?.shortTitle ?? ""}\n- To amount: ${resolvedIncome} ${toInstr?.shortTitle ?? ""}`
          : `- Amount: ${resolvedOutcome} ${fromInstr?.shortTitle ?? ""}`;

        return {
          content: [
            {
              type: "text" as const,
              text: `Transfer added:\n- From: ${fromAcc.title}\n- To: ${toAcc.title}\n${amountLine}\n- Date: ${date}\n- ID: ${transaction.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to add transfer: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "list_transactions",
    "List recent transactions. Sync must be done first.",
    {
      days: z
        .number()
        .optional()
        .default(30)
        .describe("Number of days to look back (default 30)"),
      account: z
        .string()
        .optional()
        .describe("Filter by account name or UUID"),
      category: z
        .string()
        .optional()
        .describe("Filter by category name or UUID"),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe("Max number of transactions to return (default 50)"),
    },
    async ({ days, account, category, limit }) => {
      if (!state.isSynced) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Data not synced yet. Please run sync_data first.",
            },
          ],
          isError: true,
        };
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().slice(0, 10);

      let filtered = state.transactions.filter((t) => t.date >= cutoffStr);

      if (account) {
        const acc = resolveAccount(state, account);
        if (acc) {
          filtered = filtered.filter(
            (t) =>
              t.incomeAccount === acc.id || t.outcomeAccount === acc.id
          );
        }
      }

      if (category) {
        const tag = state.findTagByName(category);
        const tagId = tag?.id ?? category;
        filtered = filtered.filter(
          (t) => t.tag && t.tag.includes(tagId)
        );
      }

      filtered.sort((a, b) => (b.date > a.date ? 1 : -1));
      filtered = filtered.slice(0, limit);

      const lines = filtered.map((t) => {
        const isExpense = t.outcome > 0 && t.income === 0;
        const isIncome = t.income > 0 && t.outcome === 0;
        const isTransfer =
          t.incomeAccount !== t.outcomeAccount;

        let type = "other";
        let amountStr = "";

        if (isTransfer) {
          const from = state.accounts.find(
            (a) => a.id === t.outcomeAccount
          );
          const to = state.accounts.find(
            (a) => a.id === t.incomeAccount
          );
          type = "transfer";
          if (t.outcomeInstrument !== t.incomeInstrument) {
            const fromInstr = state.getInstrument(t.outcomeInstrument);
            const toInstr = state.getInstrument(t.incomeInstrument);
            amountStr = `${t.outcome} ${fromInstr?.shortTitle ?? ""} → ${t.income} ${toInstr?.shortTitle ?? ""} (${from?.title ?? "?"} → ${to?.title ?? "?"})`;
          } else {
            amountStr = `${t.outcome} (${from?.title ?? "?"} → ${to?.title ?? "?"})`;
          }
        } else if (isExpense) {
          const instr = state.getInstrument(t.outcomeInstrument);
          type = "expense";
          amountStr = `-${t.outcome} ${instr?.shortTitle ?? ""}`;
        } else if (isIncome) {
          const instr = state.getInstrument(t.incomeInstrument);
          type = "income";
          amountStr = `+${t.income} ${instr?.shortTitle ?? ""}`;
        }

        const cats = t.tag
          ? t.tag
              .map(
                (id) => state.tags.find((tg) => tg.id === id)?.title ?? id
              )
              .join(", ")
          : "";

        const payeeStr = t.payee ?? "";
        const commentStr = t.comment ? ` — "${t.comment}"` : "";

        return `${t.date} | ${type.padEnd(8)} | ${amountStr.padEnd(20)} | ${cats.padEnd(15)} | ${payeeStr}${commentStr}`;
      });

      return {
        content: [
          {
            type: "text" as const,
            text:
              lines.length > 0
                ? `Transactions (${lines.length}):\n\n${lines.join("\n")}`
                : "No transactions found in the given period.",
          },
        ],
      };
    }
  );
}

function resolveAccount(state: ZenState, nameOrId: string) {
  const direct = state.accounts.find((a) => a.id === nameOrId);
  if (direct) return direct;
  return state.findAccountByName(nameOrId);
}

function resolveTag(state: ZenState, nameOrId: string): string[] | null {
  const direct = state.tags.find((t) => t.id === nameOrId);
  if (direct) return [direct.id];
  const byName = state.findTagByName(nameOrId);
  if (byName) return [byName.id];
  return null;
}
