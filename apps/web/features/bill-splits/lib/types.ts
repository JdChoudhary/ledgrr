export interface Friend {
  id: string;
  name: string;
  username: string | null;
}

export interface BillSplit {
  id: string;
  title: string;
  totalAmount: number;
  splitMethod: string;
  date: string;
  creatorId: string;
}

export interface SplitDetail extends BillSplit {
  creator: { id: string; name: string; username: string | null } | null;
  shares: {
    id: string;
    userId: string;
    amount: number;
    isPaid: boolean;
    paidAt: string | null;
    user: { id: string; name: string; username: string | null } | null;
  }[];
}

export interface Share {
  userId: string;
  amount: string;
}

export interface CreateSplitForm {
  title: string;
  totalAmount: string;
  splitMethod: "equal" | "exact";
  selectedFriendIds: string[];
  shares: Share[];
}

export interface SettleShare {
  id: string;
  userId: string;
  amount: number;
  userName: string;
}

export interface SettleForm {
  fromCategoryId: string;
  toCategoryId: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  type: string;
}

export interface CurrencySettings {
  currency?: string;
  currencySymbol?: string;
  locale?: string;
}
