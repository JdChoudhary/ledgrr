"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  Loader2,
  MailCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const verified = searchParams.get("verified") === "1";
  const error = searchParams.get("error");

  const [resendEmail, setResendEmail] = useState(email);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) {
      toast.error("Enter your email address");
      return;
    }
    setLoading(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: resendEmail,
        callbackURL: "/verify-email?verified=1",
      });
      if (error) {
        toast.error(error.message || "Failed to resend verification email");
        return;
      }
      setSent(true);
      toast.success("Verification email sent");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <Card>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h1 className="text-center text-2xl font-semibold tracking-tighter">
          Email verified
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Your email address has been confirmed. You can now sign in to Ledgr.
        </p>
        <Button
          className="mt-8 h-11 w-full rounded-xl text-sm font-medium"
          onClick={() => router.push("/login")}
        >
          Continue to sign in
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </Card>
    );
  }

  if (error && !sent) {
    return (
      <Card>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-center text-2xl font-semibold tracking-tighter">
          Link invalid or expired
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          This verification link is no longer valid. Enter your email below to
          receive a new one.
        </p>
        <ResendForm
          email={resendEmail}
          setEmail={setResendEmail}
          onSubmit={handleResend}
          loading={loading}
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <MailCheck className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-center text-2xl font-semibold tracking-tighter">
        {sent ? "Verification email sent" : "Check your inbox"}
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {sent
          ? "A fresh verification link is on its way."
          : email
            ? `We sent a verification link to ${email}. Click the link in the email to confirm your account.`
            : "Enter your email to receive a verification link."}
      </p>
      <ResendForm
        email={resendEmail}
        setEmail={setResendEmail}
        onSubmit={handleResend}
        loading={loading}
      />
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Already verified?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
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
      <div className="rounded-2xl border bg-card p-8 shadow-sm">{children}</div>
    </div>
  );
}

function ResendForm({
  email,
  setEmail,
  onSubmit,
  loading,
}: {
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-xl"
          required
          autoComplete="email"
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
            Sending...
          </>
        ) : (
          "Resend verification email"
        )}
      </Button>
    </form>
  );
}