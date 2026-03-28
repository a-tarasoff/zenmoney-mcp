const API_BASE = "https://api.zenmoney.ru";

export interface DiffRequest {
  currentClientTimestamp: number;
  serverTimestamp: number;
  forceFetch?: string[];
  instrument?: any[];
  company?: any[];
  user?: any[];
  account?: any[];
  tag?: any[];
  merchant?: any[];
  budget?: any[];
  reminder?: any[];
  reminderMarker?: any[];
  transaction?: any[];
  deletion?: any[];
}

export interface DiffResponse {
  serverTimestamp: number;
  instrument: Instrument[];
  company: any[];
  user: User[];
  account: Account[];
  tag: Tag[];
  merchant: Merchant[];
  budget: any[];
  reminder: any[];
  reminderMarker: any[];
  transaction: Transaction[];
  deletion: any[];
}

export interface Instrument {
  id: number;
  changed: number;
  title: string;
  shortTitle: string;
  symbol: string;
  rate: number;
}

export interface User {
  id: number;
  changed: number;
  login: string;
  currency: number;
  parent: number | null;
  country: number;
  countryCode: string;
  email: string;
}

export interface Account {
  id: string;
  changed: number;
  user: number;
  instrument: number | null;
  company: number | null;
  type: string;
  title: string;
  syncID: string[] | null;
  balance: number | null;
  startBalance: number | null;
  creditLimit: number | null;
  inBalance: boolean;
  savings: boolean | null;
  enableCorrection: boolean;
  enableSMS: boolean;
  archive: boolean;
  private: boolean;
}

export interface Tag {
  id: string;
  changed: number;
  user: number;
  title: string;
  parent: string | null;
  icon: string | null;
  picture: string | null;
  color: number | null;
  showIncome: boolean;
  showOutcome: boolean;
  budgetIncome: boolean;
  budgetOutcome: boolean;
  required: boolean | null;
}

export interface Merchant {
  id: string;
  changed: number;
  user: number;
  title: string;
}

export interface Company {
  id: number;
  changed: number;
  title: string;
  country: number | null;
  fullTitle: string | null;
  www: string | null;
}

export interface Transaction {
  id: string;
  changed: number;
  created: number;
  user: number;
  deleted: boolean;
  hold: boolean | null;
  viewed: boolean;
  incomeInstrument: number;
  incomeAccount: string;
  income: number;
  incomeBankID: string | null;
  outcomeInstrument: number;
  outcomeAccount: string;
  outcome: number;
  outcomeBankID: string | null;
  opIncome: number | null;
  opIncomeInstrument: number | null;
  opOutcome: number | null;
  opOutcomeInstrument: number | null;
  tag: string[] | null;
  merchant: string | null;
  payee: string | null;
  originalPayee: string | null;
  comment: string | null;
  date: string;
  mcc: number | null;
  latitude: number | null;
  longitude: number | null;
  reminderMarker: string | null;
  qrCode: string | null;
}

export interface SuggestRequest {
  payee?: string;
  merchant?: string;
}

export interface SuggestResponse {
  tag?: string[] | null;
  merchant?: string | null;
  payee?: string | null;
}

export class ZenMoneyAPI {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ZenMoney API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  async diff(req: DiffRequest): Promise<DiffResponse> {
    return this.request<DiffResponse>("/v8/diff/", req);
  }

  async suggest(
    items: SuggestRequest[]
  ): Promise<SuggestResponse[]> {
    return this.request<SuggestResponse[]>("/v8/suggest/", items);
  }
}
