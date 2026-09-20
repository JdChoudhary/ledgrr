"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the category-group service.
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];
type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

type ListCategoryGroupsInput = Parameters<typeof trpc.categoryGroup.list.useQuery>[0];
type GetCategoryGroupInput = Parameters<typeof trpc.categoryGroup.get.useQuery>[0];

export function useCategoryGroups(
  input: ListCategoryGroupsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.categoryGroup.list.useQuery>,
) {
  const {
    data: categoryGroups,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.categoryGroup.list.useQuery(input ?? skipToken, opts as never);

  return {
    categoryGroups,
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

export function useCategoryGroup(
  input: GetCategoryGroupInput | undefined | null,
  opts?: QueryOpts<typeof trpc.categoryGroup.get.useQuery>,
) {
  const {
    data: categoryGroup,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.categoryGroup.get.useQuery(input ?? skipToken, opts as never);

  return {
    categoryGroup,
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

export function useCreateCategoryGroup(
  opts?: MutationOpts<typeof trpc.categoryGroup.create.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createCategoryGroupAsync,
    mutate: createCategoryGroup,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.categoryGroup.create.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.categoryGroup.list.invalidate(),
        utils.categoryGroup.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    createCategoryGroupAsync,
    createCategoryGroup,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUpdateCategoryGroup(
  opts?: MutationOpts<typeof trpc.categoryGroup.update.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: updateCategoryGroupAsync,
    mutate: updateCategoryGroup,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.categoryGroup.update.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.categoryGroup.list.invalidate(),
        utils.categoryGroup.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    updateCategoryGroupAsync,
    updateCategoryGroup,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useArchiveCategoryGroup(
  opts?: MutationOpts<typeof trpc.categoryGroup.archive.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: archiveCategoryGroupAsync,
    mutate: archiveCategoryGroup,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.categoryGroup.archive.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.categoryGroup.list.invalidate(),
        utils.categoryGroup.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    archiveCategoryGroupAsync,
    archiveCategoryGroup,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUnarchiveCategoryGroup(
  opts?: MutationOpts<typeof trpc.categoryGroup.unarchive.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: unarchiveCategoryGroupAsync,
    mutate: unarchiveCategoryGroup,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.categoryGroup.unarchive.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.categoryGroup.list.invalidate(),
        utils.categoryGroup.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    unarchiveCategoryGroupAsync,
    unarchiveCategoryGroup,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}
