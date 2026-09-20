"use client";

import * as React from "react";
import {
  Archive,
  ArchiveRestore,
  Banknote,
  CreditCard,
  Landmark,
  Loader2Icon,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  PlusIcon,
  SearchIcon,
  Vault,
  Wallet,
  WalletCards,
} from "lucide-react";

import { cn } from "cn";
import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useAccounts,
  useArchiveAccount,
  useUnarchiveAccount,
  type AccountRecord,
} from "~/hooks/api/account";
import { useSpaces } from "~/hooks/api/space";

import { AccountFormDialog } from "./account-form-dialog";

const ACCOUNT_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "credit_card", label: "Credit card" },
  { value: "wallet", label: "Wallet" },
  { value: "investment", label: "Investment" },
  { value: "loan", label: "Loan" },
  { value: "other", label: "Other" },
] as const;

const TYPE_META: Record<string, { label: string; icon: React.ElementType }> = {
  cash: { label: "Cash", icon: Banknote },
  bank: { label: "Bank", icon: Landmark },
  credit_card: { label: "Credit card", icon: CreditCard },
  wallet: { label: "Wallet", icon: Wallet },
  investment: { label: "Investment", icon: PiggyBank },
  loan: { label: "Loan", icon: Vault },
  other: { label: "Other", icon: WalletCards },
};

const money = (value: string | number, currency: string): string => {
  const amount = Number(value);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
};

export function AccountsView() {
  const spaces = useSpaces({});
  const space = spaces.spaces?.[0]?.space;
  const spaceId = space?.id;
  const currency = space?.baseCurrency ?? "USD";

  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const [showArchived, setShowArchived] = React.useState(false);

  const accounts = useAccounts(
    spaceId
      ? {
          spaceId,
          ...(typeFilter !== "all"
            ? { type: typeFilter as "cash" | "bank" | "credit_card" | "wallet" | "investment" | "loan" | "other" }
            : {}),
          includeArchived: true,
        }
      : undefined,
  );

  const { archiveAccount } = useArchiveAccount({
    onSuccess: () => toast.success("Account archived"),
    onError: (error) => toast.error("Couldn't archive account", error.message),
  });

  const { unarchiveAccount } = useUnarchiveAccount({
    onSuccess: () => toast.success("Account restored"),
    onError: (error) => toast.error("Couldn't restore account", error.message),
  });

  const rows = React.useMemo(() => {
    const all = accounts.accounts ?? [];
    const term = search.trim().toLowerCase();

    return all
      .filter((account) => (showArchived ? true : account.archivedAt === null))
      .filter((account) =>
        term ? account.name.toLowerCase().includes(term) : true,
      );
  }, [accounts.accounts, showArchived, search]);

  // Credit cards and loans are liabilities, not spendable money.
  const totals = React.useMemo(() => {
    let assets = 0;
    let liabilities = 0;

    for (const account of accounts.accounts ?? []) {
      if (account.archivedAt !== null) continue;
      const amount = Number(account.balance);
      if (!Number.isFinite(amount)) continue;

      if (account.type === "credit_card" || account.type === "loan") {
        liabilities += Math.abs(amount);
      } else {
        assets += amount;
      }
    }

    return { assets, liabilities, net: assets - liabilities };
  }, [accounts.accounts]);

  if (spaces.isPending) {
    return <AccountsSkeleton />;
  }

  if (!spaceId) {
    return (
      <Empty className="mt-8 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Wallet />
          </EmptyMedia>
          <EmptyTitle>No space found</EmptyTitle>
          <EmptyDescription>
            An account needs a space to live in. Create your personal space first.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Assets"
          value={money(totals.assets, currency)}
          tone="positive"
        />
        <SummaryCard
          label="Liabilities"
          value={money(totals.liabilities, currency)}
          tone="negative"
        />
        <SummaryCard label="Net worth" value={money(totals.net, currency)} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-48 sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search accounts..."
            className="pl-8"
          />
        </div>

        {/* `items` lets <SelectValue/> render labels instead of raw values. */}
        <Select
          items={ACCOUNT_TYPE_OPTIONS}
          value={typeFilter}
          onValueChange={(value) => {
            if (value) setTypeFilter(value);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showArchived ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowArchived((prev) => !prev)}
        >
          <Archive />
          {showArchived ? "Hide archived" : "Show archived"}
        </Button>

        <AccountFormDialog
          spaceId={spaceId}
          spaceCurrency={currency}
          trigger={
            <Button size="sm" className="ml-auto">
              <PlusIcon />
              New account
            </Button>
          }
        />
      </div>

      {/* Content states */}
      {accounts.isPending ? (
        <AccountsSkeleton />
      ) : (accounts.accounts ?? []).length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Wallet />
            </EmptyMedia>
            <EmptyTitle>No accounts yet</EmptyTitle>
            <EmptyDescription>
              Add your cash, bank, or card accounts to start tracking balances.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <AccountFormDialog
              spaceId={spaceId}
              spaceCurrency={currency}
              trigger={
                <Button size="sm">
                  <PlusIcon />
                  Create your first account
                </Button>
              }
            />
          </EmptyContent>
        </Empty>
      ) : rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No matches</EmptyTitle>
            <EmptyDescription>Try a different search or filter.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              currency={currency}
              spaceId={spaceId}
              onArchive={() =>
                archiveAccount({ spaceId, accountId: account.id })
              }
              onUnarchive={() =>
                unarchiveAccount({ spaceId, accountId: account.id })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-1 px-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className={cn(
            "text-lg font-semibold tabular-nums",
            tone === "positive" && "text-emerald-600 dark:text-emerald-400",
            tone === "negative" && "text-destructive",
          )}
        >
          {value}
        </span>
      </CardContent>
    </Card>
  );
}

function AccountCard({
  account,
  currency,
  spaceId,
  onArchive,
  onUnarchive,
}: {
  account: AccountRecord;
  currency: string;
  spaceId: string;
  onArchive: () => void;
  onUnarchive: () => void;
}) {
  const [editOpen, setEditOpen] = React.useState(false);

  const meta = TYPE_META[account.type] ?? TYPE_META.other!;
  const Icon = meta.icon;
  const archived = account.archivedAt !== null;
  const balance = Number(account.balance);
  const negative = Number.isFinite(balance) && balance < 0;

  return (
    <Card
      className={cn(
        "gap-3 py-4 transition-shadow hover:shadow-md",
        archived && "opacity-60",
      )}
    >
      <CardContent className="flex flex-col gap-3 px-4">
        <div className="flex items-start gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border"
            style={
              account.color
                ? { backgroundColor: `${account.color}1A`, color: account.color }
                : undefined
            }
          >
            <Icon className="size-4" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{account.name}</span>
              {account.visibility === "restricted" ? (
                <Badge variant="secondary">Restricted</Badge>
              ) : null}
            </div>
            <span className="text-xs text-muted-foreground">
              {account.currency} · {meta.label}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Account actions" />
              }
            >
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setEditOpen(true);
                }}
              >
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {archived ? (
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    onUnarchive();
                  }}
                >
                  <ArchiveRestore />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(event) => {
                    event.preventDefault();
                    onArchive();
                  }}
                >
                  <Archive />
                  Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator />

        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Balance</span>
            <span
              className={cn(
                "text-lg font-semibold tabular-nums",
                negative && "text-destructive",
              )}
            >
              {money(account.balance, account.currency)}
            </span>
          </div>
          {account.creditLimit ? (
            <span className="text-right text-xs text-muted-foreground">
              Limit {money(account.creditLimit, account.currency)}
            </span>
          ) : null}
        </div>

        {archived ? (
          <Badge variant="outline" className="w-fit">
            Archived
          </Badge>
        ) : null}
      </CardContent>

      {/* Controlled edit dialog — opened from the card's action menu. */}
      <AccountFormDialog
        spaceId={spaceId}
        spaceCurrency={currency}
        account={account}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </Card>
  );
}

function AccountsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
