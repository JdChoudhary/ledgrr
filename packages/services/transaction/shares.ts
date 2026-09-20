import type { BillSplitParticipantInput, SplitShare } from "./model";

/**
 * Deterministic allocation of a transaction amount across split participants.
 *
 * Supported modes:
 *   equal      -> amount / N, remainder cents dealt one-by-one to the first
 *                 participants in input order (deterministic)
 *   exact      -> shareValue IS the amount; validated to sum to the total
 *   percentage -> shareValue is 0..100; allocated proportionally with the
 *                 remainder distributed deterministically; shares must sum to 100
 *   shares     -> shareValue is a positive weight; allocated proportionally
 *                 with the remainder distributed deterministically
 *
 * Invariant for every mode: SUM(allocated amounts) === total, exactly, at 4dp.
 * This is what makes "sum(participant shares) = transaction amount" hold in
 * the database without floating-point drift.
 *
 * BigInt is used via the constructor (not literals) so the file compiles for
 * consumers targeting ES2017 (lint rule TS2737).
 */

const SCALE = 4;
const UNIT = 10_000; // 10^SCALE — everything is computed in integer minor units

const ZERO = BigInt(0);
const ONE = BigInt(1);
const UNIT_BI = BigInt(UNIT);
const HUNDRED_UNITS = BigInt(100) * UNIT_BI;

const toMinorUnits = (value: string): bigint => {
  const negative = value.startsWith("-");
  const parts = value.replace("-", "").split(".");
  const wholePart = parts[0] ?? "0";
  const fracPart = parts[1] ?? "";
  const frac = (fracPart + "0".repeat(SCALE)).slice(0, SCALE);
  const units =
    BigInt(wholePart === "" ? "0" : wholePart) * UNIT_BI +
    BigInt(frac === "" ? "0" : frac);
  return negative ? -units : units;
};

const toMajorString = (units: bigint): string => {
  const negative = units < ZERO;
  const abs = negative ? -units : units;
  const whole = abs / UNIT_BI;
  const frac = (abs % UNIT_BI).toString().padStart(SCALE, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
};

/** Normalise an input share value (number or decimal string) to a 4dp string. */
const normalizeMoney = (value: string | number | null | undefined): string =>
  value == null ? "0.0000" : Number(value).toFixed(4);

type AllocatedRow = {
  index: number;
  userId: string | null;
  contactId: string | null;
  name: string | null;
  shareType: "equal" | "exact" | "percentage" | "shares";
  shareValue: string;
  amountUnits: bigint;
};

const sumUnits = (rows: readonly AllocatedRow[]): bigint =>
  rows.reduce((acc, row) => acc + row.amountUnits, ZERO);

/** Distribute `remainder` minor units one-by-one starting at `startIndex`. */
const distributeRemainder = (
  rows: AllocatedRow[],
  remainder: bigint,
  startIndex: number,
): void => {
  if (remainder === ZERO) return;
  const sign = remainder > ZERO ? ONE : -ONE;
  let remaining = remainder * sign;
  let cursor = startIndex;
  while (remaining > ZERO) {
    const idx = cursor % rows.length;
    const row = rows[idx];
    if (row) row.amountUnits += sign;
    remaining -= ONE;
    cursor += 1;
  }
};

/**
 * Allocate `total` across `participants`. Throws a plain Error when shares
 * cannot reconcile; the caller translates it into a ServiceError.
 */
export function allocateShares(
  total: string,
  participants: BillSplitParticipantInput[],
): SplitShare[] {
  const totalUnits = toMinorUnits(total);

  const normalized: AllocatedRow[] = participants.map((p, index) => ({
    index,
    userId: p.userId ?? null,
    contactId: p.contactId ?? null,
    name: p.name ?? null,
    shareType: p.shareType,
    shareValue: normalizeMoney(p.shareValue),
    amountUnits: ZERO,
  }));

  if (normalized.length < 2) {
    throw new Error("A split requires at least two participants");
  }

  const first = normalized[0];
  if (!first) {
    throw new Error("A split requires at least two participants");
  }
  const mode = first.shareType;

  // All participants of a split share the same share_type.
  for (const p of normalized) {
    if (p.shareType !== mode) {
      throw new Error("All participants of a split must use the same share type");
    }
  }

  if (mode === "equal") {
    const perHead = totalUnits / BigInt(normalized.length);
    const remainder = totalUnits % BigInt(normalized.length);
    for (const row of normalized) row.amountUnits = perHead;
    distributeRemainder(normalized, remainder, 0);
  } else if (mode === "exact") {
    for (const row of normalized) {
      const units = toMinorUnits(row.shareValue);
      if (units <= ZERO) {
        throw new Error("Exact share amounts must be greater than zero");
      }
      row.amountUnits = units;
    }
  } else if (mode === "percentage") {
    // Shares must total exactly 100.
    const percentSum = normalized.reduce(
      (acc, p) => acc + toMinorUnits(p.shareValue),
      ZERO,
    );
    if (percentSum !== HUNDRED_UNITS) {
      throw new Error("Percentage shares must sum to 100");
    }
    // amount = total * pct / 100, floored; remainder distributed in order.
    for (const row of normalized) {
      const pct = toMinorUnits(row.shareValue);
      row.amountUnits = (totalUnits * pct) / HUNDRED_UNITS;
    }
    distributeRemainder(normalized, totalUnits - sumUnits(normalized), 0);
  } else {
    // shares mode: weight > 0 for every participant.
    for (const row of normalized) {
      if (toMinorUnits(row.shareValue) <= ZERO) {
        throw new Error("Share weights must be greater than zero");
      }
    }
    const weightSum = normalized.reduce(
      (acc, p) => acc + toMinorUnits(p.shareValue),
      ZERO,
    );
    for (const row of normalized) {
      const weight = toMinorUnits(row.shareValue);
      row.amountUnits = (totalUnits * weight) / weightSum;
    }
    distributeRemainder(normalized, totalUnits - sumUnits(normalized), 0);
  }

  // Final reconciliation — the invariant the whole model rests on.
  const finalSum = sumUnits(normalized);
  if (finalSum !== totalUnits) {
    throw new Error(
      `Split shares must sum to the transaction amount (got ${toMajorString(finalSum)}, expected ${total})`,
    );
  }

  return normalized.map((row) => ({
    index: row.index,
    userId: row.userId,
    contactId: row.contactId,
    name: row.name,
    shareType: row.shareType,
    shareValue: row.shareValue,
    amount: toMajorString(row.amountUnits),
  }));
}

/** Pure helper for the UI: preview shares without persisting anything. */
export function previewShares(input: {
  amount: string;
  participants: BillSplitParticipantInput[];
}): SplitShare[] {
  return allocateShares(input.amount, input.participants);
}
