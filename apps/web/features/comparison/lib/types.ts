export interface CurrencySettings {
  currency?: string;
  currencySymbol?: string;
  locale?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  type: "income" | "expense" | "transfer";
  category: { name: string };
}

export interface MonthData {
  // Index signature so the rows satisfy the echarts `Record<string, unknown>`
  // data contract.
  [key: string]: unknown;
  month: string;
  monthLabel: string;
  income: number;
  expenses: number;
  savings: number;
}

export interface CategoryComparison {
  [key: string]: unknown;
  category: string;
  current: number;
  previous: number;
}
