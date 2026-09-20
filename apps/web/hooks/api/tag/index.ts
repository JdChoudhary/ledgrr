"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the tag service.
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];
type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

type ListTagsInput = Parameters<typeof trpc.tag.list.useQuery>[0];
type GetTagInput = Parameters<typeof trpc.tag.get.useQuery>[0];
type ListTransactionTagsInput = Parameters<typeof trpc.tag.listTransactionTags.useQuery>[0];

export function useTags(
  input: ListTagsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.tag.list.useQuery>,
) {
  const {
    data: tags,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.tag.list.useQuery(input ?? skipToken, opts as never);

  return {
    tags,
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

export function useTag(
  input: GetTagInput | undefined | null,
  opts?: QueryOpts<typeof trpc.tag.get.useQuery>,
) {
  const {
    data: tag,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.tag.get.useQuery(input ?? skipToken, opts as never);

  return {
    tag,
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

export function useTransactionTags(
  input: ListTransactionTagsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.tag.listTransactionTags.useQuery>,
) {
  const {
    data: transactionTags,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.tag.listTransactionTags.useQuery(input ?? skipToken, opts as never);

  return {
    transactionTags,
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

export function useCreateTag(
  opts?: MutationOpts<typeof trpc.tag.create.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createTagAsync,
    mutate: createTag,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.tag.create.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.tag.list.invalidate(),
        utils.tag.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    createTagAsync,
    createTag,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUpdateTag(
  opts?: MutationOpts<typeof trpc.tag.update.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: updateTagAsync,
    mutate: updateTag,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.tag.update.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.tag.list.invalidate(),
        utils.tag.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    updateTagAsync,
    updateTag,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useArchiveTag(
  opts?: MutationOpts<typeof trpc.tag.archive.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: archiveTagAsync,
    mutate: archiveTag,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.tag.archive.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.tag.list.invalidate(),
        utils.tag.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    archiveTagAsync,
    archiveTag,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUnarchiveTag(
  opts?: MutationOpts<typeof trpc.tag.unarchive.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: unarchiveTagAsync,
    mutate: unarchiveTag,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.tag.unarchive.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.tag.list.invalidate(),
        utils.tag.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    unarchiveTagAsync,
    unarchiveTag,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useAttachTagToTransaction(
  opts?: MutationOpts<typeof trpc.tag.attachToTransaction.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: attachTagToTransactionAsync,
    mutate: attachTagToTransaction,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.tag.attachToTransaction.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.tag.listTransactionTags.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    attachTagToTransactionAsync,
    attachTagToTransaction,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useDetachTagFromTransaction(
  opts?: MutationOpts<typeof trpc.tag.detachFromTransaction.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: detachTagFromTransactionAsync,
    mutate: detachTagFromTransaction,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.tag.detachFromTransaction.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.tag.listTransactionTags.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    detachTagFromTransactionAsync,
    detachTagFromTransaction,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}
