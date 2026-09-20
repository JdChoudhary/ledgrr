export interface Transaction {
  id: string;
  amount: number;
  personalAmount?: number | null;
  date: string;
  description: string;
  category: {
    id: string;
    name: string;
    type: "income" | "expense";
    color?: string;
    icon?: string;
  } | null;
  type: "income" | "expense" | "transfer" | "refund";
  account?: { id: string; name: string; color: string; type: string } | null;
  toAccount?: { id: string; name: string; color: string; type: string } | null;
  notes?: string | null;
  status?: string;
  tags?: Tag[];
  isShared?: boolean;
  isDebtLinked?: boolean;
  billSplitId?: string | null;
  debtId?: string | null;
  billSplitShares?: BillSplitShare[];
}

export interface BillSplitShare {
  id: string;
  userId: string;
  amount: number;
  isOwner: boolean;
  isPaid: boolean;
  percentage?: number | null;
  userName: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  color?: string;
  icon?: string;
  groupId?: string | null;
  transactionCount?: number;
  totalSpend?: number;
  totalIncome?: number;
}

export interface CategoryGroup {
  id: string;
  name: string;
  sortOrder?: number;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
  icon: string;
}

export interface CurrencySettings {
  currency?: string;
  currencySymbol?: string;
  locale?: string;
}

export type TransactionType = "income" | "expense" | "transfer";

export type TransactionFormData = {
  amount: string;
  date: string;
  description: string;
  category: string;
  type: TransactionType;
  accountId: string;
  toAccountId: string;
};

export type GroupedCategories = { groupName: string | null; categories: Category[] }[];
