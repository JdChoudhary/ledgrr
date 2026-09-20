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
  month: string;
  monthLabel: string;
  income: number;
  expenses: number;
  savings: number;
}

export interface CategoryComparison {
  category: string;
  current: number;
  previous: number;
}
