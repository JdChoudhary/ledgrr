export interface Snapshot {
  id: string;
  totalBalance: number;
  bankBalance: number;
  creditBalance: number;
  investmentBalance: number;
  snapshotDate: string;
}

export interface NetWorthCurrent {
  totalBalance: number;
  totalAssets: number;
  totalLiabilities: number;
  bankBalance: number;
  creditBalance: number;
  cashBalance: number;
  loanBalance: number;
  investmentAccountBalance: number;
  portfolioValue: number;
  savingsGoals: number;
  moneyOwedToMe: number;
  moneyIOwe: number;
}

export interface NetWorthData {
  snapshots: Snapshot[];
  current: NetWorthCurrent;
}

export interface ProjectionPoint {
  month: string;
  label: string;
  actual: number | null;
  projected: number;
  optimistic: number;
  pessimistic: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

export interface ProjectionBaseline {
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNetFlow: number;
  optimisticNetFlow: number;
  pessimisticNetFlow: number;
  totalBudgetLimit: number;
  currentBudgetSpend: number;
  recurringRuleCount: number;
}

export interface ProjectionData {
  projection: ProjectionPoint[];
  baseline: ProjectionBaseline;
  currentMonth: string;
}

export interface ProjectionChartRow {
  [key: string]: unknown;
  name: string;
  actual: number | null;
  projected: number;
  optimistic: number;
  pessimistic: number;
  isCurrentMonth: boolean;
}

export const DEFAULT_CURRENT: NetWorthCurrent = {
  totalBalance: 0,
  totalAssets: 0,
  totalLiabilities: 0,
  bankBalance: 0,
  creditBalance: 0,
  cashBalance: 0,
  loanBalance: 0,
  investmentAccountBalance: 0,
  portfolioValue: 0,
  savingsGoals: 0,
  moneyOwedToMe: 0,
  moneyIOwe: 0,
};
