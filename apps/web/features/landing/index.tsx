"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Menu,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  X,
  Wallet,
  Target,
  Handshake,
  TrendingUp,
  Repeat,
  PiggyBank,
  Coins,
  Globe,
  BarChart3,
  Sparkles,
  Bell,
  Shield,
  Smartphone,
  FileUp,
  Users,
  Receipt,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Shared building blocks
────────────────────────────────────────────────────────────── */

const container = "mx-auto max-w-6xl px-5 sm:px-8";

const NAV_ITEMS: [string, string][] = [
  ["Product", "#product"],
  ["Features", "#features"],
  ["Demo", "#demo"],
  ["Pricing", "#pricing"],
];

// Shared CTA styles so the primary/secondary actions stay visually identical
// and always expose a keyboard focus ring.
const ctaPrimary =
  "inline-flex h-11 items-center gap-2 rounded-lg bg-foreground px-6 text-[13px] font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const ctaSecondary =
  "inline-flex h-11 items-center gap-2 rounded-lg border border-border px-5 text-[13px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const navLink =
  "rounded-md text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  // Honour the OS "reduce motion" preference: content still appears, it just
  // doesn't slide in.
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: reduceMotion ? 0 : 0.55,
        delay: reduceMotion ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Collapsible navigation for small screens (the desktop list is hidden below md). */
function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="landing-mobile-nav"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open ? (
        <nav
          id="landing-mobile-nav"
          aria-label="Primary"
          className="absolute inset-x-0 top-16 border-b border-border/40 bg-background/95 backdrop-blur-xl"
        >
          <ul className="mx-auto max-w-6xl space-y-0.5 px-5 py-3 sm:px-8">
            {NAV_ITEMS.map(([label, href]) => (
              <li key={href}>
                <a
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
      {children}
    </p>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
      {children}
    </h2>
  );
}

const positiveText = "text-emerald-600 dark:text-emerald-400";
const negativeText = "text-rose-600 dark:text-rose-400";

/* ──────────────────────────────────────────────────────────────
   Page
────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Keyboard users can jump straight past the navigation. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-[13px] focus:font-medium focus:text-background"
      >
        Skip to content
      </a>

      {/* ── Navigation ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className={`${container} flex h-16 items-center justify-between`}>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-[13px] font-bold text-background">
              L
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              Ledgr
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
            {NAV_ITEMS.map(([label, href]) => (
              <a key={href} href={href} className={navLink}>
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className={`hidden sm:inline-flex ${navLink}`}>
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Get started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <MobileNav />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="scroll-mt-20 focus:outline-none">

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.05),transparent_60%)]"
        />
        <div
          className={`${container} relative grid items-center gap-14 py-20 md:py-28 lg:grid-cols-2`}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-[11px] font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              Personal finance, without the app fatigue
            </div>

            <h1 className="text-4xl font-semibold leading-[1.06] tracking-tighter sm:text-5xl lg:text-[3.4rem]">
              Everything about your money, in one calm place.
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Ledgr tracks every transaction, budget, debt, bill split, goal,
              and net worth change — so you stop juggling five apps and start
              understanding your finances.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register" className={ctaPrimary}>
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#product" className={ctaSecondary}>
                See how it works
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {["Free to start", "No credit card", "Cancel anytime"].map(
                (t) => (
                  <span key={t} className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    {t}
                  </span>
                ),
              )}
            </div>
          </motion.div>

          {/* Dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block"
          >
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-2xl shadow-black/5">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  Dashboard
                </span>
              </div>

              <div className="mb-5 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Net balance
                  </p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight">
                    $29,888
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  +12% this month
                </span>
              </div>

              <div className="mb-6 grid grid-cols-3 gap-3">
                {[
                  { label: "Income", value: "+ $5,840", cls: positiveText },
                  { label: "Expenses", value: "- $4,920", cls: negativeText },
                  { label: "Saved", value: "+ $920", cls: "" },
                ].map((m) => (
                  <div key={m.label} className="border-t border-border pt-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {m.label}
                    </p>
                    <p className={`mt-1 text-[13px] font-semibold ${m.cls}`}>
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mb-6 flex h-24 items-end gap-1.5">
                {[35, 55, 40, 70, 50, 65, 45, 80, 60, 75, 55, 90].map(
                  (h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-primary/20 transition-colors hover:bg-primary/40"
                      style={{ height: `${h}%` }}
                    />
                  ),
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: "Food", pct: "32%" },
                  { name: "Rent", pct: "28%" },
                  { name: "Transport", pct: "15%" },
                ].map((c) => (
                  <div
                    key={c.name}
                    className="rounded-lg border border-border/60 px-3 py-2"
                  >
                    <p className="text-[11px] text-muted-foreground">
                      {c.name}
                    </p>
                    <p className="text-[13px] font-semibold">{c.pct}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute -left-8 -top-5 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-lg shadow-black/5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Owed to you
              </p>
              <p className={`mt-0.5 text-lg font-semibold ${positiveText}`}>
                +$190.00
              </p>
            </div>

            <div className="absolute -right-6 bottom-16 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-lg shadow-black/5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                You owe
              </p>
              <p className={`mt-0.5 text-lg font-semibold ${negativeText}`}>
                -$40.00
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stat strip (real product facts) ─────────────────── */}
      <section className="border-y border-border/40 bg-muted/20">
        <div
          className={`${container} grid grid-cols-2 gap-6 py-8 sm:grid-cols-3 lg:grid-cols-6`}
        >
          {[
            ["8", "transaction types"],
            ["4", "split methods"],
            ["10+", "currencies with FX"],
            ["6", "account types"],
            ["AI", "insights & assistant"],
            ["CSV", "import & export"],
          ].map(([num, label]) => (
            <div key={label} className="text-center lg:text-left">
              <p className="text-2xl font-semibold tracking-tight">{num}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem → Solution ──────────────────────────────── */}
      <section id="product" className="scroll-mt-20 border-b border-border/40">
        <div
          className={`${container} grid items-center gap-14 py-20 md:py-28 lg:grid-cols-2`}
        >
          <FadeUp>
            <SectionLabel>Why Ledgr</SectionLabel>
            <SectionHeading>
              Your money is already complicated.
              <br />
              Your tool should not be.
            </SectionHeading>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              Most people juggle a spreadsheet, a bills app, a budgeting app,
              and something for splitting with friends. Ledgr brings those jobs
              into one coherent place — with the depth to matter, not another
              pretty dashboard.
            </p>

            <ul className="mt-10 space-y-6">
              {[
                {
                  num: "01",
                  title: "See where money actually goes",
                  desc: "Income, expenses, transfers, refunds, and debts — 8 transaction types, categorized and searchable.",
                },
                {
                  num: "02",
                  title: "Plan with real signals",
                  desc: "Category budgets, shared budgets, savings goals with a per-day pace, and a spending forecast.",
                },
                {
                  num: "03",
                  title: "Settle up with people, not spreadsheets",
                  desc: "Bill splits (equal, %, exact, shares), debts with partial payments, and a settlement engine that links both sides.",
                },
              ].map((s) => (
                <li key={s.num} className="flex gap-4">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {s.num}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                      {s.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="rounded-2xl border border-border/60 bg-card p-6">
              <div className="mb-5 flex items-center justify-between">
                <span className="rounded-md bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Today
                </span>
                <span className="text-[13px] font-medium text-muted-foreground">
                  4+ tools
                </span>
              </div>
              <ul className="space-y-3">
                {[
                  "Transactions scattered across apps and banks",
                  "Shared expenses get lost in group chats",
                  "Budgets feel decorative, not actionable",
                  "Debts and net worth live in different places",
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-start gap-2.5 text-[13px] text-muted-foreground"
                  >
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    {t}
                  </li>
                ))}
              </ul>

              <div className="my-6 h-px bg-border" />

              <div className="mb-5 flex items-center justify-between">
                <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  With Ledgr
                </span>
                <span className="text-[13px] font-medium text-muted-foreground">
                  One place
                </span>
              </div>
              <ul className="space-y-3">
                {[
                  "Accounts, transactions, budgets, goals, debts together",
                  "Bill splits and settlement inside the same flow",
                  "Charts that are readable, not decorative",
                  "Private — no ads, no selling your data",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[13px]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Product pillars ─────────────────────────────────── */}
      <section className="border-b border-border/40">
        <div className={`${container} py-20 md:py-28`}>
          <FadeUp className="max-w-xl">
            <SectionLabel>What Ledgr does</SectionLabel>
            <SectionHeading>Four jobs, one product.</SectionHeading>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Built around the recurring moments of personal finance — logging a
              spend, planning a month, splitting a trip, watching net worth
              move.
            </p>
          </FadeUp>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {[
              {
                icon: <Wallet className="h-4.5 w-4.5" />,
                title: "Track everything",
                desc: "Every cent accounted for, automatically.",
                items: [
                  "8 transaction types incl. transfers & refunds",
                  "Bank, cash, credit, investment & loan accounts",
                  "Recurring rules that auto-post on schedule",
                  "Multi-currency with live exchange rates",
                ],
              },
              {
                icon: <Target className="h-4.5 w-4.5" />,
                title: "Plan & stay on budget",
                desc: "Limits you can actually live within.",
                items: [
                  "Per-category budgets with real-time progress",
                  "Shared budgets for households & partners",
                  "Savings goals with per-day pace to deadline",
                  "Spending forecast with confidence bands",
                ],
              },
              {
                icon: <Handshake className="h-4.5 w-4.5" />,
                title: "Share & settle",
                desc: "Money with friends, minus the awkwardness.",
                items: [
                  "Bill splits: equal, percentage, exact, shares",
                  "Debts with partial payments & clear status",
                  "Friends & households with invite flow",
                  "Settlement engine links both sides of a payment",
                ],
              },
              {
                icon: <TrendingUp className="h-4.5 w-4.5" />,
                title: "Understand & grow",
                desc: "See the trend, not just the total.",
                items: [
                  "Net worth snapshots over time",
                  "Investments: stocks, crypto, funds, property",
                  "AI insights — anomalies, forecasts, savings ideas",
                  "Heatmaps, comparisons & monthly analytics",
                ],
              },
            ].map((p, i) => (
              <FadeUp key={p.title} delay={i * 0.05}>
                <div className="h-full rounded-2xl border border-border/60 bg-card p-6">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {p.icon}
                  </div>
                  <h3 className="text-[15px] font-semibold">{p.title}</h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {p.desc}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {p.items.map((it) => (
                      <li
                        key={it}
                        className="flex items-start gap-2.5 text-[13px] text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature grid ────────────────────────────────────── */}
      <section id="features" className="scroll-mt-20 border-b border-border/40 bg-muted/20">
        <div className={`${container} py-20 md:py-28`}>
          <FadeUp className="mx-auto max-w-xl text-center">
            <SectionLabel>Features</SectionLabel>
            <SectionHeading>Deep where it counts.</SectionHeading>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Not a feature list for the sake of it — each one solves a real
              problem people hit while managing money.
            </p>
          </FadeUp>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <Receipt className="h-4 w-4" />,
                title: "Smart transactions",
                desc: "Multi-category splits, tags, refund linking, and soft deletes that preserve history.",
              },
              {
                icon: <Repeat className="h-4 w-4" />,
                title: "Recurring rules",
                desc: "Auto-post rent, subscriptions, and salary on schedule — with idempotent logging.",
              },
              {
                icon: <PiggyBank className="h-4 w-4" />,
                title: "Savings goals",
                desc: "Targets with deadlines, contributions, progress bars, and a per-day pace to keep you honest.",
              },
              {
                icon: <Users className="h-4 w-4" />,
                title: "Friends & households",
                desc: "Requests, shared budgets, and household expenses — collaboration without chaos.",
              },
              {
                icon: <Coins className="h-4 w-4" />,
                title: "Debts & settlements",
                desc: "Borrow, lend, partial payments, and one-tap settlement with linked ledger entries.",
              },
              {
                icon: <BarChart3 className="h-4 w-4" />,
                title: "Analytics",
                desc: "Heatmaps, month-over-month comparisons, daily spend, and budget-vs-actual views.",
              },
              {
                icon: <Sparkles className="h-4 w-4" />,
                title: "AI assistant",
                desc: "Anomaly detection, cash-flow forecasts, savings ideas, and a chat assistant with sessions.",
              },
              {
                icon: <Bell className="h-4 w-4" />,
                title: "Smart alerts",
                desc: "Budget warnings at 80%, high-spend detection, goal deadlines, and debt reminders.",
              },
            ].map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.03}>
                <div className="h-full rounded-xl border border-border/60 bg-card p-5 transition-colors hover:border-border">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                    {f.desc}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo ─────────────────────────────────────────────── */}
      <section id="demo" className="scroll-mt-20 border-b border-border/40">
        <div className={`${container} py-20 md:py-28`}>
          <FadeUp className="max-w-xl">
            <SectionLabel>Interactive demo</SectionLabel>
            <SectionHeading>The questions people actually ask.</SectionHeading>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Every feature answers a real question. Here is what the product
              looks like when you open it.
            </p>
          </FadeUp>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <Wallet className="h-4 w-4" />,
                label: "Where did my money go?",
                sub: "Spending by category",
              },
              {
                icon: <Handshake className="h-4 w-4" />,
                label: "Who owes who?",
                sub: "Debts & net balances",
              },
              {
                icon: <Target className="h-4 w-4" />,
                label: "Am I on budget?",
                sub: "Progress vs limits",
              },
              {
                icon: <TrendingUp className="h-4 w-4" />,
                label: "How is my net worth?",
                sub: "Snapshots over time",
              },
            ].map((d, i) => (
              <FadeUp key={d.label} delay={i * 0.04}>
                <div className="h-full rounded-xl border border-border/60 bg-card p-5">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {d.icon}
                  </div>
                  <p className="text-sm font-semibold">{d.label}</p>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">
                    {d.sub}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>

          {/* Preview panels */}
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <FadeUp>
              <div className="rounded-2xl border border-border/60 bg-card p-6">
                <div className="mb-6 flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Spending
                  </span>
                  <span className="text-sm font-semibold">This month</span>
                </div>
                <div className="space-y-3.5">
                  {[
                    { name: "Food & Dining", amount: "$840", pct: 35 },
                    { name: "Rent & Utilities", amount: "$720", pct: 30 },
                    { name: "Transport", amount: "$360", pct: 15 },
                    { name: "Shopping", amount: "$280", pct: 12 },
                    { name: "Other", amount: "$200", pct: 8 },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="w-32 truncate text-[12.5px] text-muted-foreground">
                        {c.name}
                      </span>
                      <span className="w-12 text-right text-[12.5px] font-semibold">
                        {c.amount}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-[11px] text-muted-foreground">
                        {c.pct}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-baseline gap-2 border-t border-border pt-4">
                  <span className="text-2xl font-semibold tracking-tight">
                    $2,400
                  </span>
                  <span className="text-xs text-muted-foreground">
                    spent this month
                  </span>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.05}>
              <div className="rounded-2xl border border-border/60 bg-card p-6">
                <div className="mb-6 flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Debts
                  </span>
                  <span className="text-sm font-semibold">Who owes who?</span>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3.5">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Owed to you
                    </p>
                    <p className={`mt-1 text-lg font-semibold ${positiveText}`}>
                      +$190.00
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      You owe
                    </p>
                    <p className={`mt-1 text-lg font-semibold ${negativeText}`}>
                      -$40.00
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      name: "Alex",
                      net: "+$120",
                      cls: positiveText,
                      color: "bg-primary/80",
                    },
                    {
                      name: "Jordan",
                      net: "-$40",
                      cls: negativeText,
                      color: "bg-amber-500/80",
                    },
                    {
                      name: "Sam",
                      net: "+$70",
                      cls: positiveText,
                      color: "bg-sky-500/80",
                    },
                  ].map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center justify-between rounded-lg border border-border/50 px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white ${f.color}`}
                        >
                          {f.name[0]}
                        </span>
                        <span className="text-[13px] font-medium">
                          {f.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[13px] font-semibold ${f.cls}`}>
                          {f.net}
                        </span>
                        <span className="text-[11px] font-medium text-primary">
                          View
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Trust / platform ────────────────────────────────── */}
      <section className="border-b border-border/40 bg-muted/20">
        <div
          className={`${container} grid gap-8 py-20 sm:grid-cols-2 lg:grid-cols-4`}
        >
          {[
            {
              icon: <Shield className="h-4.5 w-4.5" />,
              title: "Private by design",
              desc: "Your financial data stays yours. No ads, no selling, no noise.",
            },
            {
              icon: <Globe className="h-4.5 w-4.5" />,
              title: "Multi-currency",
              desc: "Track accounts in different currencies with live FX conversion.",
            },
            {
              icon: <Smartphone className="h-4.5 w-4.5" />,
              title: "Works everywhere",
              desc: "Installable PWA — add expenses at the register, plan from the couch.",
            },
            {
              icon: <FileUp className="h-4.5 w-4.5" />,
              title: "Import & export",
              desc: "CSV import with column mapping and reconciliation, PDF/CSV export.",
            },
          ].map((t, i) => (
            <FadeUp key={t.title} delay={i * 0.04}>
              <div className="h-full rounded-xl border border-border/60 bg-card p-5">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {t.icon}
                </div>
                <h3 className="text-sm font-semibold">{t.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  {t.desc}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-20 border-b border-border/40">
        <div className={`${container} py-20 md:py-28`}>
          <FadeUp className="mx-auto max-w-xl text-center">
            <SectionLabel>Pricing</SectionLabel>
            <SectionHeading>
              Start small. Upgrade if you outgrow it.
            </SectionHeading>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              No long commitments. Every plan includes a 14-day free trial.
            </p>
          </FadeUp>

          <div className="mx-auto mt-14 grid max-w-4xl gap-4 md:grid-cols-3">
            {[
              {
                tier: "Starter",
                price: "$5",
                featured: false,
                items: [
                  "Unlimited accounts",
                  "Transaction tracking",
                  "Bill splits & debts",
                  "Basic budgeting",
                  "CSV import",
                  "Mobile responsive",
                ],
              },
              {
                tier: "Pro",
                price: "$9",
                featured: true,
                items: [
                  "Everything in Starter",
                  "Advanced analytics & charts",
                  "AI insights & forecasting",
                  "Household sharing",
                  "Investment tracking",
                  "Priority support",
                ],
              },
              {
                tier: "Team",
                price: "$15",
                featured: false,
                items: [
                  "Everything in Pro",
                  "Multiple households",
                  "Shared budgets",
                  "Net worth history",
                  "What-if scenarios",
                  "API access",
                ],
              },
            ].map((plan) => (
              <FadeUp key={plan.tier} delay={plan.featured ? 0.05 : 0}>
                <div
                  className={`flex h-full flex-col rounded-2xl border bg-card p-6 ${
                    plan.featured
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-border/60"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {plan.tier}
                    </span>
                    {plan.featured && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                        Most popular
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">
                    {plan.price}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      / month
                    </span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.items.map((it) => (
                      <li
                        key={it}
                        className="flex items-start gap-2.5 text-[13px] text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        {it}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`mt-7 inline-flex h-10 items-center justify-center rounded-lg text-[13px] font-medium transition-colors ${
                      plan.featured
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "border border-border hover:bg-muted"
                    }`}
                  >
                    Get started
                  </Link>
                </div>
              </FadeUp>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            No contracts. Cancel anytime. All plans include a 14-day free trial.
          </p>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.05),transparent_60%)]"
        />
        <div className={`${container} relative py-24 text-center`}>
          <FadeUp>
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tighter md:text-[2.6rem] md:leading-[1.1]">
              Get the money picture you actually want.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              If Ledgr sounds like the kind of tool you would use, start with a
              free trial. No credit card, no setup ceremony.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register" className={ctaPrimary}>
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className={ctaSecondary}>
                Sign in
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border/40 bg-muted/20">
        <div
          className={`${container} grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4`}
        >
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-[13px] font-bold text-background">
                L
              </span>
              <span className="text-[15px] font-semibold tracking-tight">
                Ledgr
              </span>
            </div>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              Personal finance for people who want clarity — not another busy
              app.
            </p>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Product
            </p>
            <ul className="space-y-2.5">
              {[
                ["Features", "#features"],
                ["Demo", "#demo"],
                ["Pricing", "#pricing"],
                ["How it works", "#product"],
              ].map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Company
            </p>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/privacy"
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cookies
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Stay updated
            </p>
            <p className="mb-3 text-[13px] text-muted-foreground">
              Product updates and occasional financial tips.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                aria-label="Email address"
                placeholder="your@email.com"
                className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-lg bg-foreground px-4 text-[12px] font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-border/40">
          <div
            className={`${container} flex flex-col items-center justify-between gap-2 py-6 sm:flex-row`}
          >
            <p className="text-[11.5px] text-muted-foreground">
              &copy; {new Date().getFullYear()} Ledgr. All rights reserved.
            </p>
            <p className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
              Made for people who want to understand their money
              <ArrowUpRight className="h-3 w-3" />
              <ArrowDownRight className="h-3 w-3" />
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
