"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the space service.
 *
 * One file per service under hooks/api/<service>/. Query hooks accept the
 * procedure input (pass `undefined` to skip the query); mutation hooks add
 * cache invalidation so callers don't repeat it and can still hook
 * onSuccess/onError via the options pass-through.
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];
type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

type ListSpacesInput = Parameters<typeof trpc.space.listSpaces.useQuery>[0];
type GetSpaceInput = Parameters<typeof trpc.space.getSpace.useQuery>[0];
type ListSpaceMembersInput = Parameters<typeof trpc.space.listSpaceMembers.useQuery>[0];

export function useSpaces(
  input: ListSpacesInput | undefined | null,
  opts?: QueryOpts<typeof trpc.space.listSpaces.useQuery>,
) {
  const {
    data: spaces,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.space.listSpaces.useQuery(input ?? skipToken, opts as never);

  return {
    spaces,
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

export function useSpace(
  input: GetSpaceInput | undefined | null,
  opts?: QueryOpts<typeof trpc.space.getSpace.useQuery>,
) {
  const {
    data: space,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.space.getSpace.useQuery(input ?? skipToken, opts as never);

  return {
    space,
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

export function useSpaceMembers(
  input: ListSpaceMembersInput | undefined | null,
  opts?: QueryOpts<typeof trpc.space.listSpaceMembers.useQuery>,
) {
  const {
    data: spaceMembers,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.space.listSpaceMembers.useQuery(input ?? skipToken, opts as never);

  return {
    spaceMembers,
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

export function useCreatePersonalSpace(
  opts?: MutationOpts<typeof trpc.space.createPersonalSpace.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createPersonalSpaceAsync,
    mutate: createPersonalSpace,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.space.createPersonalSpace.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.space.listSpaces.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    createPersonalSpaceAsync,
    createPersonalSpace,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useCreateSharedSpace(
  opts?: MutationOpts<typeof trpc.space.createSharedSpace.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: createSharedSpaceAsync,
    mutate: createSharedSpace,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.space.createSharedSpace.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.space.listSpaces.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    createSharedSpaceAsync,
    createSharedSpace,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUpdateSpace(
  opts?: MutationOpts<typeof trpc.space.updateSpace.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: updateSpaceAsync,
    mutate: updateSpace,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.space.updateSpace.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.space.listSpaces.invalidate();
      await utils.space.getSpace.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    updateSpaceAsync,
    updateSpace,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useArchiveSpace(
  opts?: MutationOpts<typeof trpc.space.archiveSpace.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: archiveSpaceAsync,
    mutate: archiveSpace,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.space.archiveSpace.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.space.listSpaces.invalidate();
      await utils.space.getSpace.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    archiveSpaceAsync,
    archiveSpace,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUnarchiveSpace(
  opts?: MutationOpts<typeof trpc.space.unarchiveSpace.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: unarchiveSpaceAsync,
    mutate: unarchiveSpace,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.space.unarchiveSpace.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.space.listSpaces.invalidate();
      await utils.space.getSpace.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    unarchiveSpaceAsync,
    unarchiveSpace,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useAddSpaceMember(
  opts?: MutationOpts<typeof trpc.space.addSpaceMember.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: addSpaceMemberAsync,
    mutate: addSpaceMember,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.space.addSpaceMember.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.space.listSpaceMembers.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    addSpaceMemberAsync,
    addSpaceMember,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUpdateSpaceMemberRole(
  opts?: MutationOpts<typeof trpc.space.updateSpaceMemberRole.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: updateSpaceMemberRoleAsync,
    mutate: updateSpaceMemberRole,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.space.updateSpaceMemberRole.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.space.listSpaceMembers.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    updateSpaceMemberRoleAsync,
    updateSpaceMemberRole,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useRemoveSpaceMember(
  opts?: MutationOpts<typeof trpc.space.removeSpaceMember.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: removeSpaceMemberAsync,
    mutate: removeSpaceMember,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.space.removeSpaceMember.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.space.listSpaceMembers.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    removeSpaceMemberAsync,
    removeSpaceMember,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}
