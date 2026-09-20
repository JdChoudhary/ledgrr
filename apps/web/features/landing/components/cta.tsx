"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="border-t border-border/40">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl bg-foreground px-8 py-16 text-background md:px-14 md:py-20"
        >
          {/* Animated glow */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/30 blur-[80px]" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-primary/20 blur-[60px]" />

          <div className="relative mx-auto max-w-lg text-center">
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
              Your money deserves
              <br />
              better than a spreadsheet.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-background/50">
              Join thousands of people who finally understand where their money goes — and where it
              should go instead.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register">
                <Button
                  size="lg"
                  className="rounded-full bg-background px-7 text-sm font-medium text-foreground hover:bg-background/90 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  Create free account
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="lg"
                  className="rounded-full px-7 text-sm font-medium text-background/50 hover:bg-background/10 hover:text-background"
                >
                  Sign in
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-background/40">
              {["Free forever", "No credit card", "Cancel anytime"].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
