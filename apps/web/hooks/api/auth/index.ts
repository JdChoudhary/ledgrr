"use client";

import * as React from "react";

import { authClient } from "~/lib/auth-client";

/**
 * Action hooks around the better-auth client for account security and
 * identity changes. better-auth enforces the security rules server-side:
 *
 *  - changePassword requires the CURRENT password (re-authentication
 *    before credential change) and can revoke other sessions.
 *  - updateUser validates username format/uniqueness (username plugin).
 */

type AsyncState = {
  isPending: boolean;
  error: string | null;
  isSuccess: boolean;
};

function useAsyncAction<Args extends unknown[]>(
  action: (...args: Args) => Promise<{ data?: unknown; error?: { message?: string } | null }>,
) {
  const [state, setState] = React.useState<AsyncState>({
    isPending: false,
    error: null,
    isSuccess: false,
  });

  const run = React.useCallback(
    async (...args: Args): Promise<boolean> => {
      setState({ isPending: true, error: null, isSuccess: false });
      try {
        const result = await action(...args);
        if (result?.error) {
          setState({
            isPending: false,
            error: result.error.message ?? "Something went wrong",
            isSuccess: false,
          });
          return false;
        }
        setState({ isPending: false, error: null, isSuccess: true });
        return true;
      } catch (err) {
        setState({
          isPending: false,
          error: err instanceof Error ? err.message : "Something went wrong",
          isSuccess: false,
        });
        return false;
      }
    },
    [action],
  );

  return { ...state, run };
}

export function useChangePassword(opts?: {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}) {
  const action = React.useCallback(
    (input: {
      currentPassword: string;
      newPassword: string;
      revokeOtherSessions?: boolean;
    }) =>
      authClient.changePassword({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: input.revokeOtherSessions ?? true,
      }) as unknown as Promise<{ data?: unknown; error?: { message?: string } | null }>,
    [],
  );

  const state = useAsyncAction(action);

  const changePassword = React.useCallback(
    (input: {
      currentPassword: string;
      newPassword: string;
      revokeOtherSessions?: boolean;
    }) =>
      state.run(input).then((ok) => {
        if (ok) opts?.onSuccess?.();
        else if (state.error) opts?.onError?.(state.error);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.run, state.error, opts],
  );

  return {
    changePassword,
    changePasswordAsync: state.run,
    isPending: state.isPending,
    error: state.error,
    isSuccess: state.isSuccess,
  };
}

export function useUpdateAuthUser(opts?: {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}) {
  const action = React.useCallback(
    (input: { name?: string; username?: string; image?: string }) =>
      authClient.updateUser(input) as unknown as Promise<{
        data?: unknown;
        error?: { message?: string } | null;
      }>,
    [],
  );

  const state = useAsyncAction(action);

  const updateUser = React.useCallback(
    (input: { name?: string; username?: string; image?: string }) =>
      state.run(input).then((ok) => {
        if (ok) opts?.onSuccess?.();
        else if (state.error) opts?.onError?.(state.error);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.run, state.error, opts],
  );

  return {
    updateUser,
    updateUserAsync: state.run,
    isPending: state.isPending,
    error: state.error,
    isSuccess: state.isSuccess,
  };
}

export function useSignOut() {
  const action = React.useCallback(
    () => authClient.signOut() as unknown as Promise<{ data?: unknown }>,
    [],
  );
  const state = useAsyncAction(action);
  return { signOut: state.run, isPending: state.isPending };
}
