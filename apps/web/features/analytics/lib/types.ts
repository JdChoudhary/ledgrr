export interface CurrencySettings {
  currency?: string;
  currencySymbol?: string;
  locale?: string;
}

export interface AnalyticsData {
  period: string;
  dateRange: { from: string; to: string };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalTransfers: number;
    totalRefunds: number;
    netFlow: number;
    savingsRate: number;
  };
  byCategory: {
    categoryId: string | null;
    categoryName: string;
    categoryColor: string;
    type: string;
    total: number;
    count: number;
  }[];
  byGroup: {
    groupId: string | null;
    groupName: string;
    type: string;
    total: number;
    count: number;
  }[];
  byMonth: {
    month: string;
    income: number;
    expenses: number;
    net: number;
  }[];
  topMerchants: {
    description: string | null;
    total: number;
    count: number;
  }[];
  accountBreakdown: {
    accountId: string | null;
    accountName: string;
    type: string;
    total: number;
    count: number;
  }[];
}
