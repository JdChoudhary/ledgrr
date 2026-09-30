"use client";

import * as React from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  GripVerticalIcon,
  PencilIcon,
  TagsIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";

import { toast } from "@/components/ui/toast";
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

import {
  useCategoryGroups,
  useUpdateCategoryGroup,
} from "~/hooks/api/category-group";
import { useCategories, useUpdateCategory } from "~/hooks/api/category";

type Group = NonNullable<
  ReturnType<typeof useCategoryGroups>["categoryGroups"]
>[number];
type Category = NonNullable<ReturnType<typeof useCategories>["categories"]>[number];

type Renaming = { kind: "group" | "category"; id: string };

function EditableRow({
  name,
  color,
  indent,
  index,
  count,
  onMove,
  isRenaming,
  renameValue,
  onRenameChange,
  onStartRename,
  onCancelRename,
  onConfirmRename,
}: {
  name: string;
  color?: string;
  indent?: boolean;
  index: number;
  count: number;
  onMove: (direction: "up" | "down") => void;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (value: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onConfirmRename: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2",
        indent && "ml-5",
      )}
    >
      <GripVerticalIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
      {color && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}

      {isRenaming ? (
        <>
          <Input
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirmRename();
              if (e.key === "Escape") onCancelRename();
            }}
            className="h-7 flex-1 text-sm"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-emerald-500"
            onClick={onConfirmRename}
          >
            <CheckIcon className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onCancelRename}>
            <XIcon className="size-3.5" />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 truncate text-sm">{name}</span>
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={index === 0}
              onClick={() => onMove("up")}
            >
              <ArrowUpIcon className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={index === count - 1}
              onClick={() => onMove("down")}
            >
              <ArrowDownIcon className="size-3" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onStartRename}>
              <PencilIcon className="size-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Categories tab — edit the space's category groups and categories. Reorder
 * (↑/↓ swaps `sortOrder` with the neighbouring row) and rename, modeled on
 * the reference settings page's category list.
 */
export function CategoriesTab() {
  const categories = useCategories({});
  const categoryGroups = useCategoryGroups({});

  const [renaming, setRenaming] = React.useState<Renaming | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  const { updateCategoryGroupAsync } = useUpdateCategoryGroup();
  const { updateCategoryAsync } = useUpdateCategory();

  const allCategories = (categories.categories ?? []).filter(
    (c) => !c.archivedAt,
  );
  const groups = [...(categoryGroups.categoryGroups ?? [])]
    .filter((g) => !g.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const grouped = (groupId: string | null) =>
    allCategories
      .filter((c) => c.groupId === groupId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const reorderGroups = async (
    list: Group[],
    index: number,
    direction: "up" | "down",
  ) => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return;

    const a = list[index];
    const b = list[swapIndex];
    try {
      await Promise.all([
        updateCategoryGroupAsync({
          categoryGroupId: a.id,
          sortOrder: b.sortOrder,
        }),
        updateCategoryGroupAsync({
          categoryGroupId: b.id,
          sortOrder: a.sortOrder,
        }),
      ]);
      toast.success("Groups reordered");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder");
    }
  };

  const reorderCategories = async (
    list: Category[],
    index: number,
    direction: "up" | "down",
  ) => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return;

    const a = list[index];
    const b = list[swapIndex];
    try {
      await Promise.all([
        updateCategoryAsync({
          categoryId: a.id,
          sortOrder: b.sortOrder,
        }),
        updateCategoryAsync({
          categoryId: b.id,
          sortOrder: a.sortOrder,
        }),
      ]);
      toast.success("Categories reordered");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder");
    }
  };

  const startRename = (kind: Renaming["kind"], id: string, name: string) => {
    setRenaming({ kind, id });
    setRenameValue(name);
  };

  const cancelRename = () => {
    setRenaming(null);
    setRenameValue("");
  };

  const confirmRename = async () => {
    if (!renaming) return;
    const name = renameValue.trim();
    if (!name) {
      cancelRename();
      return;
    }

    try {
      if (renaming.kind === "group") {
        await updateCategoryGroupAsync({
          categoryGroupId: renaming.id,
          name,
        });
      } else {
        await updateCategoryAsync({
          categoryId: renaming.id,
          name,
        });
      }
      toast.success("Renamed");
      cancelRename();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename");
    }
  };

  const loading = categories.isPending || categoryGroups.isPending;
  const isEmpty = groups.length === 0 && allCategories.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TagsIcon className="size-4 text-muted-foreground" />
          Categories
        </CardTitle>
        <CardDescription>
          Reorder or rename your category groups and categories. Hover a row
          for the arrow and edit controls.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : isEmpty ? (
          <p className="py-4 text-sm text-muted-foreground">
            No categories yet. Add some from a transaction.
          </p>
        ) : (
          <div className="space-y-5">
            {groups.map((group, gi) => {
              const groupCats = grouped(group.id);
              const isGroupRenaming =
                renaming?.kind === "group" && renaming.id === group.id;
              return (
                <div key={group.id} className="space-y-1">
                  <EditableRow
                    name={group.name}
                    index={gi}
                    count={groups.length}
                    onMove={(d) => void reorderGroups(groups, gi, d)}
                    isRenaming={isGroupRenaming}
                    renameValue={renameValue}
                    onRenameChange={setRenameValue}
                    onStartRename={() =>
                      startRename("group", group.id, group.name)
                    }
                    onCancelRename={cancelRename}
                    onConfirmRename={() => void confirmRename()}
                  />
                  {groupCats.map((cat, ci) => (
                    <EditableRow
                      key={cat.id}
                      name={cat.name}
                      color={cat.color}
                      indent
                      index={ci}
                      count={groupCats.length}
                      onMove={(d) =>
                        void reorderCategories(groupCats, ci, d)
                      }
                      isRenaming={
                        renaming?.kind === "category" &&
                        renaming.id === cat.id
                      }
                      renameValue={renameValue}
                      onRenameChange={setRenameValue}
                      onStartRename={() =>
                        startRename("category", cat.id, cat.name)
                      }
                      onCancelRename={cancelRename}
                      onConfirmRename={() => void confirmRename()}
                    />
                  ))}
                </div>
              );
            })}

            {grouped(null).length > 0 && (
              <div className="space-y-1">
                <p className="px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  Ungrouped
                </p>
                {grouped(null).map((cat, ci) => (
                  <EditableRow
                    key={cat.id}
                    name={cat.name}
                    color={cat.color}
                    index={ci}
                    count={grouped(null).length}
                    onMove={(d) => void reorderCategories(grouped(null), ci, d)}
                    isRenaming={
                      renaming?.kind === "category" && renaming.id === cat.id
                    }
                    renameValue={renameValue}
                    onRenameChange={setRenameValue}
                    onStartRename={() =>
                      startRename("category", cat.id, cat.name)
                    }
                    onCancelRename={cancelRename}
                    onConfirmRename={() => void confirmRename()}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}