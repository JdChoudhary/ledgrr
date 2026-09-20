"use client";

import { motion } from "motion/react";

const testimonials = [
  {
    name: "Sarah M.",
    role: "Freelance designer",
    text: "I went from not knowing where my money went to having a clear budget and savings plan. The spending heatmap alone changed how I think about purchases.",
    savings: "Saved $2,400 in 3 months",
  },
  {
    name: "James K.",
    role: "Small business owner",
    text: "Finally an app that handles both my personal and household finances. Splitting bills with my partner used to be a nightmare — now it's seamless.",
    savings: "Tracks 2 households",
  },
  {
    name: "Priya R.",
    role: "Graduate student",
    text: "The debt tracking feature helped me pay off ₹30,000 in student loans 4 months early. Seeing the progress bar go down each month was incredibly motivating.",
    savings: "Paid off ₹30K debt early",
  },
];

export function Testimonials() {
  return (
    <section className="border-t border-border/40 bg-muted/20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-24 md:py-32">
        <div className="text-center max-w-lg mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-medium text-primary mb-4">
            Testimonials
          </div>
          <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
            Loved by people who
            <br />
            hate spreadsheets.
          </h2>
          <p className="mt-4 text-[15px] text-muted-foreground">
            Real results from real users who took control of their finances.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-border/50 bg-background p-6"
            >
              <div className="flex items-center gap-0.5 mb-4">
                {[0, 1, 2, 3, 4].map((star) => (
                  <svg key={star} className="h-3.5 w-3.5 fill-primary" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.text}&rdquo;
              </p>
              {t.savings && (
                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  {t.savings}
                </div>
              )}
              <div className="mt-4 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-xs font-medium">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
