"use client";

import { skipToken } from "@tanstack/react-query";

import { trpc } from "~/trpc/client";

/**
 * Data-access hooks for the user-settings service.
 */

type QueryOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[1];
type MutationOpts<TProcedure extends (...args: any) => any> = Parameters<TProcedure>[0];

type GetUserSettingsInput = Parameters<typeof trpc.userSettings.get.useQuery>[0];

export function useUserSettings(
  input: GetUserSettingsInput | undefined | null,
  opts?: QueryOpts<typeof trpc.userSettings.get.useQuery>,
) {
  const {
    data: userSettings,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFetching,
    isFetched,
    isLoading,
    status,
    refetch,
  } = trpc.userSettings.get.useQuery(input ?? skipToken, opts as never);

  return {
    userSettings,
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

export function useUpdateUserSettings(
  opts?: MutationOpts<typeof trpc.userSettings.update.useMutation>,
) {
  const utils = trpc.useUtils();
  const {
    mutateAsync: updateUserSettingsAsync,
    mutate: updateUserSettings,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  } = trpc.userSettings.update.useMutation({
    ...(opts as any),
    onSuccess: async (...args) => {
      await utils.userSettings.get.invalidate();
      opts?.onSuccess?.(...args);
    },
  });

  return {
    updateUserSettingsAsync,
    updateUserSettings,
    error,
    isError,
    isPending,
    isSuccess,
    status,
  };
}
