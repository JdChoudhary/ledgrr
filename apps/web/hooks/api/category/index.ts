"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the category service. Mutations invalidate the
 * category list automatically.
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];
type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

type ListCategoriesInput = Parameters<typeof trpc.category.list.useQuery>[0];
type GetCategoryInput = Parameters<typeof trpc.category.get.useQuery>[0];

export function useCategories(
  input: ListCategoriesInput | undefined | null,
  opts?: QueryOpts<typeof trpc.category.list.useQuery>,
) {
  const {
    data: categories,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.category.list.useQuery(input ?? skipToken, opts as never);

  return {
    categories,
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

export function useCategory(
  input: GetCategoryInput | undefined | null,
  opts?: QueryOpts<typeof trpc.category.get.useQuery>,
) {
  const {
    data: category,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.category.get.useQuery(input ?? skipToken, opts as never);

  return {
    category,
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

export function useCreateCategory(
  opts?: MutationOpts<typeof trpc.category.create.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createCategoryAsync,
    mutate: createCategory,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.category.create.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.category.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    createCategoryAsync,
    createCategory,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUpdateCategory(
  opts?: MutationOpts<typeof trpc.category.update.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: updateCategoryAsync,
    mutate: updateCategory,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.category.update.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.category.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    updateCategoryAsync,
    updateCategory,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useArchiveCategory(
  opts?: MutationOpts<typeof trpc.category.archive.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: archiveCategoryAsync,
    mutate: archiveCategory,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.category.archive.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.category.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    archiveCategoryAsync,
    archiveCategory,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUnarchiveCategory(
  opts?: MutationOpts<typeof trpc.category.unarchive.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: unarchiveCategoryAsync,
    mutate: unarchiveCategory,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.category.unarchive.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.category.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    unarchiveCategoryAsync,
    unarchiveCategory,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useMergeCategories(
  opts?: MutationOpts<typeof trpc.category.merge.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: mergeCategoriesAsync,
    mutate: mergeCategories,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.category.merge.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.category.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    mergeCategoriesAsync,
    mergeCategories,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}
