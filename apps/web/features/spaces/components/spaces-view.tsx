"use client";

import * as React from "react";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  MoreVerticalIcon,
  PlusIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react";
import { format } from "date-fns";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useSession } from "~/lib/auth-client";
import {
  useArchiveSpace,
  useSpaces,
  useUnarchiveSpace,
} from "~/hooks/api/space";
import { cn } from "cn";

import { CURRENCY_SYMBOLS, SPACE_TYPE_META } from "../lib/constants";
import { CreateSpaceDialog } from "./create-space-dialog";
import { SpaceMembersDialog } from "./space-members-dialog";
import { EditSpaceDialog } from "./edit-space-dialog";

type SpaceRow = NonNullable<ReturnType<typeof useSpaces>["spaces"]>[number];

/**
 * Spaces — every action on spaces in one place:
 *
 *   - Grid of space cards (type icon, flags, your role, archived state)
 *   - Create a shared space (type, name, description, currency, capabilities)
 *   - Members: list with roles, add member, change role, remove, leave
 *   - Edit: name, description, base currency
 *   - Archive / restore
 */
export function SpacesView() {
  const { data: sessionUser } = useSession();
  const selfUserId = sessionUser?.user?.id ?? null;

  const [filter, setFilter] = React.useState<"active" | "archived">("active");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<SpaceRow | null>(null);
  const [membersTarget, setMembersTarget] = React.useState<SpaceRow | null>(null);

  const spacesQuery = useSpaces({});

  const archiveSpace = useArchiveSpace({
    onSuccess: () => toast.success("Space archived"),
    onError: (err) => toast.error(err.message),
  });
  const unarchiveSpace = useUnarchiveSpace({
    onSuccess: () => toast.success("Space restored"),
    onError: (err) => toast.error(err.message),
  });

  const all = spacesQuery.spaces ?? [];
  const rows = all.filter((r) =>
    filter === "archived" ? r.space.archivedAt != null : r.space.archivedAt == null,
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={filter}
          onValueChange={(v) => v && setFilter(v as "active" | "archived")}
        >
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" />
          New space
        </Button>
      </div>

      {/* Grid */}
      {spacesQuery.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <UsersIcon className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">
              {filter === "archived" ? "No archived spaces" : "No spaces yet"}
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              {filter === "archived"
                ? "Archived spaces are kept here — restore one anytime."
                : "Create a shared space to track money together — trips, households, couples and more."}
            </p>
            {filter === "active" ? (
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-4" />
                New space
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const meta =
              SPACE_TYPE_META[row.space.type] ?? SPACE_TYPE_META.personal;
            const TypeIcon = meta.icon;
            const role = row.role;
            const isArchived = row.space.archivedAt != null;
            return (
              <Card
                key={row.membershipId}
                className={cn(
                  "group relative transition-all hover:shadow-sm",
                  isArchived && "opacity-70",
                )}
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        meta.color,
                      )}
                    >
                      <TypeIcon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {row.space.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {meta.label} ·{" "}
                        {row.space.baseCurrency in CURRENCY_SYMBOLS
                          ? CURRENCY_SYMBOLS[row.space.baseCurrency]
                          : ""}{" "}
                        {row.space.baseCurrency}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                        aria-label="Space actions"
                      >
                        <MoreVerticalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditTarget(row)}>
                          <Settings2Icon className="size-4" />
                          Edit space
                        </DropdownMenuItem>
                        {row.space.type !== "personal" ? (
                          <DropdownMenuItem onClick={() => setMembersTarget(row)}>
                            <UsersIcon className="size-4" />
                            Members
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        {isArchived ? (
                          <DropdownMenuItem
                            onClick={() =>
                              unarchiveSpace.unarchiveSpace({
                                spaceId: row.space.id,
                              })
                            }
                          >
                            <ArchiveRestoreIcon className="size-4" />
                            Restore
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() =>
                              archiveSpace.archiveSpace({ spaceId: row.space.id })
                            }
                          >
                            <ArchiveIcon className="size-4" />
                            Archive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {row.space.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {row.space.description}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", meta.color)}
                    >
                      {meta.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        role === "owner"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : role === "admin"
                            ? "border-blue-500/30 bg-blue-500/10 text-blue-600"
                            : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {role}
                    </Badge>
                    {row.space.sharedLedger ? (
                      <Badge variant="secondary" className="text-[10px]">
                        shared ledger
                      </Badge>
                    ) : null}
                    {row.space.billSplitting ? (
                      <Badge variant="secondary" className="text-[10px]">
                        splits
                      </Badge>
                    ) : null}
                    {row.space.budgeting ? (
                      <Badge variant="secondary" className="text-[10px]">
                        budgets
                      </Badge>
                    ) : null}
                  </div>

                  <p className="text-[10px] text-muted-foreground">
                    {isArchived
                      ? `Archived ${format(new Date(row.space.archivedAt ?? Date.now()), "MMM d, yyyy")}`
                      : `Created ${format(new Date(row.space.createdAt), "MMM d, yyyy")}`}
                  </p>

                  {row.space.type !== "personal" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setMembersTarget(row)}
                    >
                      <UsersIcon className="size-4" />
                      Manage members
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CreateSpaceDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editTarget ? (
        <EditSpaceDialog
          open={editTarget != null}
          onOpenChange={(open) => !open && setEditTarget(null)}
          space={editTarget.space}
        />
      ) : null}
      {membersTarget && selfUserId ? (
        <SpaceMembersDialog
          open={membersTarget != null}
          onOpenChange={(open) => !open && setMembersTarget(null)}
          spaceId={membersTarget.space.id}
          spaceName={membersTarget.space.name}
          spaceType={membersTarget.space.type}
          selfUserId={selfUserId}
          selfRole={membersTarget.role}
        />
      ) : null}
    </div>
  );
}
