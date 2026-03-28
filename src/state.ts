import {
  ZenMoneyAPI,
  type Account,
  type Tag,
  type Merchant,
  type Company,
  type Instrument,
  type Transaction,
  type User,
  type DiffResponse,
} from "./api.js";

export class ZenState {
  private api: ZenMoneyAPI;
  serverTimestamp = 0;
  accounts: Account[] = [];
  tags: Tag[] = [];
  merchants: Merchant[] = [];
  companies: Company[] = [];
  instruments: Instrument[] = [];
  transactions: Transaction[] = [];
  users: User[] = [];
  private synced = false;

  constructor(api: ZenMoneyAPI) {
    this.api = api;
  }

  get isSynced(): boolean {
    return this.synced;
  }

  async sync(forceFull = false): Promise<DiffResponse> {
    const timestamp = forceFull ? 0 : this.serverTimestamp;

    const req: any = {
      currentClientTimestamp: Math.floor(Date.now() / 1000),
      serverTimestamp: timestamp,
    };

    if (timestamp === 0) {
      req.forceFetch = [
        "instrument",
        "company",
        "account",
        "tag",
        "merchant",
        "transaction",
        "user",
      ];
    }

    const resp = await this.api.diff(req);
    this.applyDiff(resp);
    this.synced = true;
    return resp;
  }

  private applyDiff(resp: DiffResponse): void {
    this.serverTimestamp = resp.serverTimestamp;
    this.mergeEntities("instruments", resp.instrument, (e) => e.id);
    this.mergeEntities("accounts", resp.account, (e) => e.id);
    this.mergeEntities("tags", resp.tag, (e) => e.id);
    this.mergeEntities("merchants", resp.merchant, (e) => e.id);
    this.mergeEntities("companies", resp.company, (e) => e.id);
    this.mergeEntities("users", resp.user, (e) => e.id);
    this.mergeTransactions(resp.transaction);

    if (resp.deletion) {
      for (const del of resp.deletion) {
        this.applyDeletion(del.object, del.id);
      }
    }
  }

  private mergeEntities<T>(
    field: keyof this,
    incoming: T[],
    getId: (e: T) => string | number
  ): void {
    if (!incoming || incoming.length === 0) return;

    const arr = this[field] as T[];
    const map = new Map<string | number, T>();
    for (const item of arr) {
      map.set(getId(item), item);
    }
    for (const item of incoming) {
      map.set(getId(item), item);
    }
    (this[field] as T[]) = Array.from(map.values());
  }

  private mergeTransactions(incoming: Transaction[]): void {
    if (!incoming || incoming.length === 0) return;

    const map = new Map<string, Transaction>();
    for (const t of this.transactions) {
      map.set(t.id, t);
    }
    for (const t of incoming) {
      if (t.deleted) {
        map.delete(t.id);
      } else {
        map.set(t.id, t);
      }
    }
    this.transactions = Array.from(map.values());
  }

  private applyDeletion(objectType: string, id: string): void {
    switch (objectType) {
      case "transaction":
        this.transactions = this.transactions.filter((t) => t.id !== id);
        break;
      case "account":
        this.accounts = this.accounts.filter((a) => a.id !== id);
        break;
      case "tag":
        this.tags = this.tags.filter((t) => t.id !== id);
        break;
      case "merchant":
        this.merchants = this.merchants.filter((m) => m.id !== id);
        break;
    }
  }

  getActiveAccounts(): Account[] {
    return this.accounts.filter((a) => !a.archive);
  }

  getInstrument(id: number): Instrument | undefined {
    return this.instruments.find((i) => i.id === id);
  }

  getCompany(id: number): Company | undefined {
    return this.companies.find((c) => c.id === id);
  }

  getUser(): User | undefined {
    return this.users.find((u) => u.parent === null) ?? this.users[0];
  }

  findAccountByName(name: string): Account | undefined {
    const lower = name.toLowerCase();
    return this.accounts.find(
      (a) => a.title.toLowerCase().includes(lower)
    );
  }

  findTagByName(name: string): Tag | undefined {
    const lower = name.toLowerCase();
    return this.tags.find(
      (t) => t.title.toLowerCase().includes(lower)
    );
  }

  findMerchantByName(name: string): Merchant | undefined {
    const lower = name.toLowerCase();
    return this.merchants.find(
      (m) => m.title.toLowerCase().includes(lower)
    );
  }

  getTagHierarchy(): { parent: Tag; children: Tag[] }[] {
    const parentTags = this.tags.filter((t) => !t.parent);
    return parentTags.map((parent) => ({
      parent,
      children: this.tags.filter((t) => t.parent === parent.id),
    }));
  }
}
