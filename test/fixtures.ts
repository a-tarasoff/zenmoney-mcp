import type {
  Account,
  Company,
  DiffResponse,
  Instrument,
  Merchant,
  Tag,
  Transaction,
  User,
} from "../src/api.js";

export const USD: Instrument = {
  id: 1,
  changed: 1000,
  title: "US Dollar",
  shortTitle: "USD",
  symbol: "$",
  rate: 1,
};

export const EUR: Instrument = {
  id: 2,
  changed: 1000,
  title: "Euro",
  shortTitle: "EUR",
  symbol: "\u20ac",
  rate: 0.92,
};

export const RUB: Instrument = {
  id: 3,
  changed: 1000,
  title: "Russian Ruble",
  shortTitle: "RUB",
  symbol: "\u20bd",
  rate: 90,
};

export const USER: User = {
  id: 1,
  changed: 1000,
  login: "test@test.com",
  currency: 1,
  parent: null,
  country: 1,
  countryCode: "US",
  email: "test@test.com",
};

export const CHECKING: Account = {
  id: "acc-checking",
  changed: 1000,
  user: 1,
  instrument: 1,
  company: null,
  type: "checking",
  title: "Checking",
  syncID: null,
  balance: 5000,
  startBalance: 0,
  creditLimit: null,
  inBalance: true,
  savings: false,
  enableCorrection: false,
  enableSMS: false,
  archive: false,
  private: false,
};

export const SAVINGS: Account = {
  id: "acc-savings",
  changed: 1000,
  user: 1,
  instrument: 1,
  company: null,
  type: "saving",
  title: "Savings",
  syncID: null,
  balance: 10000,
  startBalance: 0,
  creditLimit: null,
  inBalance: true,
  savings: true,
  enableCorrection: false,
  enableSMS: false,
  archive: false,
  private: false,
};

export const EURO_CARD: Account = {
  id: "acc-euro",
  changed: 1000,
  user: 1,
  instrument: 2,
  company: 1,
  type: "ccard",
  title: "Euro Card",
  syncID: null,
  balance: 2000,
  startBalance: 0,
  creditLimit: null,
  inBalance: true,
  savings: false,
  enableCorrection: false,
  enableSMS: false,
  archive: false,
  private: false,
};

export const ARCHIVED_ACCOUNT: Account = {
  id: "acc-archived",
  changed: 1000,
  user: 1,
  instrument: 1,
  company: null,
  type: "checking",
  title: "Old Account",
  syncID: null,
  balance: 0,
  startBalance: 0,
  creditLimit: null,
  inBalance: false,
  savings: false,
  enableCorrection: false,
  enableSMS: false,
  archive: true,
  private: false,
};

export const FOOD: Tag = {
  id: "tag-food",
  changed: 1000,
  user: 1,
  title: "Food",
  parent: null,
  icon: null,
  picture: null,
  color: null,
  showIncome: false,
  showOutcome: true,
  budgetIncome: false,
  budgetOutcome: true,
  required: null,
};

export const RESTAURANTS: Tag = {
  id: "tag-restaurants",
  changed: 1000,
  user: 1,
  title: "Restaurants",
  parent: "tag-food",
  icon: null,
  picture: null,
  color: null,
  showIncome: false,
  showOutcome: true,
  budgetIncome: false,
  budgetOutcome: true,
  required: null,
};

export const SALARY: Tag = {
  id: "tag-salary",
  changed: 1000,
  user: 1,
  title: "Salary",
  parent: null,
  icon: null,
  picture: null,
  color: null,
  showIncome: true,
  showOutcome: false,
  budgetIncome: true,
  budgetOutcome: false,
  required: null,
};

export const MERCHANT_CAFE: Merchant = {
  id: "merchant-cafe",
  changed: 1000,
  user: 1,
  title: "Corner Cafe",
};

export const COMPANY_BANK: Company = {
  id: 1,
  changed: 1000,
  title: "Test Bank",
  country: 1,
  fullTitle: "Test Bank Inc.",
  www: null,
};

export function makeTransaction(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    changed: 1000,
    created: 1000,
    user: 1,
    deleted: false,
    hold: null,
    viewed: true,
    incomeInstrument: 1,
    incomeAccount: "acc-checking",
    income: 0,
    incomeBankID: null,
    outcomeInstrument: 1,
    outcomeAccount: "acc-checking",
    outcome: 0,
    outcomeBankID: null,
    opIncome: null,
    opIncomeInstrument: null,
    opOutcome: null,
    opOutcomeInstrument: null,
    tag: null,
    merchant: null,
    payee: null,
    originalPayee: null,
    comment: null,
    date: "2026-03-20",
    mcc: null,
    latitude: null,
    longitude: null,
    reminderMarker: null,
    qrCode: null,
    ...overrides,
  };
}

export function makeDiffResponse(overrides: Partial<DiffResponse> = {}): DiffResponse {
  return {
    serverTimestamp: 1700000000,
    instrument: [USD, EUR, RUB],
    company: [COMPANY_BANK],
    user: [USER],
    account: [CHECKING, SAVINGS, EURO_CARD, ARCHIVED_ACCOUNT],
    tag: [FOOD, RESTAURANTS, SALARY],
    merchant: [MERCHANT_CAFE],
    budget: [],
    reminder: [],
    reminderMarker: [],
    transaction: [],
    deletion: [],
    ...overrides,
  };
}
