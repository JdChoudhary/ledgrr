"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the friendship service.
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];
type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

type ListFriendshipsInput = Parameters<typeof trpc.friend.list.useQuery>[0];

export function useFriendships(
  input: ListFriendshipsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.friend.list.useQuery>,
) {
  const {
    data: friendships,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.friend.list.useQuery(input ?? skipToken, opts as never);

  return {
    friendships,
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

export function useSearchUsers(
  input: Parameters<typeof trpc.friend.searchUsers.useQuery>[0] | undefined | null,
  opts?: QueryOpts<typeof trpc.friend.searchUsers.useQuery>,
) {
  const {
    data: users,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.friend.searchUsers.useQuery(input ?? skipToken, opts as never);

  return {
    users,
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

/** Friend record derived from the enriched list hook (keeps tRPC inference). */
export type FriendRecord = NonNullable<
  ReturnType<typeof useFriendships>["friendships"]
>[number];

export function useSendFriendRequest(
  opts?: MutationOpts<typeof trpc.friend.sendRequest.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: sendFriendRequestAsync,
    mutate: sendFriendRequest,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.friend.sendRequest.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.friend.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    sendFriendRequestAsync,
    sendFriendRequest,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useRespondToFriendRequest(
  opts?: MutationOpts<typeof trpc.friend.respond.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: respondToFriendRequestAsync,
    mutate: respondToFriendRequest,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.friend.respond.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.friend.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    respondToFriendRequestAsync,
    respondToFriendRequest,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useRemoveFriend(
  opts?: MutationOpts<typeof trpc.friend.remove.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: removeFriendAsync,
    mutate: removeFriend,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.friend.remove.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.friend.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    removeFriendAsync,
    removeFriend,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useBlockUser(
  opts?: MutationOpts<typeof trpc.friend.block.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: blockUserAsync,
    mutate: blockUser,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.friend.block.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.friend.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    blockUserAsync,
    blockUser,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}

export function useUnblockUser(
  opts?: MutationOpts<typeof trpc.friend.unblock.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: unblockUserAsync,
    mutate: unblockUser,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.friend.unblock.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.friend.list.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    unblockUserAsync,
    unblockUser,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}
