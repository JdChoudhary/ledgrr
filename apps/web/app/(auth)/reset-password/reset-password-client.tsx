"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token: token ?? undefined,
      });
      if (error) {
        toast.error(error.message || "Failed to reset password");
        return;
      }
      setDone(true);
      toast.success("Password updated. Sign in with your new password.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <span className="text-xs font-bold text-primary-foreground">
              $
            </span>
          </div>
          <span className="text-base font-semibold tracking-tight">Ledgr</span>
        </Link>
      </div>

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        {error ? (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tighter">
              Link invalid or expired
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This password reset link is no longer valid. Please request a new
              one.
            </p>
            <Button
              className="h-11 w-full rounded-xl text-sm font-medium"
              render={<Link href="/forgot-password" aria-label="Request a new password reset link" />}
            >
              Request a new link
            </Button>
          </>
        ) : done ? (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h1 className="text-center text-2xl font-semibold tracking-tighter">
              Password updated
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Your password has been reset. You can now sign in with your new
              password.
            </p>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              &larr; Back to sign in
            </Link>
            <h1 className="text-2xl font-semibold tracking-tighter">
              Set a new password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a strong password you haven&apos;t used before.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-medium text-muted-foreground"
                >
                  New password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl"
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Confirm new password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 rounded-xl"
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <Button
                type="submit"
                className="h-11 w-full rounded-xl text-sm font-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}