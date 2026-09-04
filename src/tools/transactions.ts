import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Account, Tag, Transaction, ZenMoneyAPI } from "../api.js";
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
    "List transactions. By default returns the last 30 days; pass start_date/end_date for an arbitrary period (e.g. Jan 1–31). Sync must be done first.",
    {
      days: z
        .number()
        .optional()
        .default(30)
        .describe("Number of days to look back from today (default 30). Ignored if start_date or end_date is provided."),
      start_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
        .optional()
        .describe("Start of date range (inclusive), YYYY-MM-DD. If omitted while end_date is set, defaults to unbounded."),
      end_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
        .optional()
        .describe("End of date range (inclusive), YYYY-MM-DD. If omitted while start_date is set, defaults to today."),
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
    async ({ days, start_date, end_date, account, category, limit }) => {
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

      let lowerBound: string;
      let upperBound: string | null;

      if (start_date || end_date) {
        lowerBound = start_date ?? "0000-01-01";
        upperBound = end_date ?? new Date().toISOString().slice(0, 10);
        if (start_date && end_date && start_date > end_date) {
          return {
            content: [
              {
                type: "text" as const,
                text: `start_date (${start_date}) must be on or before end_date (${end_date}).`,
              },
            ],
            isError: true,
          };
        }
      } else {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        lowerBound = cutoff.toISOString().slice(0, 10);
        upperBound = null;
      }

      let filtered = state.transactions.filter(
        (t) => t.date >= lowerBound && (upperBound === null || t.date <= upperBound)
      );

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

      const lines = filtered.map((t) => formatTransactionLine(state, t));

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

  server.tool(
    "update_transaction",
    "Change an existing transaction: its category, amount, date, payee, comment or account. Only the fields you pass are touched. Pass a single id or a list of ids to apply the same change to several transactions at once (handy for recategorizing). Ids come from list_transactions. Sync must be done first.",
    {
      id: z
        .union([z.string(), z.array(z.string())])
        .describe("Transaction UUID, or a list of UUIDs to update together"),
      category: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe(
          "New category name or UUID (or several). Pass an empty string or an empty array to remove the category."
        ),
      amount: z
        .number()
        .positive()
        .optional()
        .describe(
          "New amount for an expense or income. For transfers use outcome_amount/income_amount instead."
        ),
      outcome_amount: z
        .number()
        .nonnegative()
        .optional()
        .describe("New amount debited from the source account"),
      income_amount: z
        .number()
        .nonnegative()
        .optional()
        .describe("New amount credited to the destination account"),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
        .optional()
        .describe("New transaction date in YYYY-MM-DD format"),
      payee: z
        .string()
        .optional()
        .describe(
          "New payee. Pass an empty string to clear it. The linked merchant is re-matched to the new payee."
        ),
      comment: z
        .string()
        .optional()
        .describe("New comment. Pass an empty string to clear it."),
      account: z
        .string()
        .optional()
        .describe(
          "Move the transaction to another account (name or UUID). Not valid for transfers — use from_account/to_account there."
        ),
      from_account: z
        .string()
        .optional()
        .describe("New source account of a transfer (name or UUID)"),
      to_account: z
        .string()
        .optional()
        .describe("New destination account of a transfer (name or UUID)"),
    },
    async ({
      id,
      category,
      amount,
      outcome_amount,
      income_amount,
      date,
      payee,
      comment,
      account,
      from_account,
      to_account,
    }) => {
      if (!state.isSynced) {
        return toolError("Data not synced yet. Please run sync_data first.");
      }

      const ids = Array.from(
        new Set((Array.isArray(id) ? id : [id]).map((v) => v.trim()))
      ).filter((v) => v !== "");
      if (ids.length === 0) {
        return toolError("No transaction id given.");
      }

      const touchesNothing =
        category === undefined &&
        amount === undefined &&
        outcome_amount === undefined &&
        income_amount === undefined &&
        date === undefined &&
        payee === undefined &&
        comment === undefined &&
        account === undefined &&
        from_account === undefined &&
        to_account === undefined;
      if (touchesNothing) {
        return toolError(
          "Nothing to update. Pass at least one of: category, amount, outcome_amount, income_amount, date, payee, comment, account, from_account, to_account."
        );
      }

      if (
        account !== undefined &&
        (from_account !== undefined || to_account !== undefined)
      ) {
        return toolError(
          "Use either 'account' (for a regular transaction) or 'from_account'/'to_account' (for a transfer), not both."
        );
      }

      if (
        amount !== undefined &&
        (outcome_amount !== undefined || income_amount !== undefined)
      ) {
        return toolError(
          "Use either 'amount' or 'outcome_amount'/'income_amount', not both."
        );
      }

      const user = state.getUser();
      if (!user) {
        return toolError("User not found. Run sync_data first.");
      }

      let tagIds: string[] | null | undefined;
      if (category !== undefined) {
        const wanted = (Array.isArray(category) ? category : [category])
          .map((c) => c.trim())
          .filter((c) => c !== "");
        if (wanted.length === 0) {
          tagIds = null;
        } else {
          const resolved: string[] = [];
          for (const name of wanted) {
            const match = resolveTagStrict(state, name);
            if ("error" in match) return toolError(match.error);
            resolved.push(match.tag.id);
          }
          tagIds = resolved;
        }
      }

      let bothAccount: Account | undefined;
      if (account !== undefined) {
        const acc = resolveAccount(state, account);
        if (!acc) return toolError(accountNotFound(account));
        bothAccount = acc;
      }

      let sourceAccount: Account | undefined;
      if (from_account !== undefined) {
        const acc = resolveAccount(state, from_account);
        if (!acc) return toolError(accountNotFound(from_account));
        sourceAccount = acc;
      }

      let targetAccount: Account | undefined;
      if (to_account !== undefined) {
        const acc = resolveAccount(state, to_account);
        if (!acc) return toolError(accountNotFound(to_account));
        targetAccount = acc;
      }

      const originals: Transaction[] = [];
      const missing: string[] = [];
      for (const txId of ids) {
        const tx = state.findTransaction(txId);
        if (tx) originals.push(tx);
        else missing.push(txId);
      }
      if (missing.length > 0) {
        return toolError(
          `Transaction${missing.length > 1 ? "s" : ""} not found: ${missing.join(", ")}. Use list_transactions to find ids, or run sync_data if the transaction was added elsewhere.`
        );
      }

      const now = Math.floor(Date.now() / 1000);
      const updates: Transaction[] = [];

      for (const tx of originals) {
        const next: Transaction = { ...tx, changed: now };
        const wasTransfer = tx.incomeAccount !== tx.outcomeAccount;

        if (tagIds !== undefined) next.tag = tagIds;
        if (date !== undefined) next.date = date;
        if (comment !== undefined) next.comment = comment === "" ? null : comment;
        if (payee !== undefined) {
          next.payee = payee === "" ? null : payee;
          const merchant = next.payee
            ? state.merchants.find(
                (m) => m.title.toLowerCase() === next.payee!.toLowerCase()
              )
            : undefined;
          next.merchant = merchant?.id ?? null;
        }

        if (bothAccount) {
          if (wasTransfer) {
            return toolError(
              `Transaction ${tx.id} is a transfer — use from_account/to_account instead of account.`
            );
          }
          const instrument = bothAccount.instrument ?? user.currency ?? 1;
          next.incomeAccount = bothAccount.id;
          next.outcomeAccount = bothAccount.id;
          next.incomeInstrument = instrument;
          next.outcomeInstrument = instrument;
        }
        if (sourceAccount) {
          next.outcomeAccount = sourceAccount.id;
          next.outcomeInstrument = sourceAccount.instrument ?? user.currency ?? 1;
        }
        if (targetAccount) {
          next.incomeAccount = targetAccount.id;
          next.incomeInstrument = targetAccount.instrument ?? user.currency ?? 1;
        }

        if (amount !== undefined) {
          if (next.incomeAccount !== next.outcomeAccount) {
            return toolError(
              `Transaction ${tx.id} is a transfer — use outcome_amount and/or income_amount instead of amount.`
            );
          }
          if (tx.outcome > 0 && tx.income === 0) {
            next.outcome = amount;
          } else if (tx.income > 0 && tx.outcome === 0) {
            next.income = amount;
          } else {
            return toolError(
              `Cannot tell whether ${amount} is an expense or an income for transaction ${tx.id}. Pass outcome_amount or income_amount instead.`
            );
          }
        }
        if (outcome_amount !== undefined) next.outcome = outcome_amount;
        if (income_amount !== undefined) next.income = income_amount;

        if (
          next.incomeAccount !== next.outcomeAccount &&
          (next.income <= 0 || next.outcome <= 0)
        ) {
          return toolError(
            `Transaction ${tx.id} would be a transfer between two accounts with a zero amount on one side. Pass both outcome_amount and income_amount.`
          );
        }

        updates.push(next);
      }

      try {
        const resp = await api.diff({
          currentClientTimestamp: now,
          serverTimestamp: state.serverTimestamp,
          transaction: updates,
        });

        state.serverTimestamp = resp.serverTimestamp;
        for (const next of updates) state.upsertTransaction(next);

        const blocks = updates.map((next, i) => {
          const changes = describeChanges(state, originals[i], next);
          const detail =
            changes.length > 0
              ? changes.map((c) => `    ${c}`).join("\n")
              : "    (no field actually changed)";
          return `- ${formatTransactionLine(state, next)}\n${detail}`;
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `${updates.length === 1 ? "Transaction updated" : `${updates.length} transactions updated`}:\n\n${blocks.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        return toolError(
          `Failed to update transaction${updates.length > 1 ? "s" : ""}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
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

function accountNotFound(nameOrId: string): string {
  return `Account "${nameOrId}" not found. Use list_accounts to see available accounts.`;
}

function toolError(text: string) {
  return {
    content: [{ type: "text" as const, text }],
    isError: true,
  };
}

/**
 * Stricter than findTagByName: an exact title wins over a substring match, and
 * an ambiguous name is reported instead of silently resolving to the first hit.
 * Picking the wrong category matters more when overwriting an existing one.
 */
function resolveTagStrict(
  state: ZenState,
  nameOrId: string
): { tag: Tag } | { error: string } {
  const byId = state.tags.find((t) => t.id === nameOrId);
  if (byId) return { tag: byId };

  const lower = nameOrId.trim().toLowerCase();
  const exact = state.tags.filter((t) => t.title.toLowerCase() === lower);
  if (exact.length === 1) return { tag: exact[0] };
  if (exact.length > 1) return { error: ambiguousTag(nameOrId, exact) };

  const partial = state.tags.filter((t) =>
    t.title.toLowerCase().includes(lower)
  );
  if (partial.length === 1) return { tag: partial[0] };
  if (partial.length > 1) return { error: ambiguousTag(nameOrId, partial) };

  return {
    error: `Category "${nameOrId}" not found. Use list_categories to see available categories.`,
  };
}

function ambiguousTag(input: string, matches: Tag[]): string {
  const list = matches.map((t) => `${t.title} (${t.id})`).join(", ");
  return `Category "${input}" is ambiguous — it matches: ${list}. Use the exact title or the category id.`;
}

function tagTitles(state: ZenState, ids: string[] | null): string {
  if (!ids || ids.length === 0) return "none";
  return ids
    .map((id) => state.tags.find((t) => t.id === id)?.title ?? id)
    .join(", ");
}

function accountTitle(state: ZenState, id: string): string {
  return state.accounts.find((a) => a.id === id)?.title ?? id;
}

function currencyOf(state: ZenState, instrument: number): string {
  return state.getInstrument(instrument)?.shortTitle ?? "";
}

function formatTransactionLine(state: ZenState, t: Transaction): string {
  const isExpense = t.outcome > 0 && t.income === 0;
  const isIncome = t.income > 0 && t.outcome === 0;
  const isTransfer = t.incomeAccount !== t.outcomeAccount;

  let type = "other";
  let amountStr = "";

  if (isTransfer) {
    const from = accountTitle(state, t.outcomeAccount);
    const to = accountTitle(state, t.incomeAccount);
    type = "transfer";
    if (t.outcomeInstrument !== t.incomeInstrument) {
      amountStr = `${t.outcome} ${currencyOf(state, t.outcomeInstrument)} → ${t.income} ${currencyOf(state, t.incomeInstrument)} (${from} → ${to})`;
    } else {
      amountStr = `${t.outcome} (${from} → ${to})`;
    }
  } else if (isExpense) {
    type = "expense";
    amountStr = `-${t.outcome} ${currencyOf(state, t.outcomeInstrument)}`;
  } else if (isIncome) {
    type = "income";
    amountStr = `+${t.income} ${currencyOf(state, t.incomeInstrument)}`;
  }

  const cats = t.tag
    ? t.tag.map((id) => state.tags.find((tg) => tg.id === id)?.title ?? id).join(", ")
    : "";
  const payeeStr = t.payee ?? "";
  const commentStr = t.comment ? ` — "${t.comment}"` : "";

  return `${t.date} | ${type.padEnd(8)} | ${amountStr.padEnd(20)} | ${cats.padEnd(15)} | ${payeeStr}${commentStr} | id: ${t.id}`;
}

function describeChanges(
  state: ZenState,
  before: Transaction,
  after: Transaction
): string[] {
  const lines: string[] = [];

  const catsBefore = tagTitles(state, before.tag);
  const catsAfter = tagTitles(state, after.tag);
  if (catsBefore !== catsAfter) {
    lines.push(`category: ${catsBefore} → ${catsAfter}`);
  }

  if (before.date !== after.date) {
    lines.push(`date: ${before.date} → ${after.date}`);
  }

  const wasSingleAccount = before.incomeAccount === before.outcomeAccount;
  const isSingleAccount = after.incomeAccount === after.outcomeAccount;
  if (wasSingleAccount && isSingleAccount) {
    if (before.outcomeAccount !== after.outcomeAccount) {
      lines.push(
        `account: ${accountTitle(state, before.outcomeAccount)} → ${accountTitle(state, after.outcomeAccount)}`
      );
    }
  } else {
    if (before.outcomeAccount !== after.outcomeAccount) {
      lines.push(
        `from account: ${accountTitle(state, before.outcomeAccount)} → ${accountTitle(state, after.outcomeAccount)}`
      );
    }
    if (before.incomeAccount !== after.incomeAccount) {
      lines.push(
        `to account: ${accountTitle(state, before.incomeAccount)} → ${accountTitle(state, after.incomeAccount)}`
      );
    }
  }

  if (
    before.outcome !== after.outcome ||
    before.outcomeInstrument !== after.outcomeInstrument
  ) {
    lines.push(
      `outcome: ${before.outcome} ${currencyOf(state, before.outcomeInstrument)} → ${after.outcome} ${currencyOf(state, after.outcomeInstrument)}`
    );
  }
  if (
    before.income !== after.income ||
    before.incomeInstrument !== after.incomeInstrument
  ) {
    lines.push(
      `income: ${before.income} ${currencyOf(state, before.incomeInstrument)} → ${after.income} ${currencyOf(state, after.incomeInstrument)}`
    );
  }

  if (before.payee !== after.payee) {
    lines.push(`payee: ${before.payee ?? "none"} → ${after.payee ?? "none"}`);
  }
  if (before.comment !== after.comment) {
    lines.push(`comment: ${before.comment ?? "none"} → ${after.comment ?? "none"}`);
  }

  return lines;
}
