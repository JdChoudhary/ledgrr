"use client";

import * as React from "react";
import { EyeIcon, EyeOffIcon, KeyRoundIcon, Loader2Icon, ShieldCheckIcon } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePassword } from "~/hooks/api/auth";
import { useSession } from "~/lib/auth-client";

/**
 * Security tab — password change with proper re-authentication:
 * the CURRENT password is required (better-auth enforces it server-side),
 * the new password is confirmed, and other sessions can be revoked so a
 * stolen session elsewhere dies with the password change.
 */
export function SecurityTab() {
  const { data: sessionUser } = useSession();
  const hasPassword =
    // better-auth only exposes this for credential accounts; OAuth-only
    // users must use "forgot password" to set one first.
    sessionUser?.user?.emailVerified != null;

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [revokeOthers, setRevokeOthers] = React.useState(true);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const changePassword = useChangePassword({
    onSuccess: () => {
      toast.success("Password changed — other sessions revoked");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (message) => toast.error(message),
  });

  const passwordChecks = React.useMemo(
    () => [
      { label: "At least 8 characters", ok: newPassword.length >= 8 },
      { label: "A number", ok: /\d/.test(newPassword) },
      { label: "Upper and lower case", ok: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) },
    ],
    [newPassword],
  );
  const allChecksPass = passwordChecks.every((c) => c.ok);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    if (currentPassword === "") {
      setLocalError("Enter your current password to confirm it's you");
      return;
    }
    if (!allChecksPass) {
      setLocalError("New password doesn't meet the requirements yet");
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError("New passwords don't match");
      return;
    }

    await changePassword.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: revokeOthers,
    });
  };

  const fieldError = localError ?? changePassword.error;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-muted-foreground" />
            Change password
          </CardTitle>
          <CardDescription>
            For your security, enter your current password to make any change.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showNew ? "Hide password" : "Show password"}
                  >
                    {showNew ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Live strength checklist */}
            <div className="flex flex-wrap gap-2">
              {passwordChecks.map((check) => (
                <Badge
                  key={check.label}
                  variant="secondary"
                  className={
                    check.ok
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                      : "text-muted-foreground"
                  }
                >
                  {check.ok ? "✓" : "○"} {check.label}
                </Badge>
              ))}
            </div>

            {fieldError ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {fieldError}
              </p>
            ) : null}

            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={revokeOthers}
                onChange={(e) => setRevokeOthers(e.target.checked)}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                Sign out other devices
                <span className="block text-xs text-muted-foreground">
                  Recommended — any other signed-in session is revoked when
                  your password changes.
                </span>
              </span>
            </label>

            <Button
              type="submit"
              disabled={
                changePassword.isPending ||
                currentPassword === "" ||
                newPassword === "" ||
                confirmPassword === ""
              }
            >
              {changePassword.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <ShieldCheckIcon className="size-4" />
              )}
              {changePassword.isPending ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
