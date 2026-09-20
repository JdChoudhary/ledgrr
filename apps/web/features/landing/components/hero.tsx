"use client";

import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Shield,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function AnimatedCounter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const duration = 1.5;
    const start = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setDisplay(current.toLocaleString());
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {prefix}{display}{suffix}
    </span>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24">
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[140px]"
          animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-20 top-20 h-[450px] w-[450px] rounded-full bg-emerald-400/6 blur-[120px]"
          animate={{ x: [0, -40, 20, 0], y: [0, 30, -20, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          {/* Left — Copy */}
          <div className="max-w-xl">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-[11px] font-medium text-primary"
            >
              <Sparkles className="h-3 w-3" />
              Free forever · No credit card needed
            </motion.div>

            {/* Headline — emotional hook */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl font-semibold tracking-tighter sm:text-5xl lg:text-[3.6rem] lg:leading-[1.06]"
            >
              Stop guessing where
              <br />
              your money goes.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground"
            >
              Ledgr brings your accounts, budgets, debts, and goals into one
              clear view — so you always know where you stand and where
              you&apos;re headed.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link href="/register">
                <Button
                  size="lg"
                  className="rounded-full px-8 text-sm font-medium shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Start tracking free
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="lg"
                  className="rounded-full px-6 text-sm font-medium text-muted-foreground"
                >
                  Sign in
                </Button>
              </Link>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-10 flex flex-wrap items-center gap-4 text-xs text-muted-foreground"
            >
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary/60" />
                <span>Encrypted & private</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary/60" />
                <span>Household sharing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary/60" />
                <span>AI-powered insights</span>
              </div>
            </motion.div>
          </div>

          {/* Right — Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block"
          >
            {/* Floating card: Net worth */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-8 top-4 z-10 rounded-2xl border border-border/60 bg-card/90 px-5 py-3.5 shadow-xl shadow-black/5 backdrop-blur-md"
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Net worth
              </p>
              <p className="mt-0.5 text-xl font-semibold tracking-tight">
                $24,800
              </p>
            </motion.div>

            {/* Floating card: Under budget */}
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -right-4 bottom-16 z-10 rounded-2xl border border-border/60 bg-card/90 px-5 py-3.5 shadow-xl shadow-black/5 backdrop-blur-md"
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Under budget
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <p className="text-xl font-semibold tracking-tight text-emerald-500">
                  $760 saved
                </p>
              </div>
            </motion.div>

            {/* Main dashboard card */}
            <div className="rounded-2xl border border-border/50 bg-card/80 p-6 shadow-2xl shadow-black/6 backdrop-blur-sm">
              {/* Window dots */}
              <div className="mb-6 flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>

              {/* Header */}
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Spending overview</p>
                  <p className="mt-0.5 text-2xl font-semibold tracking-tight">$4,000</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  -12% vs last month
                </span>
              </div>

              {/* Bar chart */}
              <div className="flex items-end gap-1.5 h-28">
                {[35, 55, 40, 70, 50, 65, 45, 80, 60, 75, 55, 90].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.8, delay: 0.5 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                    className="flex-1 rounded-t-sm bg-primary/15 transition-colors hover:bg-primary/25"
                  />
                ))}
              </div>

              {/* Categories */}
              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {[
                  { name: "Food", pct: "32%", color: "bg-emerald-500" },
                  { name: "Rent", pct: "28%", color: "bg-blue-500" },
                  { name: "Other", pct: "40%", color: "bg-amber-500" },
                ].map((c) => (
                  <div key={c.name} className="rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${c.color}`} />
                      <span className="text-[10px] text-muted-foreground">{c.name}</span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold">{c.pct}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Stats bar ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {[
            { label: "Transaction types", value: "8", icon: "💳" },
            { label: "Currencies supported", value: "10+", icon: "🌍" },
            { label: "Charts & visualizations", value: "15+", icon: "📊" },
            { label: "Intelligence features", value: "12+", icon: "🧠" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 + i * 0.08 }}
              className="rounded-xl border border-border/40 bg-background/50 px-4 py-3 text-center"
            >
              <span className="text-lg">{stat.icon}</span>
              <p className="mt-1 text-lg font-semibold tracking-tight">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
