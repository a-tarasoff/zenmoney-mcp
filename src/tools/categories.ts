import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZenState } from "../state.js";

export function registerCategoryTools(server: McpServer, state: ZenState) {
  server.tool(
    "list_categories",
    "List all expense/income categories (tags) with their hierarchy. Sync must be done first.",
    {},
    async () => {
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

      const hierarchy = state.getTagHierarchy();
      const lines: string[] = [];

      for (const { parent, children } of hierarchy) {
        const flags: string[] = [];
        if (parent.showOutcome) flags.push("expense");
        if (parent.showIncome) flags.push("income");
        lines.push(
          `- **${parent.title}** (${flags.join(", ")}) — id: \`${parent.id}\``
        );
        for (const child of children) {
          lines.push(`  - ${child.title} — id: \`${child.id}\``);
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text:
              lines.length > 0
                ? `Categories (${state.tags.length}):\n\n${lines.join("\n")}`
                : "No categories found.",
          },
        ],
      };
    }
  );

  server.tool(
    "list_merchants",
    "List known merchants/payees. Sync must be done first.",
    {},
    async () => {
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

      const lines = state.merchants.map(
        (m) => `- **${m.title}** — id: \`${m.id}\``
      );

      return {
        content: [
          {
            type: "text" as const,
            text:
              lines.length > 0
                ? `Merchants (${lines.length}):\n\n${lines.join("\n")}`
                : "No merchants found.",
          },
        ],
      };
    }
  );
}
