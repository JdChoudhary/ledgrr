"use client";

import { motion } from "motion/react";
import { ArrowUpRight, ArrowDownRight, PiggyBank } from "lucide-react";

const categories = [
  { name: "Food & Dining", amount: "$420", pct: 75, color: "bg-emerald-500" },
  { name: "Transport", amount: "$180", pct: 45, color: "bg-blue-500" },
  { name: "Shopping", amount: "$320", pct: 60, color: "bg-amber-500" },
  { name: "Bills & Utilities", amount: "$280", pct: 90, color: "bg-rose-500" },
  { name: "Entertainment", amount: "$95", pct: 30, color: "bg-sky-500" },
];

const heatmapData = [
  0, 0, 2, 0, 1, 3, 0, 0, 1, 2, 0, 0, 3, 1, 0, 1, 0, 0, 2, 0, 1, 0, 0, 3, 0, 1, 0, 2, 0, 0, 1,
];

function HeatmapCell({ level }: { level: number }) {
  const colors = [
    "bg-muted/30",
    "bg-emerald-500/10",
    "bg-emerald-500/25",
    "bg-emerald-500/45",
    "bg-emerald-500/70",
  ];
  return <div className={`h-3 w-3 rounded-sm ${colors[level]}`} title={`$${level * 80} spent`} />;
}

export function DashboardPreview() {
  return (
    <section className="border-t border-border/40 bg-muted/20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-24 md:py-32">
        <div className="text-center max-w-lg mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-medium text-primary mb-4">
            Product
          </div>
          <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">See it in action</h2>
          <p className="mt-4 text-[15px] text-muted-foreground">
            A clean, intuitive interface that makes managing money effortless.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Main dashboard view */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-2 rounded-2xl border border-border/50 bg-card/80 p-6 shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center gap-1.5 mb-5">
              <div className="h-2 w-2 rounded-full bg-red-400" />
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
              <div className="h-2 w-2 rounded-full bg-green-400" />
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-3">
                <div className="flex items-center gap-1.5">
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">Income</span>
                </div>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  +$8,200
                </p>
              </div>
              <div className="rounded-xl bg-rose-500/5 border border-rose-500/15 p-3">
                <div className="flex items-center gap-1.5">
                  <ArrowDownRight className="h-3 w-3 text-rose-500" />
                  <span className="text-[10px] text-muted-foreground">Expenses</span>
                </div>
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-1">
                  -$4,920
                </p>
              </div>
              <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
                <div className="flex items-center gap-1.5">
                  <PiggyBank className="h-3 w-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground">Savings</span>
                </div>
                <p className="text-sm font-semibold text-primary mt-1">+$3,280</p>
              </div>
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-1 h-24">
              {[40, 65, 45, 80, 55, 70, 50, 85, 60, 75, 65, 90].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.1 + i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 rounded-t bg-primary/20"
                />
              ))}
            </div>
          </motion.div>

          {/* Categories + Heatmap sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            {/* Categories */}
            <div className="rounded-2xl border border-border/50 bg-card/80 p-6 shadow-lg backdrop-blur-sm">
              <p className="text-xs font-medium text-muted-foreground mb-4">Categories</p>
              <div className="space-y-3">
                {categories.map((c, i) => (
                  <motion.div
                    key={c.name}
                    initial={{ opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${c.color}`} />
                        <span className="text-xs">{c.name}</span>
                      </div>
                      <span className="text-xs font-medium">{c.amount}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${c.pct}%` }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.8,
                          delay: 0.3 + i * 0.06,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className={`h-full rounded-full ${c.color}`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Heatmap */}
            <div className="rounded-2xl border border-border/50 bg-card/80 p-5 shadow-lg backdrop-blur-sm">
              <p className="text-[10px] font-medium text-muted-foreground mb-3">Spending heatmap</p>
              <div className="flex flex-wrap gap-1">
                {heatmapData.map((level, i) => (
                  <HeatmapCell key={i} level={level} />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
