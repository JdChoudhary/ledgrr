"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the account service.
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];
type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

type ListAccountsInput = Parameters<typeof trpc.account.list.useQuery>[0];
type GetAccountInput = Parameters<typeof trpc.account.get.useQuery>[0];
type ListAccountGrantsInput = Parameters<typeof trpc.account.listGrants.useQuery>[0];

/** Inferred account row returned by account.list / account.get. */
export type AccountRecord = NonNullable<
  ReturnType<typeof useAccounts>["accounts"]
>[number];

export function useAccounts(
  input: ListAccountsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.account.list.useQuery>,
) {
  const {
    data: accounts,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.account.list.useQuery(input ?? skipToken, opts as never);

  return {
    accounts,
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

export function useAccount(
  input: GetAccountInput | undefined | null,
  opts?: QueryOpts<typeof trpc.account.get.useQuery>,
) {
  const {
    data: account,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.account.get.useQuery(input ?? skipToken, opts as never);

  return {
    account,
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

export function useAccountGrants(
  input: ListAccountGrantsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.account.listGrants.useQuery>,
) {
  const {
    data: grants,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.account.listGrants.useQuery(input ?? skipToken, opts as never);

  return {
    grants,
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

export function useCreateAccount(
  opts?: MutationOpts<typeof trpc.account.create.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createAccountAsync,
    mutate: createAccount,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.account.create.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.account.list.invalidate(),
        utils.account.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    createAccountAsync,
    createAccount,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUpdateAccount(
  opts?: MutationOpts<typeof trpc.account.update.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: updateAccountAsync,
    mutate: updateAccount,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.account.update.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.account.list.invalidate(),
        utils.account.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    updateAccountAsync,
    updateAccount,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useArchiveAccount(
  opts?: MutationOpts<typeof trpc.account.archive.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: archiveAccountAsync,
    mutate: archiveAccount,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.account.archive.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.account.list.invalidate(),
        utils.account.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    archiveAccountAsync,
    archiveAccount,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUnarchiveAccount(
  opts?: MutationOpts<typeof trpc.account.unarchive.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: unarchiveAccountAsync,
    mutate: unarchiveAccount,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.account.unarchive.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await Promise.all([
        utils.account.list.invalidate(),
        utils.account.get.invalidate(),
      ]);
      opts?.onSuccess?.(...args);
    },
  });

  return {
    unarchiveAccountAsync,
    unarchiveAccount,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useGrantAccountAccess(
  opts?: MutationOpts<typeof trpc.account.grantAccess.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: grantAccountAccessAsync,
    mutate: grantAccountAccess,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.account.grantAccess.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.account.listGrants.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    grantAccountAccessAsync,
    grantAccountAccess,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useRevokeAccountAccess(
  opts?: MutationOpts<typeof trpc.account.revokeAccess.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: revokeAccountAccessAsync,
    mutate: revokeAccountAccess,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.account.revokeAccess.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.account.listGrants.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    revokeAccountAccessAsync,
    revokeAccountAccess,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}
