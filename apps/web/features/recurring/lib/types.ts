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
  merchantId?: string | null;
  amountMode?: "fixed" | "variable";
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

/**
 * A date a rule is due on, projected from its schedule. Never a persisted row,
 * so it has no status or transaction — it is what the calendar shows for dates
 * that have not come due yet.
 */
export interface ProjectedOccurrence {
  id: string;
  ruleId: string;
  scheduledFor: string;
  ruleDescription: string;
  ruleAmount: string;
  ruleCurrency: string;
  ruleType: "income" | "expense" | "transfer";
  ruleAmountMode: "fixed" | "variable";
  ruleAccountId: string | null;
  ruleCategoryId: string | null;
  ruleMerchantId: string | null;
  ruleFrequency: string;
  ruleInterval: number;
}

export interface OccurrenceListItem {
  id: string;
  ruleId: string;
  transactionId: string | null;
  scheduledFor: string;
  status: "pending" | "success" | "failed" | "skipped" | "awaiting_confirmation";
  ruleDescription: string;
  ruleAmount: string;
  ruleCurrency: string;
  ruleType: "income" | "expense" | "transfer";
  ruleAmountMode: "fixed" | "variable";
  ruleAccountId: string | null;
  ruleCategoryId: string | null;
  ruleMerchantId: string | null;
  ruleFrequency: string;
  ruleInterval: number;
}
