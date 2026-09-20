export interface RecurringRule {
  id: string;
  amount: number;
  description: string;
  type: "income" | "expense" | "transfer";
  frequency: string;
  interval: number;
  startDate: string;
  nextRunDate: string;
  endDate?: string | null;
  status: string;
  lastRunAt?: string | null;
  accountId?: string | null;
  toAccountId?: string | null;
  categoryId?: string | null;
  currency: string;
}

export interface RecurringAccount {
  id: string;
  name: string;
  color: string;
}

export interface RecurringCategory {
  id: string;
  name: string;
  type: string;
}
