export interface Category {
  id: string;
  name: string;
  type: "expense" | "income";
  color: string;
  icon: string;
  sortOrder: number;
  groupId: string | null;
  monthlySpend?: number;
  month?: string;
  monthlyLimit?: number;
  transactionCount?: number;
  totalSpend?: number;
  totalIncome?: number;
}

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  category?: Category | null;
  type: "income" | "expense" | "transfer" | "refund";
}

export interface Account {
  id: string;
  name: string;
  type: "bank" | "cash" | "credit" | "investment" | "other";
  balance: number;
  color: string;
}

export interface CurrencySettings {
  currency?: string;
  currencySymbol?: string;
  locale?: string;
}
