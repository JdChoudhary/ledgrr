"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BanknoteIcon,
  HandCoinsIcon,
  HomeIcon,
  LandmarkIcon,
  PlusIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

import { cn } from "cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import { useSpaces } from "~/hooks/api/space";
import { useFriendships } from "~/hooks/api/friendship";
import { useDebts } from "~/hooks/api/debt";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SPACE_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  personal: {
    label: "Personal",
    icon: HomeIcon,
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  },
  household: {
    label: "Household",
    icon: HomeIcon,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  family: {
    label: "Family",
    icon: UsersIcon,
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  },
  couple: {
    label: "Couple",
    icon: UsersIcon,
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  },
  roommates: {
    label: "Roommates",
    icon: LandmarkIcon,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  trip: {
    label: "Trip",
    icon: WalletIcon,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  group: {
    label: "Group",
    icon: UsersIcon,
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  },
};

const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const fmt =
  (currency: string) =>
  (value: number): string =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);

// ---------------------------------------------------------------------------
// Section card — reusable wrapper for summary sections
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  description,
  icon: Icon,
  count,
  href,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  count: number;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-4 text-muted-foreground" />
            </span>
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {count}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full text-xs"
          render={<Link href={href}>View all →</Link>}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Spaces preview
// ---------------------------------------------------------------------------

function SpacesPreview() {
  const spaces = useSpaces({});

  if (spaces.isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  const rows = (spaces.spaces ?? []).filter(
    (r) => r.space.archivedAt == null && r.space.type !== "personal",
  );
  const totalSpaces = rows.length;
  const sharedSpaces = rows.filter((r) => r.space.type !== "personal");

  return (
    <SectionCard
      title="Shared Spaces"
      description={`${totalSpaces} active space${totalSpaces === 1 ? "" : "s"}`}
      icon={UsersIcon}
      count={totalSpaces}
      href="/dashboard/together/spaces"
    >
      {sharedSpaces.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">
          No shared spaces yet. Create one to track money with others.
        </p>
      ) : (
        <div className="space-y-2">
          {sharedSpaces.slice(0, 3).map((row) => {
            const meta = SPACE_TYPE_META[row.space.type] ?? SPACE_TYPE_META.personal;
            const TypeIcon = meta.icon;
            return (
              <Link
                key={row.membershipId}
                href="/dashboard/together/spaces"
                className="flex items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    meta.color,
                  )}
                >
                  <TypeIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.space.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {meta.label} · {row.role}
                  </p>
                </div>
                {row.space.billSplitting ? (
                  <Badge variant="secondary" className="text-[10px]">
                    splits
                  </Badge>
                ) : null}
              </Link>
            );
          })}
          {sharedSpaces.length > 3 ? (
            <p className="text-center text-[11px] text-muted-foreground">
              +{sharedSpaces.length - 3} more
            </p>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Friends preview
// ---------------------------------------------------------------------------

function FriendsPreview() {
  const friendships = useFriendships({});

  if (friendships.isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  const all = friendships.friendships ?? [];
  const friends = all.filter((r) => r.status === "accepted");
  const pending = all.filter((r) => r.status === "pending" && r.direction === "incoming");

  return (
    <SectionCard
      title="Friends"
      description={`${friends.length} friend${friends.length === 1 ? "" : "s"}${pending.length > 0 ? ` · ${pending.length} pending` : ""}`}
      icon={UserPlusIcon}
      count={friends.length}
      href="/dashboard/together/friends"
    >
      {friends.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">
          No friends yet. Search for people to connect with.
        </p>
      ) : (
        <div className="space-y-2">
          {friends.slice(0, 4).map((record) => (
            <div
              key={record.friendshipId}
              className="flex items-center gap-3 rounded-md border px-3 py-2"
            >
              <Avatar className="size-7">
                <AvatarImage
                  src={record.otherUser.image ?? undefined}
                  alt={record.otherUser.name}
                />
                <AvatarFallback className="text-[10px]">
                  {initialsOf(record.otherUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{record.otherUser.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {record.otherUser.username
                    ? `@${record.otherUser.username}`
                    : record.otherUser.email}
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                Friend
              </Badge>
            </div>
          ))}
          {friends.length > 4 ? (
            <p className="text-center text-[11px] text-muted-foreground">
              +{friends.length - 4} more
            </p>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Debts preview
// ---------------------------------------------------------------------------

function DebtsPreview() {
  const debts = useDebts({});

  if (debts.isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  const rows = debts.debts ?? [];
  const openDebts = rows.filter((r) => r.status === "open" || r.status === "partially_settled");
  const totalOwed = openDebts
    .filter((r) => r.debt.debtorUserId)
    .reduce((acc, r) => acc + Number(r.outstandingAmount), 0);
  const totalReceivable = openDebts
    .filter((r) => r.debt.creditorUserId)
    .reduce((acc, r) => acc + Number(r.outstandingAmount), 0);

  return (
    <SectionCard
      title="Debts"
      description={`${openDebts.length} open obligation${openDebts.length === 1 ? "" : "s"}`}
      icon={HandCoinsIcon}
      count={openDebts.length}
      href="/dashboard/debts"
    >
      {openDebts.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">
          No outstanding debts. All settled!
        </p>
      ) : (
        <div className="space-y-3">
          {/* Net balance summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border px-3 py-2">
              <p className="text-[11px] text-muted-foreground">They owe you</p>
              <p className="text-sm font-semibold tabular-nums text-emerald-600">
                {totalReceivable > 0 ? `+${totalReceivable.toFixed(0)}` : "—"}
              </p>
            </div>
            <div className="rounded-md border px-3 py-2">
              <p className="text-[11px] text-muted-foreground">You owe</p>
              <p className="text-sm font-semibold tabular-nums text-red-600">
                {totalOwed > 0 ? `−${totalOwed.toFixed(0)}` : "—"}
              </p>
            </div>
          </div>

          {/* Recent debts */}
          <div className="space-y-2">
            {openDebts.slice(0, 3).map((item) => {
              const isCreditor = item.debt.creditorUserId != null;
              return (
                <div
                  key={item.debt.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2"
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full",
                      isCreditor ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600",
                    )}
                  >
                    {isCreditor ? (
                      <ArrowDownLeftIcon className="size-3.5" />
                    ) : (
                      <ArrowUpRightIcon className="size-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.creditorName || item.debtorName || "Unknown"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isCreditor ? "owes you" : "you owe"}
                      {item.debt.dueDate
                        ? ` · due ${format(new Date(item.debt.dueDate), "MMM d")}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      isCreditor ? "text-emerald-600" : "text-red-600",
                    )}
                  >
                    {isCreditor ? "+" : "−"}
                    {Number(item.outstandingAmount).toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Main overview
// ---------------------------------------------------------------------------

export function TogetherOverview() {
  const spaces = useSpaces({});
  const friendships = useFriendships({});
  const debts = useDebts({});

  const allSpaces = spaces.spaces ?? [];
  const sharedSpaces = allSpaces.filter(
    (r) => r.space.archivedAt == null && r.space.type !== "personal",
  );
  const allFriends = friendships.friendships ?? [];
  const friends = allFriends.filter((r) => r.status === "accepted");
  const pendingRequests = allFriends.filter(
    (r) => r.status === "pending" && r.direction === "incoming",
  );
  const allDebts = debts.debts ?? [];
  const openDebts = allDebts.filter((r) => r.status === "open" || r.status === "partially_settled");

  return (
    <>
      <DashboardHeader
        title="Together"
        description="Manage shared finances, friends, and obligations"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/together/spaces">
              <Button size="sm">
                <PlusIcon className="size-4" />
                New space
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-4 md:p-6">
        <div className="flex flex-col gap-6">
          {/* Summary stats */}
          {spaces.isPending ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="flex flex-col gap-1 px-4 py-3">
                  <span className="text-xs text-muted-foreground">Shared Spaces</span>
                  <span className="text-2xl font-semibold tabular-nums">{sharedSpaces.length}</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col gap-1 px-4 py-3">
                  <span className="text-xs text-muted-foreground">Friends</span>
                  <span className="text-2xl font-semibold tabular-nums">
                    {friends.length}
                    {pendingRequests.length > 0 ? (
                      <span className="ml-1 text-sm text-amber-600">+{pendingRequests.length}</span>
                    ) : null}
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col gap-1 px-4 py-3">
                  <span className="text-xs text-muted-foreground">Open Debts</span>
                  <span className="text-2xl font-semibold tabular-nums">{openDebts.length}</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col gap-1 px-4 py-3">
                  <span className="text-xs text-muted-foreground">Total Members</span>
                  <span className="text-2xl font-semibold tabular-nums">
                    {sharedSpaces.reduce((acc, r) => acc + (r.space.sharedLedger ? 2 : 1), 0)}
                  </span>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Two-column layout: Spaces + Friends on left, Debts on right */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <SpacesPreview />
              <FriendsPreview />
            </div>
            <div>
              <DebtsPreview />
            </div>
          </div>

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Quick actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Link href="/dashboard/together/spaces">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <UsersIcon className="size-4" />
                    Create shared space
                  </Button>
                </Link>
                <Link href="/dashboard/together/friends">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <UserPlusIcon className="size-4" />
                    Find friends
                  </Button>
                </Link>
                <Link href="/dashboard/debts">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <HandCoinsIcon className="size-4" />
                    Record a debt
                  </Button>
                </Link>
                <Link href="/dashboard/transactions">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <BanknoteIcon className="size-4" />
                    Split a bill
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
