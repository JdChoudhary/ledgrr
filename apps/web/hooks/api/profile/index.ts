"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the profile service — read-only view of the auth
 * user row. Identity changes (name, username, password) go through
 * better-auth client hooks in `hooks/api/auth`.
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];

export function useProfile(
  input?: Parameters<typeof trpc.profile.get.useQuery>[0] | null,
  opts?: QueryOpts<typeof trpc.profile.get.useQuery>,
) {
  const {
    data: profile,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.profile.get.useQuery(input ?? undefined, opts as never);

  return {
    profile,
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

export function useCheckUsername(
  input: Parameters<typeof trpc.profile.checkUsername.useQuery>[0] | undefined | null,
  opts?: QueryOpts<typeof trpc.profile.checkUsername.useQuery>,
) {
  const {
    data,
    error,
    isFetching,
    isPending,
  } = trpc.profile.checkUsername.useQuery(input ?? skipToken, opts as never);

  return {
    availability: data,
    error,
    isFetching,
    isPending,
  };
}
