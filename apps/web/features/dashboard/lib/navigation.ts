import {
  BarChart3,
  Bot,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  FileUp,
  HandCoins,
  Home,
  Landmark,
  MoreHorizontal,
  PieChart,
  Repeat2,
  Settings,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavigationItem[];
};

export const navigation: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },

  {
    id: "money",
    label: "Money",
    href: "/dashboard/transactions",
    icon: CircleDollarSign,
    children: [
      {
        id: "transactions",
        label: "Transactions",
        href: "/dashboard/transactions",
        icon: CreditCard,
      },
      {
        id: "accounts",
        label: "Accounts",
        href: "/dashboard/accounts",
        icon: Landmark,
      },
      {
        id: "budgets",
        label: "Budgets",
        href: "/dashboard/budgets",
        icon: PieChart,
      },
      {
        id: "goals",
        label: "Goals",
        href: "/dashboard/goals",
        icon: Target,
      },
      {
        id: "investments",
        label: "Investments",
        href: "/dashboard/investments",
        icon: TrendingUp,
      },
    ],
  },

  {
    id: "insights",
    label: "Insights",
    href: "/dashboard/insights",
    icon: BarChart3,
    children: [
      {
        id: "insights-overview",
        label: "Overview",
        href: "/dashboard/insights",
        icon: BarChart3,
      },
      {
        id: "spending",
        label: "Spending",
        href: "/dashboard/insights/spending",
        icon: WalletCards,
      },
      {
        id: "cash-flow",
        label: "Cash Flow",
        href: "/dashboard/insights/cash-flow",
        icon: TrendingUp,
      },
      {
        id: "net-worth",
        label: "Net Worth",
        href: "/dashboard/insights/net-worth",
        icon: CircleDollarSign,
      },
      {
        id: "monthly-expenses",
        label: "Monthly Expenses",
        href: "/dashboard/insights/monthly-expenses",
        icon: CalendarDays,
      },
      {
        id: "forecast",
        label: "Forecast",
        href: "/dashboard/insights/forecast",
        icon: TrendingUp,
      },
    ],
  },

  {
    id: "together",
    label: "Together",
    href: "/dashboard/together",
    icon: Users,
    children: [
      {
        id: "together-overview",
        label: "Overview",
        href: "/dashboard/together",
        icon: Users,
      },
      {
        id: "friends",
        label: "Friends",
        href: "/dashboard/together/friends",
        icon: UserPlus,
      },
      {
        id: "debts",
        label: "Debts",
        href: "/dashboard/debts",
        icon: HandCoins,
      },
    ],
  },

  {
    id: "recurring",
    label: "Recurring",
    href: "/dashboard/recurring",
    icon: Repeat2,
  },

  {
    id: "tools",
    label: "Tools",
    href: "/dashboard/tools",
    icon: MoreHorizontal,
    children: [
      {
        id: "recurring-legacy",
        label: "Recurring (legacy)",
        href: "/dashboard/tools/recurring",
        icon: Repeat2,
      },
      {
        id: "import",
        label: "Import",
        href: "/dashboard/tools/import",
        icon: FileUp,
      },
      {
        id: "ai-insights",
        label: "AI Insights",
        href: "/dashboard/tools/ai",
        icon: Bot,
      },
      {
        id: "settings",
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

export function isRouteActive(pathname: string, href: string, exact = false) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveSection(pathname: string) {
  return navigation.find((item) => {
    if (item.id === "dashboard") {
      return pathname === item.href;
    }

    return (
      pathname === item.href ||
      pathname.startsWith(`${item.href}/`) ||
      item.children?.some((child) => isRouteActive(pathname, child.href))
    );
  });
}

export function getActiveChild(pathname: string) {
  for (const section of navigation) {
    const child = section.children?.find((item) => isRouteActive(pathname, item.href));

    if (child) return child;
  }

  return undefined;
}
