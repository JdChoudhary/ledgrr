"use client";

import * as React from "react";
import {
  CheckIcon,
  Link2Icon,
  Loader2Icon,
  PlusIcon,
  TargetIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";

import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { useSession } from "~/lib/auth-client";
import { useSearchUsers } from "~/hooks/api/friendship";
import { useCategoryOptions } from "~/hooks/api/category/hierarchy";
import {
  useAddHouseholdMember,
  useCreateHouseholdBudget,
  useCreateHouseholdCategory,
  useHouseholdBudgetStatus,
  useHouseholdCategorySpend,
  useLinkHouseholdCategory,
  useRemoveHouseholdMember,
  useUnlinkHouseholdCategory,
} from "~/hooks/api/household";

export const PERIOD_TYPES = ["weekly", "monthly", "quarterly", "yearly"] as const;
export type PeriodType = (typeof PERIOD_TYPES)[number];

export const today = () => new Date().toISOString().slice(0, 10);

export const fmtMoney = (value: string | number): string =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Deterministic per-member colours for the contribution breakdown. */
const MEMBER_COLORS = [
  "#6366F1",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#8B5CF6",
  "#84CC16",
  "#F43F5E",
];

type MemberSpend = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  linked: boolean;
  spend: string;
};

/** Stable colour per person so someone keeps their colour across rows. */
const memberColor = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return MEMBER_COLORS[hash % MEMBER_COLORS.length] ?? "#6366F1";
};

/** "This month" when the window is the current calendar month, else the range. */
const periodLabel = (periodStart: string, periodEnd: string): string => {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);

  if (periodStart === monthStart && periodEnd === monthEnd) return "This month";

  const fmt = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

  return `${fmt(periodStart)} – ${fmt(periodEnd)}`;
};

// ---------------------------------------------------------------------------
// Shared budget — live spend for one shared budget
// ---------------------------------------------------------------------------

export function SharedBudgetCard({
  budget,
  label,
}: {
  budget: { id: string; limitAmount: string; periodType: string; startsOn: string };
  label?: string;
}) {
  const session = useSession();
  const selfUserId = session.data?.user?.id ?? null;

  const status = useHouseholdBudgetStatus({ householdBudgetId: budget.id });

  const percent = Math.min(100, Math.max(0, status.householdBudgetStatus?.percentUsed ?? 0));
  const state = status.householdBudgetStatus?.state ?? "on_track";
  const members: MemberSpend[] = status.householdBudgetStatus?.members ?? [];
  // Members arrive sorted by spend, so colours stay aligned between the
  // stacked bar and the legend even though zero-spend members take no width.
  const memberTotal = members.reduce((total, m) => total + Math.max(0, Number(m.spend)), 0);

  return (
    <div className="space-y-2 rounded-lg border border-border/50 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium capitalize">
          {label ?? `${budget.periodType} budget`}
        </span>
        <span className="text-sm font-semibold tabular-nums">{fmtMoney(budget.limitAmount)}</span>
      </div>

      {status.isPending ? (
        <Skeleton className="h-2 w-full" />
      ) : (
        <>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                state === "over"
                  ? "bg-destructive"
                  : state === "warning"
                    ? "bg-amber-500"
                    : "bg-primary",
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              Spent {fmtMoney(status.householdBudgetStatus?.liveSpend ?? 0)} ·{" "}
              {status.householdBudgetStatus?.percentUsed ?? 0}%
            </span>
            <span>
              {fmtMoney(status.householdBudgetStatus?.remaining ?? budget.limitAmount)} left
            </span>
          </div>

          {/* Per-member contributions */}
          {members.length > 0 ? (
            <div className="space-y-1.5">
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                {members.map((member, index) => (
                  <div
                    key={member.userId}
                    className="h-full transition-all"
                    style={{
                      width: `${memberTotal > 0 ? (Math.max(0, Number(member.spend)) / memberTotal) * 100 : 0}%`,
                      backgroundColor: MEMBER_COLORS[index % MEMBER_COLORS.length],
                    }}
                  />
                ))}
              </div>

              <ul className="space-y-1">
                {members.map((member, index) => {
                  const share =
                    memberTotal > 0
                      ? Math.round((Math.max(0, Number(member.spend)) / memberTotal) * 100)
                      : 0;

                  return (
                    <li key={member.userId} className="flex items-center gap-2 text-[11px]">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: MEMBER_COLORS[index % MEMBER_COLORS.length] }}
                      />
                      <span className="min-w-0 truncate">
                        {member.name || member.email}
                        {member.userId === selfUserId ? (
                          <span className="text-muted-foreground"> (you)</span>
                        ) : null}
                      </span>
                      {!member.linked ? (
                        <span className="shrink-0 text-muted-foreground">no category linked</span>
                      ) : null}
                      <span className="ml-auto shrink-0 tabular-nums">
                        {fmtMoney(member.spend)}
                        {memberTotal > 0 ? (
                          <span className="text-muted-foreground"> · {share}%</span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export function MembersSection({
  householdId,
  members,
  isOwner,
  selfUserId,
  showHeading = true,
}: {
  householdId: string;
  members: { id: string; userId: string; role: string; name: string; email: string }[];
  isOwner: boolean;
  selfUserId: string | null;
  showHeading?: boolean;
}) {
  const [query, setQuery] = React.useState("");

  const search = useSearchUsers(query.trim().length >= 2 ? { query: query.trim() } : undefined);
  const results = (search.users ?? []).filter((u) => u.kind === "user");

  const addMember = useAddHouseholdMember({
    onSuccess: () => {
      toast.success("Member added");
      setQuery("");
    },
    onError: (err) => toast.error(err.message),
  });
  const removeMember = useRemoveHouseholdMember({
    onSuccess: () => toast.success("Member removed"),
    onError: (err) => toast.error(err.message),
  });

  return (
    <section className="space-y-2">
      {showHeading ? (
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <UsersIcon className="size-4 text-muted-foreground" />
          Members
        </h3>
      ) : null}

      <div className="space-y-1.5">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2"
          >
            <div className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold uppercase">
              {(member.name || member.email || "?").charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {member.name || member.email}
                {member.userId === selfUserId ? (
                  <span className="ml-1.5 text-[10px] text-muted-foreground">you</span>
                ) : null}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">{member.email}</p>
            </div>
            <Badge
              variant={member.role === "owner" ? "secondary" : "outline"}
              className="text-[10px]"
            >
              {member.role}
            </Badge>
            {isOwner && member.role !== "owner" ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove member"
                disabled={removeMember.isPending}
                onClick={() =>
                  removeMember.removeHouseholdMember({ householdId, userId: member.userId })
                }
              >
                <XIcon className="size-3.5" />
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      {isOwner ? (
        <div className="space-y-1.5">
          <div className="relative">
            <UserPlusIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Add by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 pl-8"
            />
          </div>
          {results.length > 0 ? (
            <div className="overflow-hidden rounded-lg border">
              {results.map((person) => {
                const already = members.some((m) => m.userId === person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    disabled={already || addMember.isPending}
                    onClick={() => addMember.addHouseholdMember({ householdId, userId: person.id })}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                      already ? "opacity-50" : "hover:bg-accent",
                    )}
                  >
                    <span>{person.name}</span>
                    {already ? (
                      <CheckIcon className="size-3.5 text-primary" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Add</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Only the owner can manage members.</p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shared categories + links
// ---------------------------------------------------------------------------

export function SharedCategoriesSection({
  householdId,
  isOwner,
  categories,
  links,
  selfUserId,
  isLoading,
  showHeading = true,
}: {
  householdId: string;
  isOwner: boolean;
  categories: {
    id: string;
    name: string;
    type: string;
    color: string;
    archivedAt: string | null;
  }[];
  links: {
    id: string;
    householdCategoryId: string;
    userId: string;
    categoryId: string;
    categoryName: string;
  }[];
  selfUserId: string | null;
  isLoading: boolean;
  showHeading?: boolean;
}) {
  const [newName, setNewName] = React.useState("");
  const [newType, setNewType] = React.useState<"expense" | "income">("expense");

  const categoryOptions = useCategoryOptions({});
  const spend = useHouseholdCategorySpend({ householdId });
  const spendByCategory = new Map(
    (spend.householdCategorySpend ?? []).map((row) => [row.householdCategoryId, row]),
  );

  const createCategory = useCreateHouseholdCategory({
    onSuccess: () => {
      toast.success("Shared category created");
      setNewName("");
    },
    onError: (err) => toast.error(err.message),
  });
  const linkCategory = useLinkHouseholdCategory({
    onSuccess: () => toast.success("Category linked"),
    onError: (err) => toast.error(err.message),
  });
  const unlinkCategory = useUnlinkHouseholdCategory({
    onSuccess: () => toast.success("Category unlinked"),
    onError: (err) => toast.error(err.message),
  });

  const activeCategories = categories.filter((c) => !c.archivedAt);
  const myLinks = links.filter((l) => l.userId === selfUserId);
  // Personal categories the member can still link (not already linked).
  const linkableCategories = categoryOptions.items.filter(
    (option) => !myLinks.some((l) => l.categoryId === option.id),
  );

  return (
    <section className="space-y-2">
      {showHeading ? (
        <>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Link2Icon className="size-4 text-muted-foreground" />
            Shared categories
          </h3>
          <p className="text-xs text-muted-foreground">
            Link your own categories to a shared one — a shared budget then counts everyone&apos;s
            spending on it.
          </p>
        </>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : activeCategories.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">No shared categories yet.</p>
      ) : (
        <div className="space-y-2">
          {activeCategories.map((shared) => {
            const categoryLinks = links.filter((l) => l.householdCategoryId === shared.id);
            const mine = categoryLinks.find((l) => l.userId === selfUserId);
            const breakdown = spendByCategory.get(shared.id);
            const spenders = (breakdown?.members ?? []).filter((m) => Number(m.spend) > 0);
            return (
              <div
                key={shared.id}
                className="space-y-1.5 rounded-lg border border-border/50 px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: shared.color }}
                  />
                  <span className="text-sm font-medium">{shared.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {shared.type}
                  </Badge>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {categoryLinks.length} {categoryLinks.length === 1 ? "category" : "categories"}{" "}
                    linked
                  </span>
                </div>

                {categoryLinks.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {categoryLinks.map((l) => (
                      <span
                        key={l.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/50 px-2.5 py-0.5 text-xs"
                        title={
                          l.userId === selfUserId ? "Your category" : "Another member's category"
                        }
                      >
                        {l.categoryName}
                        {l.userId === selfUserId ? (
                          <button
                            type="button"
                            aria-label="Unlink"
                            className="text-muted-foreground hover:text-foreground"
                            disabled={unlinkCategory.isPending}
                            onClick={() =>
                              unlinkCategory.unlinkHouseholdCategoryAsync({ linkId: l.id })
                            }
                          >
                            <XIcon className="size-3" />
                          </button>
                        ) : null}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Per-person expense for this shared category */}
                {categoryLinks.length > 0 && breakdown ? (
                  <div className="space-y-1.5 border-t border-border/40 pt-2">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{periodLabel(breakdown.periodStart, breakdown.periodEnd)}</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {fmtMoney(breakdown.total)}
                      </span>
                    </div>
                    {spenders.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {spenders.map((m) => (
                          <span
                            key={m.userId}
                            className="inline-flex min-w-0 items-center gap-1.5 text-[11px]"
                          >
                            <span
                              className="size-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: memberColor(m.userId) }}
                            />
                            <span className="max-w-28 truncate">
                              {m.name || m.email}
                              {m.userId === selfUserId ? (
                                <span className="text-muted-foreground"> (you)</span>
                              ) : null}
                            </span>
                            <span className="tabular-nums text-muted-foreground">
                              {fmtMoney(m.spend)}
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">No spend yet</p>
                    )}
                  </div>
                ) : null}

                {!mine && linkableCategories.length > 0 ? (
                  <select
                    className="h-8 w-full max-w-64 rounded-lg border border-input bg-background px-2 text-xs"
                    defaultValue=""
                    onChange={(e) => {
                      const categoryId = e.target.value;
                      if (!categoryId) return;
                      linkCategory.linkHouseholdCategoryAsync({
                        householdCategoryId: shared.id,
                        categoryId,
                      });
                      e.target.value = "";
                    }}
                  >
                    <option value="" disabled>
                      Link one of my categories…
                    </option>
                    {linkableCategories.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {isOwner ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="New shared category"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-9 max-w-56"
          />
          <Button
            type="button"
            variant={newType === "expense" ? "default" : "outline"}
            size="sm"
            onClick={() => setNewType("expense")}
          >
            Expense
          </Button>
          <Button
            type="button"
            variant={newType === "income" ? "default" : "outline"}
            size="sm"
            onClick={() => setNewType("income")}
          >
            Income
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={createCategory.isPending || newName.trim() === ""}
            onClick={() =>
              createCategory.createHouseholdCategory({
                householdId,
                name: newName.trim(),
                type: newType,
              })
            }
          >
            {createCategory.isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <PlusIcon className="size-3.5" />
            )}
            Add
          </Button>
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shared budgets
// ---------------------------------------------------------------------------

export function SharedBudgetsSection({
  isOwner,
  sharedCategories,
  budgets,
  isLoading,
  showHeading = true,
}: {
  isOwner: boolean;
  sharedCategories: { id: string; name: string }[];
  budgets: {
    id: string;
    householdCategoryId: string;
    periodType: string;
    startsOn: string;
    limitAmount: string;
  }[];
  isLoading: boolean;
  showHeading?: boolean;
}) {
  const [budgetCategoryId, setBudgetCategoryId] = React.useState("");
  const [periodType, setPeriodType] = React.useState<PeriodType>("monthly");
  const [startsOn, setStartsOn] = React.useState(today);
  const [limitAmount, setLimitAmount] = React.useState("");

  const createBudget = useCreateHouseholdBudget({
    onSuccess: () => {
      toast.success("Shared budget created");
      setLimitAmount("");
    },
    onError: (err) => toast.error(err.message),
  });

  const categoryName = (id: string) =>
    sharedCategories.find((c) => c.id === id)?.name ?? "Shared category";

  return (
    <section className="space-y-2">
      {showHeading ? (
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <TargetIcon className="size-4 text-muted-foreground" />
          Shared budgets
        </h3>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : budgets.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">No shared budgets yet.</p>
      ) : (
        <div className="space-y-2">
          {budgets.map((budget) => (
            <div key={budget.id} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {categoryName(budget.householdCategoryId)}
              </p>
              <SharedBudgetCard budget={budget} />
            </div>
          ))}
        </div>
      )}

      {isOwner ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border/60 p-3">
          <p className="text-xs font-medium text-muted-foreground">New shared budget</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 min-w-40 rounded-lg border border-input bg-background px-2 text-sm"
              value={budgetCategoryId}
              onChange={(e) => setBudgetCategoryId(e.target.value)}
            >
              <option value="" disabled>
                Shared category…
              </option>
              {sharedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <div className="flex gap-1">
              {PERIOD_TYPES.map((period) => (
                <Button
                  key={period}
                  type="button"
                  variant={periodType === period ? "default" : "outline"}
                  size="sm"
                  className="capitalize"
                  onClick={() => setPeriodType(period)}
                >
                  {period}
                </Button>
              ))}
            </div>

            <Input
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
              className="h-9 w-40"
            />
            <Input
              inputMode="decimal"
              placeholder="Limit"
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              className="h-9 w-28"
            />
            <Button
              type="button"
              size="sm"
              disabled={
                createBudget.isPending ||
                budgetCategoryId === "" ||
                limitAmount.trim() === "" ||
                !(Number(limitAmount) > 0)
              }
              onClick={() =>
                createBudget.createHouseholdBudget({
                  householdCategoryId: budgetCategoryId,
                  periodType,
                  startsOn,
                  limitAmount,
                })
              }
            >
              {createBudget.isPending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <PlusIcon className="size-3.5" />
              )}
              Add budget
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Counts every member&apos;s spending on the categories linked to it.
          </p>
        </div>
      ) : null}
    </section>
  );
}
