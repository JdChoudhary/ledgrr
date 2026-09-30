"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BanknoteIcon,
  HandCoinsIcon,
  UserPlusIcon,
} from "lucide-react";

import { cn } from "cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useFriendships } from "~/hooks/api/friendship";
import { useDebts } from "~/hooks/api/debt";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

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
  const friendships = useFriendships({});
  const debts = useDebts({});

  const allFriends = friendships.friendships ?? [];
  const friends = allFriends.filter((r) => r.status === "accepted");
  const pendingRequests = allFriends.filter(
    (r) => r.status === "pending" && r.direction === "incoming",
  );
  const allDebts = debts.debts ?? [];
  const openDebts = allDebts.filter((r) => r.status === "open" || r.status === "partially_settled");
  const owedToMe = openDebts
    .filter((r) => r.debt.creditorUserId != null)
    .reduce((acc, r) => acc + Number(r.outstandingAmount), 0);
  const owedByMe = openDebts
    .filter((r) => r.debt.debtorUserId != null)
    .reduce((acc, r) => acc + Number(r.outstandingAmount), 0);

  const isLoading = friendships.isPending || debts.isPending;

  return (
    <>
      <DashboardHeader
        title="Together"
        description="Manage shared finances, friends, and obligations"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/together/friends">
              <Button size="sm">
                <UserPlusIcon className="size-4" />
                Find friends
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-4 md:p-6">
        <div className="flex flex-col gap-6">
          {/* Summary stats */}
          {isLoading ? (
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
                  <span className="text-xs text-muted-foreground">Owed to you</span>
                  <span className="text-2xl font-semibold tabular-nums text-emerald-600">
                    {owedToMe > 0 ? `+${owedToMe.toFixed(0)}` : "—"}
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col gap-1 px-4 py-3">
                  <span className="text-xs text-muted-foreground">You owe</span>
                  <span className="text-2xl font-semibold tabular-nums text-red-600">
                    {owedByMe > 0 ? `−${owedByMe.toFixed(0)}` : "—"}
                  </span>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Two-column layout: Friends on left, Debts on right */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
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
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
