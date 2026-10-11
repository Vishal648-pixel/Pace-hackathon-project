import type { Decision, MonthState } from "./types";
import { sum } from "./util";

export interface Report {
  bestDecision: Decision | null;
  worstDecision: Decision | null;
  couldHaveSaved: number;
  subscriptionsSpend: number;
  wantsSpend: number;
  totalSpent: number;
  noSpendStreak: number;
  shocks: number;
}

export function buildReport(state: MonthState): Report {
  const sorted = [...state.decisions].sort(
    (a, b) => b.healthImpact - a.healthImpact || b.moneyImpact - a.moneyImpact,
  );
  const best = sorted[0] ?? null;
  const worst = sorted.length > 1 ? (sorted[sorted.length - 1] ?? null) : null;
  const subscriptionsSpend = sum(
    state.transactions.filter((t) => t.source === "subscription").map((t) => -t.amount),
  );
  const pendingSubs = sum(
    state.subscriptions.filter((s) => s.active && !s.charged).map((s) => s.amount),
  );
  const wantsSpend = sum(
    state.transactions
      .filter((t) => t.source === "manual" && t.type === "want")
      .map((t) => -t.amount),
  );
  const totalSpent = sum(
    state.transactions.filter((t) => t.amount < 0 && t.source !== "goal").map((t) => -t.amount),
  );
  return {
    bestDecision: best,
    worstDecision: worst,
    couldHaveSaved: Math.round(subscriptionsSpend + pendingSubs + wantsSpend / 2),
    subscriptionsSpend,
    wantsSpend,
    totalSpent,
    noSpendStreak: state.streak,
    shocks: state.eventLog.length,
  };
}

export type LetterGrade = "A" | "B" | "C" | "D";

/** Final month grade from health score (0-100) and closing balance. */
export function gradeMonth(healthScore: number, balance: number): LetterGrade {
  if (balance < 0) return "D";
  if (healthScore >= 75) return "A";
  if (healthScore >= 55) return "B";
  if (healthScore >= 35) return "C";
  return "D";
}

export const GRADE_BLURB: Record<LetterGrade, string> = {
  A: "Flawless landing. You ran the month like a pro.",
  B: "Solid flight. A few bumps, but you made it comfortably.",
  C: "You survived. Some turbulence worth learning from.",
  D: "Rough landing. Next month is a fresh runway.",
};
