"use client";

import { motion } from "motion/react";
import {
  BarChart3,
  Wallet,
  TrendingUp,
  Shield,
  PieChart,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Handshake,
  Brain,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Smart budgeting",
    description: "Set monthly limits per category. Get alerts before you overspend — not after.",
    color: "emerald",
    span: "md:col-span-2 md:row-span-1",
    visual: "budget" as const,
    badge: "Core",
  },
  {
    icon: PieChart,
    title: "Visual analytics",
    description: "Clean charts that make your financial picture instantly clear. Spending trends, category breakdowns, and net worth — all in one place.",
    color: "blue",
    span: "md:col-span-1 md:row-span-2",
    visual: "analytics" as const,
    badge: "Core",
  },
  {
    icon: Handshake,
    title: "Bill splits & debts",
    description: "Split expenses with friends. Track who owes whom. Settle up in-app — no more awkward Venmo requests.",
    color: "amber",
    span: "md:col-span-1 md:row-span-1",
    visual: "splits" as const,
    badge: "Differentiator",
  },
  {
    icon: Users,
    title: "Household sharing",
    description: "Share budgets with your partner. Track household expenses separately from personal ones.",
    color: "rose",
    span: "md:col-span-1 md:row-span-1",
    visual: "household" as const,
    badge: "Pro",
  },
  {
    icon: Brain,
    title: "Financial intelligence",
    description: "AI-powered insights, spending anomaly detection, and cash flow forecasts. Know what's coming before it happens.",
    color: "violet",
    span: "md:col-span-1 md:row-span-1",
    visual: "intelligence" as const,
    badge: "AI",
  },
  {
    icon: Shield,
    title: "Private by design",
    description: "Your data is encrypted and isolated. No ads, no selling your data. Your finances stay yours.",
    color: "sky",
    span: "md:col-span-2 md:row-span-1",
    visual: "privacy" as const,
    badge: "Trust",
  },
];

const colorMap: Record<string, { bg: string; icon: string; accent: string; border: string }> = {
  emerald: {
    bg: "bg-emerald-500/[.06] dark:bg-emerald-500/10",
    icon: "text-emerald-600 dark:text-emerald-400",
    accent: "bg-emerald-500/15",
    border: "border-emerald-500/20",
  },
  blue: {
    bg: "bg-blue-500/[.06] dark:bg-blue-500/10",
    icon: "text-blue-600 dark:text-blue-400",
    accent: "bg-blue-500/15",
    border: "border-blue-500/20",
  },
  amber: {
    bg: "bg-amber-500/[.06] dark:bg-amber-500/10",
    icon: "text-amber-600 dark:text-amber-400",
    accent: "bg-amber-500/15",
    border: "border-amber-500/20",
  },
  rose: {
    bg: "bg-rose-500/[.06] dark:bg-rose-500/10",
    icon: "text-rose-600 dark:text-rose-400",
    accent: "bg-rose-500/15",
    border: "border-rose-500/20",
  },
  violet: {
    bg: "bg-violet-500/[.06] dark:bg-violet-500/10",
    icon: "text-violet-600 dark:text-violet-400",
    accent: "bg-violet-500/15",
    border: "border-violet-500/20",
  },
  sky: {
    bg: "bg-sky-500/[.06] dark:bg-sky-500/10",
    icon: "text-sky-600 dark:text-sky-400",
    accent: "bg-sky-500/15",
    border: "border-sky-500/20",
  },
};

function FeatureVisual({ visual, color }: { visual: string; color: string }) {
  const colors = colorMap[color];

  if (visual === "budget") {
    return (
      <div className="mt-4 space-y-2">
        {[
          { name: "Food & Dining", pct: 82, color: "bg-emerald-500", budget: "$1,200", spent: "$984" },
          { name: "Transport", pct: 45, color: "bg-blue-500", budget: "$400", spent: "$180" },
          { name: "Shopping", pct: 105, color: "bg-red-500", budget: "$500", spent: "$525" },
        ].map((c) => (
          <div key={c.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">{c.name}</span>
              <span className={`text-[10px] font-medium ${c.pct > 100 ? "text-red-500" : "text-muted-foreground"}`}>
                {c.spent}/{c.budget}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${c.color}`} style={{ width: `${Math.min(c.pct, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (visual === "analytics") {
    return (
      <div className="mt-4">
        {/* Mini donut */}
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/40" />
              <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="40 60" className={colors.icon} />
              <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="20 80" strokeDashoffset="-40" className="text-blue-500" />
            </svg>
          </div>
          <div className="space-y-1.5 flex-1">
            {[
              { name: "Food", pct: "32%", color: "bg-emerald-500" },
              { name: "Rent", pct: "28%", color: "bg-blue-500" },
              { name: "Other", pct: "40%", color: "bg-amber-500" },
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${c.color}`} />
                <span className="text-[10px] text-muted-foreground">{c.name}</span>
                <span className="text-[10px] font-medium ml-auto">{c.pct}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Sparkline */}
        <svg viewBox="0 0 120 32" className="h-8 w-full mt-3" preserveAspectRatio="none">
          <polyline
            points="0,28 10,22 20,24 30,16 40,18 50,12 60,14 70,8 80,10 90,6 100,8 110,4 120,6"
            fill="none" stroke="currentColor" strokeWidth="1.5" className={colors.icon}
          />
        </svg>
      </div>
    );
  }

  if (visual === "splits") {
    return (
      <div className="mt-4 space-y-2">
        {[
          { name: "You", amount: "$250", isOwner: true, status: "paid" },
          { name: "Alex", amount: "$250", isOwner: false, status: "unpaid" },
          { name: "Sam", amount: "$250", isOwner: false, status: "paid" },
        ].map((s) => (
          <div key={s.name} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold ${s.isOwner ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {s.name[0]}
              </div>
              <span className="text-[10px] font-medium">{s.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px]">{s.amount}</span>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${s.status === "paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                {s.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (visual === "household") {
    return (
      <div className="mt-4 flex items-center gap-3">
        <div className="flex -space-x-2">
          {["Y", "P"].map((l, i) => (
            <div key={l} className={`h-8 w-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-primary/20 text-primary" : "bg-emerald-500/20 text-emerald-600"}`}>
              {l}
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <div className="h-1.5 w-20 rounded-full bg-muted/40" />
          <div className="h-1.5 w-14 rounded-full bg-muted/30" />
        </div>
      </div>
    );
  }

  if (visual === "intelligence") {
    return (
      <div className="mt-4 rounded-lg bg-violet-500/5 border border-violet-500/15 p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Brain className="h-3 w-3 text-violet-500" />
          <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400">Insight</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Shopping spending is 42% above your normal level this month. Projected: $1,200 over budget.
        </p>
      </div>
    );
  }

  // privacy
  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10">
        <Shield className="h-4 w-4 text-sky-500" />
      </div>
      <div className="space-y-1">
        <div className="h-1.5 w-24 rounded-full bg-muted/40" />
        <div className="h-1.5 w-16 rounded-full bg-muted/30" />
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="border-t border-border/40">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-24 md:py-32">
        <div className="max-w-lg mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-medium text-primary mb-4">
            Features
          </div>
          <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
            Everything you need,
            <br />
            nothing you don&apos;t.
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground">
            From daily tracking to long-term planning — Ledgr covers the full
            financial picture without the bloat.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 auto-rows-[minmax(0,auto)]">
          {features.map((feature, i) => {
            const colors = colorMap[feature.color];
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className={`group rounded-2xl border border-border/50 bg-background p-6 transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-black/3 ${feature.span}`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg}`}>
                    <feature.icon className={`h-5 w-5 ${colors.icon}`} />
                  </div>
                  <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors.bg} ${colors.icon}`}>
                    {feature.badge}
                  </span>
                </div>
                <h3 className="text-sm font-semibold">{feature.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                <FeatureVisual visual={feature.visual} color={feature.color} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
