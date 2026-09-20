"use client";

import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, Plus } from "lucide-react";
import type { Category, CategoryGroup } from "@/features/transactions/lib/types";

interface CategoryPickerProps {
  categories: Category[];
  categoryGroups: CategoryGroup[];
  selectedId: string;
  onSelect: (categoryId: string) => void;
  onCustom: () => void;
  isCustom: boolean;
  customValue: string;
  onCustomValueChange: (value: string) => void;
  onCancelCustom: () => void;
  txType: "expense" | "income";
}

export function CategoryPicker({
  categories,
  categoryGroups,
  selectedId,
  onSelect,
  onCustom,
  isCustom,
  customValue,
  onCustomValueChange,
  onCancelCustom,
  txType,
}: CategoryPickerProps) {
  const [search, setSearch] = useState("");

  // Filter by type, deduplicate by name
  const typedCategories = useMemo(() => {
    const seen = new Set<string>();
    return categories.filter((c) => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return c.type === txType;
    });
  }, [categories, txType]);

  // Sort by transactionCount (most-used first), take top 6 as "pinned"
  const pinnedCategories = useMemo(() => {
    return [...typedCategories]
      .sort((a, b) => (b.transactionCount || 0) - (a.transactionCount || 0))
      .slice(0, 6);
  }, [typedCategories]);

  // Group remaining by category groups
  const groupedCategories = useMemo(() => {
    const pinnedIds = new Set(pinnedCategories.map((c) => c.id));
    const remaining = typedCategories.filter((c) => !pinnedIds.has(c.id));

    if (search.trim()) {
      const q = search.toLowerCase();
      return remaining.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.groupId?.toLowerCase().includes(q)
      );
    }

    // Group by groupId
    const groupMap = new Map<string | null, Category[]>();
    for (const c of remaining) {
      const gid = c.groupId ?? null;
      if (!groupMap.has(gid)) groupMap.set(gid, []);
      groupMap.get(gid)!.push(c);
    }

    const result: { groupName: string | null; categories: Category[] }[] = [];
    const sortedGroups = categoryGroups
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    for (const g of sortedGroups) {
      const cats = groupMap.get(g.id);
      if (cats && cats.length > 0) {
        result.push({ groupName: g.name, categories: cats });
      }
    }
    const ungrouped = groupMap.get(null);
    if (ungrouped && ungrouped.length > 0) {
      result.push({ groupName: null, categories: ungrouped });
    }

    return result;
  }, [typedCategories, pinnedCategories, categoryGroups, search]);

  const handleSelect = (categoryId: string) => {
    onSelect(categoryId);
    setSearch("");
  };

  return (
    <div className="space-y-3">
      {/* Custom category input */}
      {isCustom ? (
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Category name"
            value={customValue}
            onChange={(e) => onCustomValueChange(e.target.value)}
            autoFocus
            className="h-9 text-sm rounded-lg"
          />
          <button
            type="button"
            onClick={onCancelCustom}
            className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          {/* Pinned most-used */}
          {pinnedCategories.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 px-0.5">
                Most used
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {pinnedCategories.map((cat) => {
                  const selected = cat.id === selectedId;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelect(cat.id)}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all duration-150",
                        selected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/40 hover:border-border hover:bg-muted/30"
                      )}
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || "#64748b" }}
                      />
                      <span className="text-xs font-medium truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs rounded-lg"
            />
          </div>

          {/* Grouped categories */}
          <div className="max-h-40 overflow-y-auto space-y-3">
            {Array.isArray(groupedCategories) &&
              (groupedCategories as { groupName: string | null; categories: Category[] }[]).map((group) => (
                <div key={group.groupName ?? "ungrouped"}>
                  {group.groupName && (
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 px-0.5">
                      {group.groupName}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-1">
                    {group.categories.map((cat: Category) => {
                      const selected = cat.id === selectedId;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelect(cat.id)}
                          className={cn(
                            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors",
                            selected
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <div
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color || "#64748b" }}
                          />
                          <span className="text-xs truncate">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>

          {/* Add custom */}
          <button
            type="button"
            onClick={onCustom}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline px-1"
          >
            <Plus className="h-3 w-3" />
            Add custom category
          </button>
        </>
      )}
    </div>
  );
}
