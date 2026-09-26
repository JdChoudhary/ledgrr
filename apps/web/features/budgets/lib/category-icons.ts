import {
  Baby,
  Banknote,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Coffee,
  CreditCard,
  Dumbbell,
  Film,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Music,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Scissors,
  Shirt,
  ShoppingCart,
  Smartphone,
  Stethoscope,
  Tag,
  TrainFront,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * The icon set offered when creating or editing a category. Stored on the row
 * as a short key (`categories.icon`), so this list is the only place that maps
 * a key to a component — unknown keys fall back to the tag.
 */
export type CategoryIconOption = {
  key: string;
  label: string;
  Icon: LucideIcon;
};

export const CATEGORY_ICONS: CategoryIconOption[] = [
  { key: "tag", label: "General", Icon: Tag },
  { key: "utensils", label: "Food & drink", Icon: Utensils },
  { key: "coffee", label: "Coffee", Icon: Coffee },
  { key: "shopping-cart", label: "Groceries", Icon: ShoppingCart },
  { key: "shirt", label: "Clothing", Icon: Shirt },
  { key: "receipt", label: "Bills", Icon: Receipt },
  { key: "home", label: "Home & rent", Icon: Home },
  { key: "zap", label: "Utilities", Icon: Zap },
  { key: "wifi", label: "Internet & phone", Icon: Wifi },
  { key: "smartphone", label: "Mobile", Icon: Smartphone },
  { key: "car", label: "Car", Icon: Car },
  { key: "fuel", label: "Fuel", Icon: Fuel },
  { key: "bus", label: "Transit", Icon: Bus },
  { key: "train", label: "Rail", Icon: TrainFront },
  { key: "plane", label: "Travel", Icon: Plane },
  { key: "heart-pulse", label: "Health", Icon: HeartPulse },
  { key: "stethoscope", label: "Medical", Icon: Stethoscope },
  { key: "dumbbell", label: "Fitness", Icon: Dumbbell },
  { key: "graduation-cap", label: "Education", Icon: GraduationCap },
  { key: "book", label: "Books", Icon: BookOpen },
  { key: "film", label: "Entertainment", Icon: Film },
  { key: "music", label: "Music", Icon: Music },
  { key: "gift", label: "Gifts", Icon: Gift },
  { key: "baby", label: "Family", Icon: Baby },
  { key: "paw-print", label: "Pets", Icon: PawPrint },
  { key: "scissors", label: "Personal care", Icon: Scissors },
  { key: "wrench", label: "Repairs", Icon: Wrench },
  { key: "briefcase", label: "Work", Icon: Briefcase },
  { key: "wallet", label: "Wallet", Icon: Wallet },
  { key: "credit-card", label: "Card", Icon: CreditCard },
  { key: "banknote", label: "Cash", Icon: Banknote },
  { key: "piggy-bank", label: "Savings", Icon: PiggyBank },
];

const ICON_BY_KEY = new Map(CATEGORY_ICONS.map((entry) => [entry.key, entry.Icon]));

export const DEFAULT_CATEGORY_ICON_KEY = "tag";

/** The icon component for a stored key, falling back to the tag. */
export function getCategoryIcon(key: string | null | undefined): LucideIcon {
  if (!key) return Tag;
  return ICON_BY_KEY.get(key) ?? Tag;
}

/** Swatches offered alongside the free colour picker. */
export const CATEGORY_COLORS = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#22C55E",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#0EA5E9",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#D946EF",
  "#EC4899",
  "#F43F5E",
  "#78716C",
] as const;

export const DEFAULT_CATEGORY_COLOR = "#6B7280";
