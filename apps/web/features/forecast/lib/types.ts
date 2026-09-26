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

export interface ForecastPoint {
  [key: string]: unknown;
  month: string;
  actual?: number;
  predicted?: number;
  lowerBound?: number;
  upperBound?: number;
}

export interface CategoryForecast {
  category: string;
  currentAvg: number;
  predictedNext: number;
  trend: "up" | "down" | "stable";
  confidence: number;
}
