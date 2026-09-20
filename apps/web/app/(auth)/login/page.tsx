import { Suspense } from "react";
import Link from "next/link";
import { Loader2, TrendingUp } from "lucide-react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="grain flex min-h-screen">
      {/* Left: Brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-foreground lg:flex lg:flex-col lg:justify-between p-12 text-background">
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-emerald-500/20 blur-[100px]" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-500/10 blur-[80px]" />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500">
              <span className="text-white text-xs font-bold">$</span>
            </div>
            <span className="text-base font-semibold tracking-tight">
              Ledgr
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tighter lg:text-5xl">
            Welcome
            <br />
            back.
          </h1>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-background/50">
            Pick up right where you left off. Your financial dashboard is
            waiting.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-background/10 bg-background/5 p-4 backdrop-blur-sm">
              <p className="text-[10px] font-medium uppercase tracking-widest text-background/40">
                This month
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                $3,240
              </p>
            </div>
            <div className="rounded-2xl border border-background/10 bg-background/5 p-4 backdrop-blur-sm">
              <p className="text-[10px] font-medium uppercase tracking-widest text-background/40">
                Savings
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <p className="text-2xl font-semibold tracking-tight">$760</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-background/30">
          &copy; {new Date().getFullYear()} Ledgr
        </div>
      </div>

      {/* Right: Form panel */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <Suspense
          fallback={<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}