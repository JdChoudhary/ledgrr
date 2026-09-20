"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary">
                <span className="text-primary-foreground text-[9px] font-bold">$</span>
              </div>
              <span className="text-sm font-semibold">Ledgr</span>
            </Link>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed max-w-xs">
              Personal finance management that&apos;s actually pleasant to use.
              Free forever.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold mb-3">Product</p>
            <div className="space-y-2">
              {["Features", "Dashboard", "Budgeting", "Bill splits", "Analytics"].map((item) => (
                <p key={item}>
                  <a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {item}
                  </a>
                </p>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold mb-3">Company</p>
            <div className="space-y-2">
              {[
                { label: "About", href: "#" },
                { label: "Privacy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
                { label: "Cookies", href: "/cookies" },
              ].map((item) => (
                <p key={item.label}>
                  <Link href={item.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {item.label}
                  </Link>
                </p>
              ))}
            </div>
          </div>

          {/* Get started */}
          <div>
            <p className="text-xs font-semibold mb-3">Get started</p>
            <div className="space-y-2">
              <p>
                <Link href="/register" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Create account
                </Link>
              </p>
              <p>
                <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-muted-foreground">
            &copy; {new Date().getFullYear()} Ledgr. All rights reserved.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Made with care for people who want to understand their money.
          </p>
        </div>
      </div>
    </footer>
  );
}
