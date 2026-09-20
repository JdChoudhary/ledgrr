"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldCheck, ShieldAlert, LogOut, Coins } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const user = session?.user;
  const isAdmin =
    !!user &&
    (user.role === "admin" || (user.role?.split(",").includes("admin") ?? false));

  useEffect(() => {
    if (!isPending && !user) {
      router.replace("/login?callbackUrl=/admin");
    }
  }, [isPending, user, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen flex-col gap-4 p-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
          <ShieldAlert className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Access denied
          </h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            You don&apos;t have permission to view the admin dashboard. Contact
            an administrator if you believe this is a mistake.
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm">Back to home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
                <span className="text-primary-foreground text-[11px] font-bold">
                  $
                </span>
              </div>
              <span className="text-sm font-semibold tracking-tight">Ledgr</span>
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-foreground"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <Link
              href="/admin/currencies"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Coins className="h-4 w-4" />
              Currencies
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium">{user.name}</p>
              <p className="text-[11px] text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {user.name?.charAt(0).toUpperCase() || "A"}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Sign out"
              onClick={async () => {
                await authClient.signOut();
                router.replace("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}
