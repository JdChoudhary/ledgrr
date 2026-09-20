"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Handshake,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Wallet,
  Target,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  X,
  ChevronRight,
  Receipt,
  Landmark,
  CreditCard,
  Coins,
  PiggyBank,
  Gauge,
  TrendingUpIcon,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   ARTIFACT 1: "Where Did My Money Go?"
   ═══════════════════════════════════════════════════════════════ */

const spendingData = [
  { month: "Jan", amount: 3200, color: "var(--lp-accent)" },
  { month: "Feb", amount: 2800, color: "var(--lp-accent)" },
  { month: "Mar", amount: 3600, color: "var(--lp-accent)" },
  { month: "Apr", amount: 2950, color: "var(--lp-accent)" },
  { month: "May", amount: 3400, color: "var(--lp-accent)" },
  { month: "Jun", amount: 2700, color: "var(--lp-accent)" },
  { month: "Jul", amount: 3100, color: "var(--lp-accent)" },
  { month: "Aug", amount: 2850, color: "var(--lp-accent)" },
  { month: "Sep", amount: 2400, color: "#B85545" },
  { month: "Oct", amount: 3050, color: "var(--lp-accent)" },
  { month: "Nov", amount: 3300, color: "var(--lp-accent)" },
  { month: "Dec", amount: 2650, color: "var(--lp-accent)" },
];

const categories = [
  { name: "Food & Dining", amount: 840, pct: 35, color: "#738B63" },
  { name: "Rent & Utilities", amount: 720, pct: 30, color: "#8B7355" },
  { name: "Transport", amount: 360, pct: 15, color: "#7B8FA1" },
  { name: "Shopping", amount: 280, pct: 12, color: "#A08B6E" },
  { name: "Other", amount: 200, pct: 8, color: "#9A8FA1" },
];

export function SpendingArtifact() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.3 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const max = Math.max(...spendingData.map((d) => d.amount));

  return (
    <div ref={ref} className="lp-artifact-card">
      {/* Problem statement */}
      <div className="lp-artifact-problem">
        <span className="lp-artifact-problem-icon">💸</span>
        <span>Where did my money go this month?</span>
      </div>

      <div className="lp-artifact-inner">
        <div className="lp-artifact-header">
          <div>
            <div className="lp-artifact-label">Spending by month</div>
            <div className="lp-artifact-amount">$2,400</div>
          </div>
          <span className="lp-artifact-badge positive">
            <TrendingDown className="h-3 w-3" /> -15% vs last month
          </span>
        </div>

        {/* Animated bar chart */}
        <div className="lp-artifact-bars">
          {spendingData.map((d, i) => (
            <div
              key={d.month}
              className="lp-artifact-bar-col"
              onMouseEnter={() => setHoveredBar(i)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              <AnimatePresence>
                {hoveredBar === i && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="lp-artifact-bar-tooltip"
                  >
                    ${d.amount.toLocaleString()}
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.div
                initial={{ height: 0 }}
                animate={visible ? { height: `${(d.amount / max) * 100}%` } : { height: 0 }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="lp-artifact-bar"
                style={{ background: hoveredBar === i ? "var(--lp-accent)" : d.color }}
              />
              <span className="lp-artifact-bar-label">{d.month}</span>
            </div>
          ))}
        </div>

        {/* Category breakdown */}
        <div className="lp-artifact-cats">
          <div className="lp-artifact-label" style={{ marginBottom: 8 }}>Top categories</div>
          {categories.map((c, i) => (
            <div
              key={c.name}
              className={`lp-artifact-cat ${selectedCat === i ? "selected" : ""}`}
              onClick={() => setSelectedCat(selectedCat === i ? null : i)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <div className="lp-artifact-cat-dot" style={{ background: c.color }} />
                <span className="lp-artifact-cat-name">{c.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="lp-artifact-cat-pct">{c.pct}%</span>
                <div className="lp-artifact-cat-bar-track">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={visible ? { width: `${c.pct}%` } : { width: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                    className="lp-artifact-cat-bar-fill"
                    style={{ background: c.color }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ARTIFACT 2: "Who Owes Who?"
   Interactive settle-up demo between friends
   ═══════════════════════════════════════════════════════════════ */

const friends = [
  { id: "1", name: "Alex", avatar: "A", color: "#738B63" },
  { id: "2", name: "Jordan", avatar: "J", color: "#8B7355" },
  { id: "3", name: "Sam", avatar: "S", color: "#7B8FA1" },
];

const debts = [
  { id: "d1", from: "1", to: "2", amount: 45.5, desc: "Dinner split", settled: false },
  { id: "d2", from: "2", to: "1", amount: 30.0, desc: "Uber ride", settled: false },
  { id: "d3", from: "1", to: "3", amount: 62.0, desc: "Concert tickets", settled: true },
  { id: "d4", from: "3", to: "2", amount: 28.5, desc: "Groceries", settled: false },
];

export function SettleUpArtifact() {
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set(["d3"]));
  const [activeTab, setActiveTab] = useState<"friends" | "settle">("friends");
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [offsetMode, setOffsetMode] = useState(false);
  const [offsetDone, setOffsetDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.3 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const getNetBalance = (friendId: string) => {
    let net = 0;
    for (const d of debts) {
      if (settledIds.has(d.id)) continue;
      if (d.from === friendId && d.to === "1") net += d.amount;
      if (d.from === "1" && d.to === friendId) net -= d.amount;
    }
    return net;
  };

  const getMutualDebts = (friendId: string) => {
    const active = debts.filter(
      (d) => !settledIds.has(d.id) && ((d.from === "1" && d.to === friendId) || (d.from === friendId && d.to === "1")),
    );
    const iOwe = active.filter((d) => d.from === "1").reduce((s, d) => s + d.amount, 0);
    const theyOwe = active.filter((d) => d.to === "1").reduce((s, d) => s + d.amount, 0);
    return { iOwe, theyOwe, maxOffset: Math.min(iOwe, theyOwe) };
  };

  const handleSettle = (debtId: string) => {
    setSettledIds((prev) => new Set([...prev, debtId]));
  };

  const handleOffset = () => {
    setOffsetDone(true);
    setTimeout(() => setOffsetDone(false), 2000);
  };

  const myDebts = debts.filter((d) => !settledIds.has(d.id));

  return (
    <div ref={ref} className="lp-artifact-card">
      {/* Problem statement */}
      <div className="lp-artifact-problem">
        <span className="lp-artifact-problem-icon">👥</span>
        <span>Who owes who after the group trip?</span>
      </div>

      <div className="lp-artifact-inner">
        {/* Tab toggle */}
        <div className="lp-artifact-tabs">
          <button
            className={`lp-artifact-tab ${activeTab === "friends" ? "active" : ""}`}
            onClick={() => { setActiveTab("friends"); setSelectedFriend(null); }}
          >
            <Users className="h-3.5 w-3.5" /> Friends
          </button>
          <button
            className={`lp-artifact-tab ${activeTab === "settle" ? "active" : ""}`}
            onClick={() => setActiveTab("settle")}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" /> Settle Up
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "friends" && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.3 }}
            >
              {/* Friend cards with net balance */}
              {friends.map((f) => {
                const net = getNetBalance(f.id);
                const mutual = getMutualDebts(f.id);
                return (
                  <div
                    key={f.id}
                    className="lp-artifact-friend"
                    onClick={() => {
                      setSelectedFriend(selectedFriend === f.id ? null : f.id);
                      setActiveTab("settle");
                    }}
                  >
                    <div className="lp-artifact-friend-left">
                      <div className="lp-artifact-avatar" style={{ background: f.color }}>
                        {f.avatar}
                      </div>
                      <div>
                        <div className="lp-artifact-friend-name">{f.name}</div>
                        <div className="lp-artifact-friend-debts">
                          {debts.filter((d) => !settledIds.has(d.id) && (d.from === f.id || d.to === f.id)).length} active debts
                        </div>
                      </div>
                    </div>
                    <div className="lp-artifact-friend-right">
                      {net !== 0 ? (
                        <span className={`lp-artifact-net ${net > 0 ? "positive" : "negative"}`}>
                          {net > 0 ? "+" : ""}{net.toFixed(0)}
                        </span>
                      ) : (
                        <span className="lp-artifact-net settled">Settled</span>
                      )}
                      {mutual.maxOffset > 0 && (
                        <span className="lp-artifact-offset-hint">
                          <ArrowLeftRight className="h-3 w-3" /> Mutual
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4" style={{ color: "var(--lp-text-muted)" }} />
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeTab === "settle" && (
            <motion.div
              key="settle"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.3 }}
            >
              {/* Debt list for selected friend or all */}
              <div className="lp-artifact-debt-list">
                {myDebts.length === 0 && (
                  <div className="lp-artifact-empty">
                    <CheckCircle2 className="h-8 w-8" style={{ color: "var(--lp-accent)" }} />
                    <p>All debts settled!</p>
                  </div>
                )}
                {debts
                  .filter((d) => !settledIds.has(d.id))
                  .map((d) => {
                    const from = friends.find((f) => f.id === d.from)!;
                    const to = friends.find((f) => f.id === d.to)!;
                    return (
                      <motion.div
                        key={d.id}
                        layout
                        className="lp-artifact-debt"
                      >
                        <div className="lp-artifact-debt-info">
                          <div className="lp-artifact-debt-parties">
                            <div className="lp-artifact-avatar-sm" style={{ background: from.color }}>
                              {from.avatar}
                            </div>
                            <ArrowRight className="h-3 w-3" style={{ color: "var(--lp-text-muted)" }} />
                            <div className="lp-artifact-avatar-sm" style={{ background: to.color }}>
                              {to.avatar}
                            </div>
                          </div>
                          <div>
                            <div className="lp-artifact-debt-desc">{d.desc}</div>
                            <div className="lp-artifact-debt-amount">
                              ${d.amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="lp-artifact-debt-actions">
                          {d.from === "1" ? (
                            <button
                              className="lp-btn lp-btn-accent"
                              style={{ height: 30, padding: "0 12px", fontSize: 11 }}
                              onClick={() => handleSettle(d.id)}
                            >
                              Pay {to.name}
                            </button>
                          ) : (
                            <button
                              className="lp-btn lp-btn-secondary"
                              style={{ height: 30, padding: "0 12px", fontSize: 11 }}
                              onClick={() => handleSettle(d.id)}
                            >
                              Mark received
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
              </div>

              {/* Offset demo */}
              {(() => {
                const alexNet = getNetBalance("2");
                const mutual = getMutualDebts("2");
                if (mutual.maxOffset <= 0) return null;
                return (
                  <div className="lp-artifact-offset-box">
                    <div className="lp-artifact-offset-header">
                      <ArrowLeftRight className="h-4 w-4" style={{ color: "var(--lp-accent)" }} />
                      <span>Mutual offset available with Jordan</span>
                    </div>
                    <div className="lp-artifact-offset-detail">
                      <span>You owe: ${mutual.iOwe.toFixed(2)}</span>
                      <span>They owe: ${mutual.theyOwe.toFixed(2)}</span>
                      <span className="lp-artifact-offset-max">Max offset: ${mutual.maxOffset.toFixed(2)}</span>
                    </div>
                    <button
                      className="lp-btn lp-btn-accent"
                      style={{ height: 32, padding: "0 16px", fontSize: 11, marginTop: 8 }}
                      onClick={handleOffset}
                      disabled={offsetDone}
                    >
                      {offsetDone ? (
                        <><Check className="h-3 w-3 mr-1" /> Debts offset!</>
                      ) : (
                        <>Offset ${mutual.maxOffset.toFixed(2)}</>
                      )}
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ARTIFACT 3: "Am I Over Budget?"
   ═══════════════════════════════════════════════════════════════ */

const budgetData = [
  { name: "Food & Dining", budget: 500, spent: 420, color: "#738B63" },
  { name: "Transport", budget: 200, spent: 185, color: "#7B8FA1" },
  { name: "Shopping", budget: 300, spent: 340, color: "#B85545" },
  { name: "Bills", budget: 400, spent: 380, color: "#8B7355" },
];

export function BudgetArtifact() {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setAnimated(true); },
      { threshold: 0.3 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const totalBudget = budgetData.reduce((s, b) => s + b.budget, 0);
  const totalSpent = budgetData.reduce((s, b) => s + b.spent, 0);
  const overallPct = Math.round((totalSpent / totalBudget) * 100);

  return (
    <div ref={ref} className="lp-artifact-card">
      <div className="lp-artifact-problem">
        <span className="lp-artifact-problem-icon">🎯</span>
        <span>Am I staying within budget?</span>
      </div>

      <div className="lp-artifact-inner">
        {/* Overall status */}
        <div className="lp-artifact-budget-header">
          <div>
            <div className="lp-artifact-label">Monthly budget</div>
            <div className="lp-artifact-amount">${totalSpent.toLocaleString()}</div>
            <div className="lp-artifact-sub">of ${totalBudget.toLocaleString()} budget</div>
          </div>
          <div className="lp-artifact-budget-gauge">
            <svg viewBox="0 0 80 80" className="lp-artifact-gauge">
              <circle cx="40" cy="40" r="32" fill="none" stroke="var(--lp-border)" strokeWidth="6" />
              <motion.circle
                cx="40" cy="40" r="32"
                fill="none"
                stroke={overallPct > 90 ? "#B85545" : "var(--lp-accent)"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 32}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                animate={animated ? {
                  strokeDashoffset: 2 * Math.PI * 32 * (1 - overallPct / 100),
                } : {}}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                transform="rotate(-90 40 40)"
              />
            </svg>
            <span className="lp-artifact-gauge-text">{overallPct}%</span>
          </div>
        </div>

        {/* Per-category bars */}
        <div className="lp-artifact-budget-bars">
          {budgetData.map((b, i) => {
            const pct = Math.round((b.spent / b.budget) * 100);
            const over = b.spent > b.budget;
            return (
              <div key={b.name} className="lp-artifact-budget-row">
                <div className="lp-artifact-budget-label">
                  <div className="lp-artifact-cat-dot" style={{ background: b.color }} />
                  <span>{b.name}</span>
                  {over && <span className="lp-artifact-over-badge">Over</span>}
                </div>
                <div className="lp-artifact-budget-bar-track">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={animated ? { width: `${Math.min(pct, 100)}%` } : {}}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                    className="lp-artifact-budget-bar-fill"
                    style={{ background: over ? "#B85545" : b.color }}
                  />
                </div>
                <div className="lp-artifact-budget-values">
                  <span>${b.spent}</span>
                  <span style={{ color: "var(--lp-text-muted)" }}>/ ${b.budget}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Insight */}
        <div className="lp-artifact-insight">
          <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--lp-accent)" }} />
          <span>Shopping is $40 over budget. At this pace you&apos;ll exceed by $120 this month.</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ARTIFACT 4: "What's My Net Worth?"
   ═══════════════════════════════════════════════════════════════ */

const netWorthData = [
  { month: "Jan", value: 18200 },
  { month: "Feb", value: 19800 },
  { month: "Mar", value: 19100 },
  { month: "Apr", value: 21400 },
  { month: "May", value: 22800 },
  { month: "Jun", value: 21900 },
  { month: "Jul", value: 23500 },
  { month: "Aug", value: 24800 },
];

const accountBreakdown = [
  { name: "Checking", amount: 8400, color: "#738B63", icon: "🏦" },
  { name: "Savings", amount: 12200, color: "#8B7355", icon: "💰" },
  { name: "Investments", amount: 5600, color: "#7B8FA1", icon: "📈" },
  { name: "Credit Card", amount: -1400, color: "#B85545", icon: "💳" },
];

export function NetWorthArtifact() {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setAnimated(true); },
      { threshold: 0.3 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const min = Math.min(...netWorthData.map((d) => d.value));
  const max = Math.max(...netWorthData.map((d) => d.value));
  const range = max - min;

  const points = netWorthData.map((d, i) => {
    const x = (i / (netWorthData.length - 1)) * 100;
    const y = 100 - ((d.value - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div ref={ref} className="lp-artifact-card">
      <div className="lp-artifact-problem">
        <span className="lp-artifact-problem-icon">📈</span>
        <span>What&apos;s my total wealth across all accounts?</span>
      </div>

      <div className="lp-artifact-inner">
        {/* Net worth headline */}
        <div className="lp-artifact-budget-header">
          <div>
            <div className="lp-artifact-label">Net worth</div>
            <div className="lp-artifact-amount">$24,800</div>
            <div className="lp-artifact-sub" style={{ color: "var(--lp-accent)" }}>
              +$6,600 since January
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="lp-artifact-label">This month</div>
            <div className="lp-artifact-amount" style={{ color: "var(--lp-accent)" }}>
              +$1,300
            </div>
          </div>
        </div>

        {/* Line chart */}
        <div className="lp-artifact-line-chart">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="lp-artifact-line-svg">
            <defs>
              <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--lp-accent)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--lp-accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {animated && (
              <>
                <polygon
                  points={`0,100 ${points} 100,100`}
                  fill="url(#nwFill)"
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke="var(--lp-accent)"
                  strokeWidth="0.8"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
          </svg>
          <div className="lp-artifact-line-labels">
            {netWorthData.map((d) => (
              <span key={d.month}>{d.month}</span>
            ))}
          </div>
        </div>

        {/* Account breakdown */}
        <div className="lp-artifact-accounts">
          {accountBreakdown.map((a) => (
            <div key={a.name} className="lp-artifact-account">
              <div className="lp-artifact-account-left">
                <span>{a.icon}</span>
                <span className="lp-artifact-account-name">{a.name}</span>
              </div>
              <span
                className="lp-artifact-account-amount"
                style={{ color: a.amount < 0 ? "#B85545" : "var(--lp-text)" }}
              >
                {a.amount < 0 ? "-" : "+"}${Math.abs(a.amount).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
