import {
  HomeIcon,
  HeartIcon,
  UsersIcon,
  PlaneIcon,
  BeerIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";

/** Static currency list — the currency API is admin-only. */
export const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CNY", name: "Chinese Yuan" },
] as const;

export const SPACE_TYPE_META: Record<
  string,
  { label: string; icon: LucideIcon; color: string; description: string }
> = {
  personal: {
    label: "Personal",
    icon: UserIcon,
    color: "bg-slate-500/10 text-slate-600",
    description: "Your private money",
  },
  household: {
    label: "Household",
    icon: HomeIcon,
    color: "bg-amber-500/10 text-amber-600",
    description: "Rent, bills and groceries with housemates",
  },
  family: {
    label: "Family",
    icon: HeartIcon,
    color: "bg-rose-500/10 text-rose-600",
    description: "Family finances in one place",
  },
  couple: {
    label: "Couple",
    icon: HeartIcon,
    color: "bg-pink-500/10 text-pink-600",
    description: "Two people, one view of the money",
  },
  roommates: {
    label: "Roommates",
    icon: UsersIcon,
    color: "bg-violet-500/10 text-violet-600",
    description: "Split shared costs fairly",
  },
  trip: {
    label: "Trip",
    icon: PlaneIcon,
    color: "bg-sky-500/10 text-sky-600",
    description: "Travel costs with friends",
  },
  group: {
    label: "Group",
    icon: BeerIcon,
    color: "bg-emerald-500/10 text-emerald-600",
    description: "Any shared expense group",
  },
};

export const ROLE_META: Record<string, { label: string; className: string }> = {
  owner: {
    label: "Owner",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  admin: {
    label: "Admin",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-600",
  },
  member: {
    label: "Member",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  },
  viewer: {
    label: "Viewer",
    className: "border-border bg-muted text-muted-foreground",
  },
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
  CNY: "¥",
};
