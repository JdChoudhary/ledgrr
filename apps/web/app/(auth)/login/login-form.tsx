"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient, signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  Loader2,
  ArrowRight,
  ShieldAlert,
  MailCheck,
} from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, email: e.target.value });
    if (unverifiedEmail) setUnverifiedEmail(null);
    if (resent) setResent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUnverifiedEmail(null);

    try {
      const { error } = await signIn.email({
        email: formData.email,
        password: formData.password,
        callbackURL: callbackUrl,
      });

      if (error) {
        const isUnverified =
          error.code === "EMAIL_NOT_VERIFIED" ||
          (error.status === 403 &&
            /verify your email|not verified|email verification/i.test(
              error.message || "",
            ));

        if (isUnverified) {
          setUnverifiedEmail(formData.email);
          toast.error("Please verify your email before signing in");
          return;
        }

        toast.error(error.message || "Invalid credentials");
        return;
      }

      toast.success("Welcome back");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch {
      toast.error("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setLoading(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: unverifiedEmail,
        callbackURL: "/verify-email?verified=1",
      });
      if (error) {
        toast.error(error.message || "Failed to resend verification email");
        return;
      }
      setResent(true);
      toast.success("Verification email sent — check your inbox");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm animate-fade-up">
      {/* Mobile logo */}
      <div className="mb-10 text-center lg:hidden">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <span className="text-primary-foreground text-xs font-bold">$</span>
          </div>
          <span className="text-base font-semibold tracking-tight">Ledgr</span>
        </Link>
      </div>

      {/* Back link */}
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        &larr; Back to home
      </Link>

      <h2 className="text-2xl font-semibold tracking-tighter">Sign in</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your email and password to access your account.
      </p>

      {unverifiedEmail && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="text-sm text-amber-700 dark:text-amber-400">
              {resent ? (
                <>
                  <p className="flex items-center gap-1.5 font-medium">
                    <MailCheck className="h-4 w-4" /> Verification email sent
                  </p>
                  <p className="mt-1 text-xs opacity-80">
                    Check your inbox — the link expires in 1 hour.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">
                    Please verify your email address
                  </p>
                  <p className="mt-1 text-xs opacity-80">
                    We&apos;ve emailed a verification link to{" "}
                    <span className="font-medium">{unverifiedEmail}</span>.
                    Click it to finish setting up your account.
                  </p>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    className="mt-2 text-xs font-semibold underline underline-offset-4 hover:no-underline"
                  >
                    Resend verification email
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-xs font-medium text-muted-foreground"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleEmailChange}
            className="h-11 rounded-xl"
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-xs font-medium text-muted-foreground"
            >
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-foreground underline underline-offset-4 hover:no-underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="h-11 rounded-xl"
            required
            autoComplete="current-password"
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
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            or continue with
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        className="h-11 w-full rounded-xl text-sm font-medium"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        Sign in with Google
      </Button>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
        >
          Create one
        </Link>
      </p>

      <p className="mt-4 text-center text-[11px] text-muted-foreground/80">
        By signing in you agree to our{" "}
        <Link
          href="/terms"
          className="underline underline-offset-4 hover:no-underline"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-4 hover:no-underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}