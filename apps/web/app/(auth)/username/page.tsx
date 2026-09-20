"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { Loader2, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

export default function UsernameSetupPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  // Redirect if already has username
  useEffect(() => {
    if (!isPending && session?.user?.username) {
      router.push("/dashboard");
    }
  }, [session, isPending, router]);

  // Debounced availability check
  useEffect(() => {
    if (username.length < 3) {
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await fetch(
          `/api/auth/check-username?username=${encodeURIComponent(username)}`,
        );
        const data = await res.json();
        setAvailable(data.available);
      } catch {
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    if (available === false) {
      toast.error("Username is already taken");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.updateUser({
        username: username.toLowerCase(),
      });

      if (error) {
        toast.error(error.message || "Failed to set username");
        return;
      }

      toast.success("Username set! Welcome aboard.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grain flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
            <span className="text-primary-foreground text-sm font-bold">$</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tighter">
            Choose a username
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This will be your public identity on Ledgr.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="username"
              className="text-xs font-medium text-muted-foreground"
            >
              Username
            </Label>
            <div className="relative">
              <Input
                id="username"
                type="text"
                placeholder="alexchen"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setAvailable(null);
                }}
                className="h-11 rounded-xl pr-10"
                required
                autoComplete="username"
                minLength={3}
                maxLength={30}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checking && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!checking && available === true && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                {!checking && available === false && (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Letters, numbers, and underscores only. 3–30 characters.
              </p>
              {available === false && (
                <p className="text-xs text-red-500">Taken</p>
              )}
              {available === true && (
                <p className="text-xs text-emerald-500">Available</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-xl text-sm font-medium"
            disabled={
              loading || checking || available === false || username.length < 3
            }
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting username...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
