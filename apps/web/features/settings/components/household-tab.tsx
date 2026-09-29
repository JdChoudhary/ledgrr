"use client";

import * as React from "react";
import { HomeIcon, PlusIcon, Loader2Icon } from "lucide-react";
import { cn } from "cn";

import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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
} from "~/features/household/components/household-sections";

/**
 * Household tab — additive family/household sharing.
 *
 * Members keep their own categories and *link* one to a shared household
 * category; a shared budget on that category then sums every linked member's
 * spending. The owner manages membership and shared items.
 */
export function HouseholdTab() {
  const session = useSession();
  const selfUserId = session.data?.user?.id ?? null;

  const households = useHouseholds();

  const [requestedId, setRequestedId] = React.useState<string | null>(null);

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

  const [newHouseholdName, setNewHouseholdName] = React.useState("");
  const createHousehold = useCreateHousehold({
    onSuccess: () => {
      toast.success("Household created");
      setNewHouseholdName("");
    },
    onError: (err) => toast.error(err.message),
  });

  const isOwner = detail.household?.role === "owner";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HomeIcon className="size-4 text-muted-foreground" />
          Household & family
        </CardTitle>
        <CardDescription>
          Share categories and budgets with the people you pool money with. Your
          personal data stays private — only what you link is shared.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {households.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <>
            {/* Household list + create */}
            <div className="space-y-2">
              {list.length > 0 ? (
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
              ) : (
                <p className="text-sm text-muted-foreground">
                  No household yet. Create one to start sharing budgets.
                </p>
              )}

              <div className="flex items-center gap-2">
                <Input
                  placeholder="New household name"
                  value={newHouseholdName}
                  onChange={(e) => setNewHouseholdName(e.target.value)}
                  className="h-9 max-w-60"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={createHousehold.isPending || newHouseholdName.trim() === ""}
                  onClick={() => createHousehold.createHousehold({ name: newHouseholdName.trim() })}
                >
                  {createHousehold.isPending ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <PlusIcon className="size-3.5" />
                  )}
                  Create
                </Button>
              </div>
            </div>

            {/* Selected household */}
            {selectedId ? (
              detail.isPending ? (
                <Skeleton className="h-40 w-full" />
              ) : detail.household ? (
                <div className="space-y-6 border-t border-border/50 pt-5">
                  <MembersSection
                    householdId={selectedId}
                    members={detail.household.members}
                    isOwner={isOwner}
                    selfUserId={selfUserId}
                  />

                  <SharedCategoriesSection
                    householdId={selectedId}
                    isOwner={isOwner}
                    categories={categories.householdCategories ?? []}
                    links={links.householdLinks ?? []}
                    selfUserId={selfUserId}
                    isLoading={categories.isPending || links.isPending}
                  />

                  <SharedBudgetsSection
                    isOwner={isOwner}
                    sharedCategories={categories.householdCategories ?? []}
                    budgets={budgets.householdBudgets ?? []}
                    isLoading={budgets.isPending || categories.isPending}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Household not found.</p>
              )
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
