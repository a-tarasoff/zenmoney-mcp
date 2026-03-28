import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZenMoneyAPI } from "../api.js";
import type { ZenState } from "../state.js";

export function registerSuggestTools(
  server: McpServer,
  api: ZenMoneyAPI,
  state: ZenState
) {
  server.tool(
    "suggest_category",
    "Get ZenMoney's auto-suggestion for category and merchant based on a payee name. Useful for categorizing receipts.",
    {
      payee: z.string().describe("The payee/merchant name from the receipt"),
    },
    async ({ payee }) => {
      try {
        const results = await api.suggest([{ payee }]);
        const suggestion = results[0];

        if (!suggestion) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No suggestions found for "${payee}".`,
              },
            ],
          };
        }

        const parts: string[] = [`Suggestions for "${payee}":`];

        if (suggestion.tag && suggestion.tag.length > 0) {
          const tagNames = suggestion.tag
            .map((tagId) => {
              const tag = state.tags.find((t) => t.id === tagId);
              return tag ? `${tag.title} (\`${tag.id}\`)` : `\`${tagId}\``;
            })
            .join(", ");
          parts.push(`- Category: ${tagNames}`);
        }

        if (suggestion.merchant) {
          const merchant = state.merchants.find(
            (m) => m.id === suggestion.merchant
          );
          const name = merchant ? merchant.title : suggestion.merchant;
          parts.push(`- Merchant: ${name}`);
        }

        if (suggestion.payee) {
          parts.push(`- Normalized payee: ${suggestion.payee}`);
        }

        return {
          content: [{ type: "text" as const, text: parts.join("\n") }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Suggest failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
