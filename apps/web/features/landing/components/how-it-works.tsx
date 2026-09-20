"use client";

import { motion } from "motion/react";
import { Zap, Target, BarChart3, Sparkles } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Sign up in 30 seconds",
    text: "No credit card. No commitments. Just enter your email and you're in.",
    icon: Zap,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    number: "02",
    title: "Add your accounts",
    text: "Connect bank accounts or add them manually. Set up categories that match your life.",
    icon: Target,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    number: "03",
    title: "Track as you go",
    text: "Log expenses in seconds. Split bills with friends. Set budgets that actually work.",
    icon: BarChart3,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    number: "04",
    title: "See the big picture",
    text: "Watch your financial health improve over time with charts, insights, and forecasts.",
    icon: Sparkles,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border/40 bg-muted/20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-24 md:py-32">
        <div className="max-w-lg mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-medium text-primary mb-4">
            How it works
          </div>
          <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
            Four steps to financial
            <br />
            clarity.
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground">
            Getting started takes less time than your morning coffee.
          </p>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute top-6 left-0 right-0 hidden h-px bg-border/60 lg:block" />

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="group relative"
              >
                <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-xl ${step.bg} transition-colors duration-300 group-hover:scale-110`}>
                  <step.icon className={`h-5 w-5 ${step.color}`} />
                </div>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {step.number}
                </p>
                <h3 className="mt-1 text-sm font-semibold">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {step.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
