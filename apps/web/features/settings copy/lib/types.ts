export interface CurrencySettings {
  currency?: string;
  currencySymbol?: string;
  locale?: string;
}

export interface Category {
  id: string;
  name: string;
  type: "expense" | "income";
  month: string;
  sortOrder: number;
  transactionCount?: number;
  totalSpend?: number;
  totalIncome?: number;
  totalBudgetLimit?: number;
  totalBudgetSpend?: number;
}

export interface ExchangeRate {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: string;
  observedAt: string;
  source: string | null;
}
