# Ledgr — Grilling Session (requirements.md stress-test)

> Interview to sharpen the requirements doc and derive an implementation plan.
> Design tree worked in rounds; each answer settles a branch and pushes the frontier outward.

**Status: Rounds 1–3 settled (Q1–Q6, Q8–Q17 all accepted). Round 4 (Q18–Q24) asked — awaiting answers.**
**Deliverables (once Round 4 confirms): sharpened `requirements.md` + milestone roadmap.**

---

## Facts (gathered from the codebase before asking anything)

| Requirement area | DB schema | tRPC routes | UI |
|---|---|---|---|
| Transactions, accounts, categories, tags | ✅ | ✅ | ✅ |
| Spaces, friends, splits, debts, settlements | ✅ | ✅ | ✅ |
| Budgets + periods + alert thresholds, goals + contributions | ✅ | ✅ | ✅ |
| Contacts (§15, built during this session) | ✅ | ✅ | ✅ |
| Recurring transactions (§32–33) | ✅ `recurring_rules`, `recurring_rule_logs` | ❌ | ❌ |
| Notifications (§45) | ✅ 3 tables | ❌ | ❌ |
| Import (§43) | ✅ `import_batches` | ❌ | ❌ |
| Merchants (§2, §41) | ✅ + aliases | ❌ (not exposed) | ❌ |
| Receipts/attachments (§2) | ✅ | ❌ | ❌ |
| Investments (§35) | ❌ no holdings/asset tables | ❌ | ❌ |
| Analytics, cash flow, net worth (§36–42) | ✅ summaries/snapshots | ❌ | ❌ |
| Calendar (§34), Forecast (§40), AI (§46–47), global Search (§44) | — | ❌ | ❌ |

**Summary:** the schema is far ahead of the product. Backend-ready but unexposed: recurring, notifications, import, merchants, attachments, analytics.

**Facts found mid-session:**
- The API (`apps/api`) is a plain Express server — no cron, queue, or worker exists anywhere in the repo (shapes the recurring-execution decision).
- `contacts` table already had normalized-email/E.164-phone unique indexes, purpose-built for match-on-join linking.
- Pre-existing issues (out of scope): `onboarding-wizard.tsx` broken imports; `packages/auth` CJS/ESM mismatch; TS5110 in `typescript-config/node.json` masks typechecking in auth/trpc/database packages.

---

# Round 1 — scope & strategy

### Q1 — Purpose of this session — ✅ SETTLED
What should come out of this grilling? (a) sharpened `requirments.md`, (b) implementation roadmap, (c) both, (d) stress-testing only.
➡️ Recommended **(c) both**.
**Answer: (c) both** — sharpen the doc into a buildable spec AND derive a milestone roadmap from the code-vs-doc gaps.

### Q2 — Strategy — ✅ SETTLED
Catch the UI up to the schema, or treat the schema as over-built?
➡️ Recommended **catch UI up to schema**.
**Answer: catch the UI up to the schema.** Recurring, notifications, import, analytics get exposed, not rebuilt.

### Q3 — Milestone order — ✅ SETTLED
MONEY/TOGETHER work; TOOLS and INSIGHTS are stubbed; INTELLIGENCE doesn't exist.
➡️ Recommended **TOOLS next**.
**Answer: TOOLS next** (recurring → import → notifications), then INSIGHTS, defer INTELLIGENCE. Recurring unlocks calendar + deterministic forecasting later.

### Q4 — Investments (§35) — ✅ SETTLED
➡️ Recommended **defer**.
**Answer: defer real investments.** Investment-type accounts stay manual-balance; holdings tables come later. Flag explicitly in the doc.

### Q5 — Multi-currency (§5) — ✅ SETTLED
➡️ Recommended **one base currency per space**.
**Answer: one base currency per space.** FX deferred; schema already pins currency to space.

### Q6 — Mutual debt netting (§20) — ✅ SETTLED
➡️ Recommended **display netting first**.
**Answer: display netting first** (pure computation over existing debts, no schema change), then a settle-net flow creating paired settlements.

### Q7 — Friends without accounts (§15) — ✅ SETTLED (by implementation)
Are account-less contacts first-class?
**Answer: Yes, first-class.** Settled by the user directing the build this session:
- Contacts address book (CRUD) + offline participants, first-class
- Auto-link on join via better-auth signup hook (normalized email / E.164 phone match)
- `contacts` tRPC router registered; combined people search (users + contacts, deduped)
- Friends UI rebuilt: Contacts tab, Joined-Ledgr section, manual-link fallback, unblock feature

### Q8 — AI & Forecasting (§40, §46–47) — ✅ SETTLED
➡️ Recommended **defer AI; deterministic forecasting**.
**Answer: defer AI entirely; deterministic forecasting only** (recurring rules + trailing averages), clearly labeled as projections per §40.

---

# Round 2 — carried questions re-asked

Q1–Q6 and Q8 were re-asked verbatim (original Round 1 batch was partially unanswered); **user accepted all recommendations** — recorded above as SETTLED.

### Q9 — Contacts in bill splits — ✅ SETTLED
Unblocked by Q7. Should the split UI fully support offline contacts (pick from address book or type a name), with the payer's contact becoming the debtor?
➡️ Recommended **yes, full support**.
**Answer: yes, full support.**

### Q10 — Re-attribution when a contact joins — ✅ SETTLED
Unblocked by Q7. When a contact links to a real user, what happens to past records?
- (a) re-attribute all history to the user ID
- (b) history stays on the contact; only future records use the user
- (c) hybrid
➡️ Recommended **(c) hybrid**.
**Answer: (c) hybrid.** Open debts re-point to the linked user (so they can see and settle what they owe); completed/split history stays immutable per §51.

---

# Round 3 — TOOLS milestone detail (unblocked by Q2+Q3)

_Fact: no cron/queue/worker exists in the repo — the API is a plain Express server._

### Q11 — Recurring execution model (§32–33) — ✅ SETTLED
(a) in-process scheduler in Express, (b) lazy evaluation on read, (c) both.
➡️ Recommended **(c)**.
**Answer: (c) both** — lazy catch-up on read + in-process scheduler tick in the Express API.

### Q12 — Budget rollover (§24) — ✅ SETTLED
(a) unused carries into next period, (b) overspend deducts from next period, (c) both directions.
➡️ Recommended **(a)**.
**Answer: (a)** — unused budget rolls into the next period's limit.

### Q13 — Settlement currency (§21) — ✅ SETTLED
(a) always the debt's (space base) currency, (b) any currency with FX.
➡️ Recommended **(a)**.
**Answer: (a)** — settlements always in the space's base currency for now.

### Q14 — Notification channels (§45) — ✅ SETTLED
(a) in-app only, (b) + email (needs provider), (c) all three.
➡️ Recommended **(a)**.
**Answer: (a) in-app only** — email/push shown as coming soon; provider choice deferred.

### Q15 — Import scope (§43) — ✅ SETTLED
(a) CSV first with full five-step flow, (b) CSV + one bank format, (c) all formats.
➡️ Recommended **(a)**.
**Answer: (a)** — CSV first (upload → map → preview → review → import) with duplicate detection (date, amount, fuzzy description) per space; formats additive later.

### Q16 — Receipts/attachments storage (§2) — ✅ SETTLED
(a) local disk, (b) S3-compatible object storage, (c) defer.
➡️ Recommended **(b)**.
**Answer: (b) S3-compatible** object storage behind a storage interface (local-disk dev fallback); provider choice is a follow-up decision.

### Q17 — Sequencing within TOOLS — ✅ SETTLED
➡️ Recommended **1. Recurring → 2. In-app notifications → 3. CSV import → 4. Attachments**.
**Answer: as recommended** — each step feeds the next (recurring generates notifications; import output feeds INSIGHTS).

---

# Round 4 — INSIGHTS, settle-net placement, deliverables (AWAITING ANSWERS)

### Q18 — Insights v1 surface (§48)
§48 lists Overview / Spending / Income / Cash Flow / Net Worth / Forecast. Which are must-have for v1?
- (a) Spending + Income + Overview (totals, by-category, by-merchant, trends)
- (b) (a) + Cash Flow
- (c) All six including Net Worth + Forecast
➡️ **Recommended: (b)** — covers "where does my money go"; Net Worth lands with it (Q19), Forecast right after TOOLS recurring exists (it needs recurring rules as input).

**Your answer:** _pending_

### Q19 — Net worth composition (§36)
With investments deferred (Q4): (a) account balances only (assets − liabilities), or (b) also person-to-person debts (net receivable/payable)?
➡️ **Recommended: (b)** — §36 explicitly lists debts as liabilities, the data exists, and it makes the TOGETHER↔INSIGHTS connection real.

**Your answer:** _pending_

### Q20 — Deterministic forecast inputs (§40)
(a) recurring rules only, (b) + trailing 90-day category averages, (c) + known upcoming obligations (unsettled debts).
➡️ **Recommended: (c)** — all inputs exist in the schema; every number stays explainable (§46), and the UI labels it "projection".

**Your answer:** _pending_

### Q21 — Metric drill-down (§48)
§48 requires metric → category breakdown → merchant breakdown → transactions. Build drill-through into v1, or summary cards first?
➡️ **Recommended: drill-through in v1** — the transaction list + filters already exist; wiring clicks to them is cheap and it's the doc's core "connected system" promise (§58).

**Your answer:** _pending_

### Q22 — Settle-net flow placement (follows from Q6)
(a) before TOOLS, (b) inside TOOLS as step 5, (c) with INSIGHTS.
➡️ **Recommended: (b)** — TOOLS first per Q3; settle-net pairs with the netting display; INSIGHTS then reads correct net-debt numbers.

**Your answer:** _pending_

### Q23 — Deliverable shape (follows from Q1)
(a) rewrite `requirments.md` in place (fix the filename typo too) with decisions folded in and a roadmap section at the end, (b) keep the doc pure and add `docs/DECISIONS.md` + `docs/ROADMAP.md`, (c) rewrite + separate decisions file.
➡️ **Recommended: (a) + rename to `requirements.md`** — one source of truth; this session file stays as the audit trail.

**Your answer:** _pending_

### Q24 — After the doc: implement?
(a) start TOOLS step 1 (recurring) immediately after the doc is confirmed, or (b) doc only — implementation in a fresh session.
➡️ **Recommended: (b)** — the sharpened doc should be reviewable first; recurring execution touches posting logic and deserves a focused run.

**Your answer:** _pending_

---

## Frontier status

- **Settled:** Q1–Q17 (Rounds 1–3) — Q18–Q24 outstanding (Round 4)
- **When Q18–Q24 land:** frontier is empty → write the deliverables, get explicit confirmation of shared understanding, then act (per Q24).
