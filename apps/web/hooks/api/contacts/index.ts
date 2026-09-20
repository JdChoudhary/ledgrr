"use client";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the contacts service — the owner's private address
 * book (§15: friends don't need a Ledgr account).
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];
type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

export function useContacts(
  input?: Parameters<typeof trpc.contacts.list.useQuery>[0] | null,
  opts?: QueryOpts<typeof trpc.contacts.list.useQuery>,
) {
  const {
    data: contacts,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.contacts.list.useQuery(input ?? undefined, opts as never);

  return {
    contacts,
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

export function useCreateContact(
  opts?: MutationOpts<typeof trpc.contacts.create.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createContactAsync,
    mutate: createContact,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.contacts.create.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.contacts.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    createContactAsync,
    createContact,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUpdateContact(
  opts?: MutationOpts<typeof trpc.contacts.update.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: updateContactAsync,
    mutate: updateContact,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.contacts.update.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.contacts.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    updateContactAsync,
    updateContact,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useDeleteContact(
  opts?: MutationOpts<typeof trpc.contacts.delete.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: deleteContactAsync,
    mutate: deleteContact,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.contacts.delete.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.contacts.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    deleteContactAsync,
    deleteContact,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useLinkContact(
  opts?: MutationOpts<typeof trpc.contacts.link.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: linkContactAsync,
    mutate: linkContact,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.contacts.link.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.contacts.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    linkContactAsync,
    linkContact,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}
