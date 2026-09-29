"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the household service. Mutations invalidate the
 * household list/detail plus everything scoped to a household (shared
 * categories, links and budgets), so the settings view stays in sync.
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];
type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

type HouseholdLookupInput = Parameters<typeof trpc.household.get.useQuery>[0];
type HouseholdCategoriesInput = Parameters<typeof trpc.household.listCategories.useQuery>[0];
type HouseholdLinksInput = Parameters<typeof trpc.household.listLinks.useQuery>[0];
type HouseholdBudgetsInput = Parameters<typeof trpc.household.listBudgets.useQuery>[0];
type HouseholdBudgetStatusInput = Parameters<typeof trpc.household.budgetStatus.useQuery>[0];
type HouseholdCategorySpendInput = Parameters<typeof trpc.household.categorySpend.useQuery>[0];

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useHouseholds(opts?: QueryOpts<typeof trpc.household.list.useQuery>) {
  const query = trpc.household.list.useQuery(undefined, opts as never);
  return { households: query.data, ...query };
}

export function useHousehold(
  input: HouseholdLookupInput | undefined | null,
  opts?: QueryOpts<typeof trpc.household.get.useQuery>,
) {
  const query = trpc.household.get.useQuery(input ?? skipToken, opts as never);
  return { household: query.data, ...query };
}

export function useHouseholdCategories(
  input: HouseholdCategoriesInput | undefined | null,
  opts?: QueryOpts<typeof trpc.household.listCategories.useQuery>,
) {
  const query = trpc.household.listCategories.useQuery(input ?? skipToken, opts as never);
  return { householdCategories: query.data, ...query };
}

export function useHouseholdLinks(
  input: HouseholdLinksInput | undefined | null,
  opts?: QueryOpts<typeof trpc.household.listLinks.useQuery>,
) {
  const query = trpc.household.listLinks.useQuery(input ?? skipToken, opts as never);
  return { householdLinks: query.data, ...query };
}

export function useHouseholdBudgets(
  input: HouseholdBudgetsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.household.listBudgets.useQuery>,
) {
  const query = trpc.household.listBudgets.useQuery(input ?? skipToken, opts as never);
  return { householdBudgets: query.data, ...query };
}

export function useHouseholdBudgetStatus(
  input: HouseholdBudgetStatusInput | undefined | null,
  opts?: QueryOpts<typeof trpc.household.budgetStatus.useQuery>,
) {
  const query = trpc.household.budgetStatus.useQuery(input ?? skipToken, opts as never);
  return { householdBudgetStatus: query.data, ...query };
}

export function useHouseholdCategorySpend(
  input: HouseholdCategorySpendInput | undefined | null,
  opts?: QueryOpts<typeof trpc.household.categorySpend.useQuery>,
) {
  const query = trpc.household.categorySpend.useQuery(input ?? skipToken, opts as never);
  return { householdCategorySpend: query.data, ...query };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

const invalidateHousehold = async (utils: ReturnType<typeof trpc.useUtils>) => {
  await Promise.all([
    utils.household.list.invalidate(),
    utils.household.get.invalidate(),
    utils.household.listCategories.invalidate(),
    utils.household.listLinks.invalidate(),
    utils.household.listBudgets.invalidate(),
    utils.household.budgetStatus.invalidate(),
    utils.household.categorySpend.invalidate(),
  ]);
};

export function useCreateHousehold(opts?: MutationOpts<typeof trpc.household.create.useMutation>) {
  const utils = trpc.useUtils();
  const mutation = trpc.household.create.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await invalidateHousehold(utils);
      opts?.onSuccess?.(...args);
    },
  });
  return {
    createHouseholdAsync: mutation.mutateAsync,
    createHousehold: mutation.mutate,
    ...mutation,
  };
}

export function useAddHouseholdMember(
  opts?: MutationOpts<typeof trpc.household.addMember.useMutation>,
) {
  const utils = trpc.useUtils();
  const mutation = trpc.household.addMember.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await invalidateHousehold(utils);
      opts?.onSuccess?.(...args);
    },
  });
  return {
    addHouseholdMemberAsync: mutation.mutateAsync,
    addHouseholdMember: mutation.mutate,
    ...mutation,
  };
}

export function useRemoveHouseholdMember(
  opts?: MutationOpts<typeof trpc.household.removeMember.useMutation>,
) {
  const utils = trpc.useUtils();
  const mutation = trpc.household.removeMember.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await invalidateHousehold(utils);
      opts?.onSuccess?.(...args);
    },
  });
  return {
    removeHouseholdMemberAsync: mutation.mutateAsync,
    removeHouseholdMember: mutation.mutate,
    ...mutation,
  };
}

export function useCreateHouseholdCategory(
  opts?: MutationOpts<typeof trpc.household.createCategory.useMutation>,
) {
  const utils = trpc.useUtils();
  const mutation = trpc.household.createCategory.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await invalidateHousehold(utils);
      opts?.onSuccess?.(...args);
    },
  });
  return {
    createHouseholdCategoryAsync: mutation.mutateAsync,
    createHouseholdCategory: mutation.mutate,
    ...mutation,
  };
}

export function useArchiveHouseholdCategory(
  opts?: MutationOpts<typeof trpc.household.archiveCategory.useMutation>,
) {
  const utils = trpc.useUtils();
  const mutation = trpc.household.archiveCategory.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await invalidateHousehold(utils);
      opts?.onSuccess?.(...args);
    },
  });
  return { archiveHouseholdCategoryAsync: mutation.mutateAsync, ...mutation };
}

export function useLinkHouseholdCategory(
  opts?: MutationOpts<typeof trpc.household.linkCategory.useMutation>,
) {
  const utils = trpc.useUtils();
  const mutation = trpc.household.linkCategory.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await invalidateHousehold(utils);
      opts?.onSuccess?.(...args);
    },
  });
  return { linkHouseholdCategoryAsync: mutation.mutateAsync, ...mutation };
}

export function useUnlinkHouseholdCategory(
  opts?: MutationOpts<typeof trpc.household.unlinkCategory.useMutation>,
) {
  const utils = trpc.useUtils();
  const mutation = trpc.household.unlinkCategory.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await invalidateHousehold(utils);
      opts?.onSuccess?.(...args);
    },
  });
  return { unlinkHouseholdCategoryAsync: mutation.mutateAsync, ...mutation };
}

export function useCreateHouseholdBudget(
  opts?: MutationOpts<typeof trpc.household.createBudget.useMutation>,
) {
  const utils = trpc.useUtils();
  const mutation = trpc.household.createBudget.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await invalidateHousehold(utils);
      opts?.onSuccess?.(...args);
    },
  });
  return {
    createHouseholdBudgetAsync: mutation.mutateAsync,
    createHouseholdBudget: mutation.mutate,
    ...mutation,
  };
}
