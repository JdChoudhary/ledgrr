export interface CurrencySettings {
  currency?: string;
  currencySymbol?: string;
  locale?: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: "income" | "expense" | "transfer";
  category: {
    id: string;
    name: string;
    monthlySpend: number;
    month: string;
  };
}

export interface DailySpending {
  [key: string]: unknown;
  date: string;
  totalSpending: number;
}
