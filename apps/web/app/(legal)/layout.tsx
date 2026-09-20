import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grain flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
              <span className="text-primary-foreground text-[11px] font-bold">
                $
              </span>
            </div>
            <span className="text-sm font-semibold tracking-tight">Ledgr</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Sign in
              </Button>
            </Link>
            <Link href="/register" className="inline-flex">
              <Button
                size="sm"
                className="rounded-full px-5 text-xs font-medium"
              >
                Get started
                <ArrowRight className="ml-1 h-3 w-3" data-icon="inline-end" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 sm:px-8 py-8 sm:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary">
              <span className="text-primary-foreground text-[9px] font-bold">
                $
              </span>
            </div>
            <span className="text-sm font-semibold">Ledgr</span>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} Ledgr</span>
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/cookies"
              className="transition-colors hover:text-foreground"
            >
              Cookies
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}