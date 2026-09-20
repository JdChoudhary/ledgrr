"use client";

import { motion } from "motion/react";
import { Smartphone, CheckCircle2, Wifi, WifiOff } from "lucide-react";

const mobileFeatures = [
  "Bottom tab navigation",
  "Touch-friendly interface",
  "Offline-ready PWA",
  "Works on any device",
];

export function MobileApp() {
  return (
    <section className="border-t border-border/40 bg-muted/20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-24 md:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-[11px] font-medium text-primary mb-6">
              <Smartphone className="h-3 w-3" />
              Works everywhere
            </div>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
              Track money
              <br />
              on the go.
            </h2>
            <p className="mt-4 max-w-md text-[15px] text-muted-foreground leading-relaxed">
              Full-featured progressive web app with bottom tab navigation.
              Add expenses at the register, check budgets on the couch, settle
              debts from the couch.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {mobileFeatures.map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center"
          >
            <div className="relative w-65 rounded-4xl border-4 border-foreground/10 bg-background p-3 shadow-2xl">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-24 rounded-b-2xl bg-foreground/10" />

              {/* Screen */}
              <div className="rounded-2xl bg-muted/30 p-4 pt-6 space-y-3">
                {/* Mini header */}
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Dashboard</p>
                  <p className="text-sm font-semibold">$4,280</p>
                </div>

                {/* Mini cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-background p-2.5 border border-border/40">
                    <p className="text-[8px] text-muted-foreground">Income</p>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">+$5,200</p>
                  </div>
                  <div className="rounded-lg bg-background p-2.5 border border-border/40">
                    <p className="text-[8px] text-muted-foreground">Expenses</p>
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">-$920</p>
                  </div>
                </div>

                {/* Mini chart */}
                <div className="flex items-end gap-1 h-12">
                  {[40, 60, 35, 70, 50, 65, 45, 80].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-primary/20" style={{ height: `${h}%` }} />
                  ))}
                </div>

                {/* Transaction list */}
                <div className="space-y-1.5">
                  {["Groceries", "Gas", "Coffee"].map((item, i) => (
                    <div key={item} className="flex items-center justify-between rounded-lg bg-background/60 px-2.5 py-1.5 border border-border/30">
                      <span className="text-[8px] text-muted-foreground">{item}</span>
                      <span className="text-[8px] font-medium">-${(12 + i * 8).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Bottom tabs */}
                <div className="flex items-center justify-around border-t border-border/40 pt-2">
                  {["Home", "Track", "Budget", "More"].map((tab) => (
                    <div key={tab} className="text-center">
                      <div className="h-4 w-4 rounded bg-foreground/10 mx-auto mb-0.5" />
                      <p className="text-[7px] text-muted-foreground">{tab}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
