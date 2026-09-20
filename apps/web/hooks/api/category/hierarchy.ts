"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Canonical category hierarchy shared by every category selector and display.
 *
 * Shape is stable regardless of data — always arrays, never null:
 *
 * ```ts
 * type CategoryResponse = {
 *   categoryGroups: { id: string; name: string; categories: { id: string; name: string }[] }[];
 *   ungroupedCategories: { id: string; name: string }[];
 * };
 * ```
 *
 * Every consumer (budget selection, transaction selection, filters, analytics
 * filters, future selectors) reads from this one structure.
 */

export type CategoryOption = { id: string; name: string };

export type CategoryGroupNode = {
  id: string;
  name: string;
  categories: CategoryOption[];
};

export type CategoryResponse = {
  categoryGroups: CategoryGroupNode[];
  ungroupedCategories: CategoryOption[];
};

type HierarchyInput = Parameters<typeof trpc.category.hierarchy.useQuery>[0];
type QueryOpts = Parameters<typeof trpc.category.hierarchy.useQuery>[1];

/** Loads the canonical category hierarchy for a space. */
export function useCategoryHierarchy(
  input: HierarchyInput | undefined | null,
  opts?: QueryOpts,
) {
  const {
    data: hierarchy,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.category.hierarchy.useQuery(input ?? skipToken, opts as never);

  return {
    hierarchy,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  };
}

/**
 * Flat value/label items for combobox-style selectors — grouped categories
 * first (in group order), then ungrouped ones. The value is always the
 * `category.id`.
 */
export function useCategoryOptions(
  input: HierarchyInput | undefined | null,
): {
  items: CategoryOption[];
  data: CategoryResponse | undefined;
  isPending: boolean;
} {
  const { hierarchy, isPending } = useCategoryHierarchy(input);

  const items: CategoryOption[] = [];
  for (const group of hierarchy?.categoryGroups ?? []) {
    for (const category of group.categories) {
      items.push(category);
    }
  }
  for (const category of hierarchy?.ungroupedCategories ?? []) {
    items.push(category);
  }

  return { items, data: hierarchy, isPending };
}
