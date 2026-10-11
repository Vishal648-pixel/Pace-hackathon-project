import type { MonthState } from "./types";
import {
  dailyAllowance,
  goalContributionRemaining,
  isCommitmentRemaining,
  isSubscriptionRemaining,
} from "./safeToSpend";
import { daysLeft, MONTH_DAYS, sum } from "./util";

export function manualSpendByDay(state: MonthState): Map<number, number> {
  const m = new Map<number, number>();
  for (const t of state.transactions) {
    if (t.source === "manual" && t.amount < 0) m.set(t.day, (m.get(t.day) ?? 0) - t.amount);
  }
  return m;
}

/** Average discretionary spend over the last 7 elapsed days, or null without history. */
export function recentAvgSpend(state: MonthState): number | null {
  const day = state.profile.day;
  const byDay = manualSpendByDay(state);
  if (byDay.size === 0) return null;
  const from = Math.max(1, day - 6);
  const span = day - from + 1;
  let total = 0;
  for (let d = from; d <= day; d++) total += byDay.get(d) ?? 0;
  return total / span;
}

export function blendedBurn(state: MonthState): number {
  const allowance = Math.max(0, dailyAllowance(state));
  const avg = recentAvgSpend(state) ?? state.profile.baselineDaily;
  return 0.5 * avg + 0.5 * allowance;
}

function upcomingIncome(state: MonthState): number {
  const d = state.profile.day;
  return sum(
    state.incomes.filter((i) => i.enabled && !i.received && i.day >= d).map((i) => i.amount),
  );
}

export function upcomingBills(state: MonthState): number {
  const d = state.profile.day;
  return (
    sum(state.commitments.filter((c) => isCommitmentRemaining(c, d)).map((c) => c.amount)) +
    sum(state.subscriptions.filter((s) => isSubscriptionRemaining(s, d)).map((s) => s.amount)) +
    sum(state.goals.map((g) => goalContributionRemaining(g, d)))
  );
}

export function forecastDay30(state: MonthState): number {
  return (
    state.balance +
    upcomingIncome(state) -
    upcomingBills(state) -
    blendedBurn(state) * daysLeft(state.profile.day)
  );
}

export interface ForecastPoint {
  day: number;
  balance: number;
  /** Items landing on this day (used for markers). */
  items: { label: string; amount: number }[];
}

/** Day-by-day projection from today to day 30 (balance at end of each day). */
export function forecastSeries(state: MonthState): ForecastPoint[] {
  const d0 = state.profile.day;
  const burn = blendedBurn(state);
  let bal = state.balance;
  const out: ForecastPoint[] = [];
  for (let d = d0; d <= MONTH_DAYS; d++) {
    const items: ForecastPoint["items"] = [];
    for (const i of state.incomes)
      if (i.enabled && !i.received && i.day === d) items.push({ label: i.label, amount: i.amount });
    for (const c of state.commitments) {
      if (c.status === "late" && d === d0)
        items.push({ label: `${c.label} (late)`, amount: -c.amount });
      else if (c.status === "pending" && c.dueDay === d)
        items.push({ label: c.label, amount: -c.amount });
    }
    for (const s of state.subscriptions)
      if (isSubscriptionRemaining(s, d0) && s.renewDay === d)
        items.push({ label: s.label, amount: -s.amount });
    for (const g of state.goals) {
      const amt = goalContributionRemaining(g, d0);
      if (amt > 0 && g.contributionDay === d)
        items.push({ label: `${g.label} goal`, amount: -amt });
    }
    bal += sum(items.map((x) => x.amount)) - burn;
    out.push({ day: d, balance: bal, items });
  }
  return out;
}
