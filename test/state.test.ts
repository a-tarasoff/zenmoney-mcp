import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZenState } from "../src/state.js";
import type { ZenMoneyAPI } from "../src/api.js";
import {
  makeDiffResponse,
  makeTransaction,
  USD,
  EUR,
  CHECKING,
  SAVINGS,
  EURO_CARD,
  ARCHIVED_ACCOUNT,
  FOOD,
  RESTAURANTS,
  SALARY,
  MERCHANT_CAFE,
  COMPANY_BANK,
  USER,
} from "./fixtures.js";

function createApi(resp = makeDiffResponse()) {
  return {
    diff: vi.fn().mockResolvedValue(resp),
    suggest: vi.fn(),
  } as unknown as ZenMoneyAPI;
}

describe("ZenState", () => {
  describe("sync", () => {
    it("should mark state as synced after successful sync", async () => {
      const api = createApi();
      const state = new ZenState(api);
      expect(state.isSynced).toBe(false);

      await state.sync();
      expect(state.isSynced).toBe(true);
    });

    it("should populate all entity arrays from diff response", async () => {
      const api = createApi();
      const state = new ZenState(api);
      await state.sync();

      expect(state.accounts).toHaveLength(4);
      expect(state.tags).toHaveLength(3);
      expect(state.merchants).toHaveLength(1);
      expect(state.instruments).toHaveLength(3);
      expect(state.companies).toHaveLength(1);
      expect(state.users).toHaveLength(1);
    });

    it("should update serverTimestamp", async () => {
      const api = createApi();
      const state = new ZenState(api);
      expect(state.serverTimestamp).toBe(0);

      await state.sync();
      expect(state.serverTimestamp).toBe(1700000000);
    });

    it("should call diff with forceFetch on first sync", async () => {
      const api = createApi();
      const state = new ZenState(api);
      await state.sync();

      expect(api.diff).toHaveBeenCalledWith(
        expect.objectContaining({
          serverTimestamp: 0,
          forceFetch: expect.arrayContaining(["instrument", "account", "transaction"]),
        })
      );
    });

    it("should call diff with forceFetch when forceFull=true", async () => {
      const api = createApi();
      const state = new ZenState(api);

      // First sync
      await state.sync();
      vi.mocked(api.diff).mockResolvedValue(makeDiffResponse({ serverTimestamp: 1700000001 }));

      // Second sync with forceFull
      await state.sync(true);
      expect(api.diff).toHaveBeenLastCalledWith(
        expect.objectContaining({
          serverTimestamp: 0,
          forceFetch: expect.any(Array),
        })
      );
    });

    it("should do incremental sync on subsequent calls", async () => {
      const api = createApi();
      const state = new ZenState(api);
      await state.sync();

      vi.mocked(api.diff).mockResolvedValue(
        makeDiffResponse({ serverTimestamp: 1700000001, account: [], tag: [], instrument: [], merchant: [], company: [], user: [], transaction: [], deletion: [] })
      );
      await state.sync();

      expect(api.diff).toHaveBeenLastCalledWith(
        expect.objectContaining({ serverTimestamp: 1700000000 })
      );
      // Should NOT have forceFetch on incremental sync
      const lastCall = vi.mocked(api.diff).mock.calls[1][0];
      expect(lastCall).not.toHaveProperty("forceFetch");
    });
  });

  describe("mergeEntities", () => {
    it("should update existing entities on incremental sync", async () => {
      const api = createApi();
      const state = new ZenState(api);
      await state.sync();

      const updatedChecking = { ...CHECKING, balance: 9999 };
      vi.mocked(api.diff).mockResolvedValue(
        makeDiffResponse({
          serverTimestamp: 1700000001,
          account: [updatedChecking],
          tag: [],
          instrument: [],
          merchant: [],
          company: [],
          user: [],
          transaction: [],
          deletion: [],
        })
      );
      await state.sync();

      const acc = state.accounts.find((a) => a.id === "acc-checking");
      expect(acc?.balance).toBe(9999);
      // Other accounts still present
      expect(state.accounts).toHaveLength(4);
    });

    it("should add new entities on incremental sync", async () => {
      const api = createApi();
      const state = new ZenState(api);
      await state.sync();

      const newAccount = { ...CHECKING, id: "acc-new", title: "New Account" };
      vi.mocked(api.diff).mockResolvedValue(
        makeDiffResponse({
          serverTimestamp: 1700000001,
          account: [newAccount],
          tag: [],
          instrument: [],
          merchant: [],
          company: [],
          user: [],
          transaction: [],
          deletion: [],
        })
      );
      await state.sync();

      expect(state.accounts).toHaveLength(5);
    });
  });

  describe("mergeTransactions", () => {
    it("should add transactions from sync", async () => {
      const tx = makeTransaction({ id: "tx-1", outcome: 50, date: "2026-03-20" });
      const api = createApi(makeDiffResponse({ transaction: [tx] }));
      const state = new ZenState(api);
      await state.sync();

      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0].id).toBe("tx-1");
    });

    it("should remove deleted transactions", async () => {
      const tx = makeTransaction({ id: "tx-1", outcome: 50 });
      const api = createApi(makeDiffResponse({ transaction: [tx] }));
      const state = new ZenState(api);
      await state.sync();

      const deletedTx = makeTransaction({ id: "tx-1", deleted: true });
      vi.mocked(api.diff).mockResolvedValue(
        makeDiffResponse({
          serverTimestamp: 1700000001,
          transaction: [deletedTx],
          account: [],
          tag: [],
          instrument: [],
          merchant: [],
          company: [],
          user: [],
          deletion: [],
        })
      );
      await state.sync();

      expect(state.transactions).toHaveLength(0);
    });

    it("should update existing transactions", async () => {
      const tx = makeTransaction({ id: "tx-1", outcome: 50, comment: "old" });
      const api = createApi(makeDiffResponse({ transaction: [tx] }));
      const state = new ZenState(api);
      await state.sync();

      const updatedTx = makeTransaction({ id: "tx-1", outcome: 100, comment: "new" });
      vi.mocked(api.diff).mockResolvedValue(
        makeDiffResponse({
          serverTimestamp: 1700000001,
          transaction: [updatedTx],
          account: [],
          tag: [],
          instrument: [],
          merchant: [],
          company: [],
          user: [],
          deletion: [],
        })
      );
      await state.sync();

      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0].outcome).toBe(100);
      expect(state.transactions[0].comment).toBe("new");
    });
  });

  describe("deletion", () => {
    it("should apply deletions from diff response", async () => {
      const api = createApi(
        makeDiffResponse({
          deletion: [{ object: "account", id: "acc-checking", stamp: 1000, user: 1 }],
        })
      );
      const state = new ZenState(api);
      await state.sync();

      expect(state.accounts.find((a) => a.id === "acc-checking")).toBeUndefined();
      expect(state.accounts).toHaveLength(3);
    });

    it("should apply tag deletions", async () => {
      const api = createApi(
        makeDiffResponse({
          deletion: [{ object: "tag", id: "tag-food", stamp: 1000, user: 1 }],
        })
      );
      const state = new ZenState(api);
      await state.sync();

      expect(state.tags.find((t) => t.id === "tag-food")).toBeUndefined();
    });

    it("should apply merchant deletions", async () => {
      const api = createApi(
        makeDiffResponse({
          deletion: [{ object: "merchant", id: "merchant-cafe", stamp: 1000, user: 1 }],
        })
      );
      const state = new ZenState(api);
      await state.sync();

      expect(state.merchants).toHaveLength(0);
    });

    it("should apply transaction deletions", async () => {
      const tx = makeTransaction({ id: "tx-del" });
      const api = createApi(
        makeDiffResponse({
          transaction: [tx],
          deletion: [{ object: "transaction", id: "tx-del", stamp: 1000, user: 1 }],
        })
      );
      const state = new ZenState(api);
      await state.sync();

      expect(state.transactions).toHaveLength(0);
    });
  });

  describe("lookup helpers", () => {
    let state: ZenState;

    beforeEach(async () => {
      const api = createApi();
      state = new ZenState(api);
      await state.sync();
    });

    it("getActiveAccounts should exclude archived", () => {
      const active = state.getActiveAccounts();
      expect(active).toHaveLength(3);
      expect(active.find((a) => a.id === "acc-archived")).toBeUndefined();
    });

    it("getInstrument should find by id", () => {
      expect(state.getInstrument(1)?.shortTitle).toBe("USD");
      expect(state.getInstrument(2)?.shortTitle).toBe("EUR");
      expect(state.getInstrument(999)).toBeUndefined();
    });

    it("getCompany should find by id", () => {
      expect(state.getCompany(1)?.title).toBe("Test Bank");
      expect(state.getCompany(999)).toBeUndefined();
    });

    it("getUser should return primary user (parent=null)", () => {
      const user = state.getUser();
      expect(user?.id).toBe(1);
      expect(user?.parent).toBeNull();
    });

    it("findAccountByName should do case-insensitive partial match", () => {
      expect(state.findAccountByName("check")?.id).toBe("acc-checking");
      expect(state.findAccountByName("CHECK")?.id).toBe("acc-checking");
      expect(state.findAccountByName("euro")?.id).toBe("acc-euro");
      expect(state.findAccountByName("nonexistent")).toBeUndefined();
    });

    it("findTagByName should do case-insensitive partial match", () => {
      expect(state.findTagByName("food")?.id).toBe("tag-food");
      expect(state.findTagByName("FOOD")?.id).toBe("tag-food");
      expect(state.findTagByName("restaur")?.id).toBe("tag-restaurants");
      expect(state.findTagByName("nonexistent")).toBeUndefined();
    });

    it("findMerchantByName should do case-insensitive partial match", () => {
      expect(state.findMerchantByName("corner")?.id).toBe("merchant-cafe");
      expect(state.findMerchantByName("CAFE")?.id).toBe("merchant-cafe");
      expect(state.findMerchantByName("nonexistent")).toBeUndefined();
    });

    it("getTagHierarchy should group parent and children", () => {
      const hierarchy = state.getTagHierarchy();
      const foodGroup = hierarchy.find((h) => h.parent.id === "tag-food");
      expect(foodGroup).toBeDefined();
      expect(foodGroup!.children).toHaveLength(1);
      expect(foodGroup!.children[0].id).toBe("tag-restaurants");

      const salaryGroup = hierarchy.find((h) => h.parent.id === "tag-salary");
      expect(salaryGroup).toBeDefined();
      expect(salaryGroup!.children).toHaveLength(0);
    });
  });
});
