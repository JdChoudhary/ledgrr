"use client";

import * as React from "react";
import {
  HomeIcon,
  Link2Icon,
  Loader2Icon,
  PlusIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "cn";

import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { useSession } from "~/lib/auth-client";
import {
  useCreateHousehold,
  useHousehold,
  useHouseholdBudgets,
  useHouseholdCategories,
  useHouseholdLinks,
  useHouseholds,
} from "~/hooks/api/household";
import {
  MembersSection,
  SharedBudgetsSection,
  SharedCategoriesSection,
} from "./household-sections";

// ---------------------------------------------------------------------------
// Small stat tile
// ---------------------------------------------------------------------------

function StatTile({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="block text-2xl font-semibold tabular-nums">{value}</span>
          {hint ? <span className="block text-[11px] text-muted-foreground">{hint}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Create-household form (used by the empty state and the toolbar)
// ---------------------------------------------------------------------------

function useHouseholdCreator() {
  const [name, setName] = React.useState("");
  const createHousehold = useCreateHousehold({
    onSuccess: () => {
      toast.success("Household created");
      setName("");
    },
    onError: (err) => toast.error(err.message),
  });

  return {
    name,
    setName,
    isPending: createHousehold.isPending,
    create: () => createHousehold.createHousehold({ name: name.trim() }),
    canCreate: createHousehold.isPending || name.trim() === "",
  };
}

function EmptyState() {
  const creator = useHouseholdCreator();

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <HomeIcon className="size-6 text-muted-foreground" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">Set up your household</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Pool categories and budgets with the people you live with. Everyone
            keeps their own transactions private — only the categories you link
            are shared.
          </p>
        </div>
        <div className="flex w-full max-w-sm items-center gap-2">
          <Input
            placeholder="e.g. Family, Flat 4B…"
            value={creator.name}
            onChange={(e) => creator.setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !creator.canCreate) creator.create();
            }}
            className="h-9"
          />
          <Button size="sm" disabled={creator.canCreate} onClick={creator.create}>
            {creator.isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <PlusIcon className="size-3.5" />
            )}
            Create
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Household view — dashboard page
// ---------------------------------------------------------------------------

export function HouseholdView() {
  const session = useSession();
  const selfUserId = session.data?.user?.id ?? null;

  const households = useHouseholds();
  const [requestedId, setRequestedId] = React.useState<string | null>(null);
  const creator = useHouseholdCreator();

  const list = households.households ?? [];
  // Derive the effective selection rather than syncing it in an effect: the
  // requested household may not exist (yet), so fall back to the first one.
  const selectedId =
    requestedId && list.some((h) => h.household.id === requestedId)
      ? requestedId
      : (list[0]?.household.id ?? null);

  const detail = useHousehold(selectedId ? { householdId: selectedId } : null);
  const categories = useHouseholdCategories(selectedId ? { householdId: selectedId } : null);
  const links = useHouseholdLinks(selectedId ? { householdId: selectedId } : null);
  const budgets = useHouseholdBudgets(selectedId ? { householdId: selectedId } : null);

  const isOwner = detail.household?.role === "owner";

  const members = detail.household?.members ?? [];
  const activeCategories = (categories.householdCategories ?? []).filter((c) => !c.archivedAt);
  const myLinks = (links.householdLinks ?? []).filter((l) => l.userId === selfUserId);
  const sharedBudgets = budgets.householdBudgets ?? [];
  const sharedCategoryOptions = categories.householdCategories ?? [];

  const isLoading = households.isPending || (selectedId != null && detail.isPending);

  return (
    <>
      <DashboardHeader
        title="Household"
        description="Shared categories and budgets for the people you live with"
      />

      <div className="p-4 md:p-6">
        <div className="flex flex-col gap-6">
          {isLoading ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
              <Skeleton className="h-64 w-full" />
            </>
          ) : list.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Household switcher + create */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {list.map((h) => (
                    <button
                      key={h.household.id}
                      type="button"
                      onClick={() => setRequestedId(h.household.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-all",
                        h.household.id === selectedId
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/50 hover:bg-muted/40",
                      )}
                    >
                      {h.household.name}
                      <Badge variant="secondary" className="text-[10px]">
                        {h.memberCount}
                      </Badge>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="New household name"
                    value={creator.name}
                    onChange={(e) => creator.setName(e.target.value)}
                    className="h-9 max-w-56"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={creator.canCreate}
                    onClick={creator.create}
                  >
                    {creator.isPending ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <PlusIcon className="size-3.5" />
                    )}
                    Create
                  </Button>
                </div>
              </div>

              {selectedId && detail.household ? (
                <>
                  {/* Summary stats */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatTile
                      label="Members"
                      value={members.length}
                      icon={UsersIcon}
                      hint={isOwner ? "You manage this household" : "Owner manages members"}
                    />
                    <StatTile
                      label="Shared categories"
                      value={activeCategories.length}
                      icon={Link2Icon}
                      hint={`${myLinks.length} linked by you`}
                    />
                    <StatTile
                      label="Shared budgets"
                      value={sharedBudgets.length}
                      icon={TargetIcon}
                      hint="Everyone's spend combined"
                    />
                    <StatTile
                      label="Your role"
                      value={
                        <span className="text-xl font-semibold capitalize">
                          {detail.household.role}
                        </span>
                      }
                      icon={HomeIcon}
                      hint={detail.household.household.name}
                    />
                  </div>

                  {/* Main layout */}
                  <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold">Shared categories</CardTitle>
                        <CardDescription className="text-xs">
                          Link your own categories to a shared one — a shared budget then
                          counts everyone&apos;s spending on it.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <SharedCategoriesSection
                          householdId={selectedId}
                          isOwner={isOwner}
                          categories={sharedCategoryOptions}
                          links={links.householdLinks ?? []}
                          selfUserId={selfUserId}
                          isLoading={categories.isPending || links.isPending}
                          showHeading={false}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold">Members</CardTitle>
                        <CardDescription className="text-xs">
                          {members.length} in {detail.household.household.name}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <MembersSection
                          householdId={selectedId}
                          members={members}
                          isOwner={isOwner}
                          selfUserId={selfUserId}
                          showHeading={false}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Shared budgets */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">Shared budgets</CardTitle>
                      <CardDescription className="text-xs">
                        Live spend across every member linked to each shared category.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SharedBudgetsSection
                        isOwner={isOwner}
                        sharedCategories={sharedCategoryOptions}
                        budgets={sharedBudgets}
                        isLoading={budgets.isPending || categories.isPending}
                        showHeading={false}
                      />
                    </CardContent>
                  </Card>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Household not found.</p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
