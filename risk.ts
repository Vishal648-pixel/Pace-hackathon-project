import type { MonthState, RiskResult } from "./types";
import { blendedBurn, manualSpendByDay, upcomingBills } from "./forecast";
import { safeToSpend } from "./safeToSpend";
import { clamp, daysLeft, MONTH_DAYS, round } from "./util";
import { SHOCK_DECK, SHOCK_CHANCE } from "./events";
import { formatINR } from "./util";

interface Factor {
  weight: number;
  bad: number;
  reason: string;
}

/** Walks the remaining days and returns the first bill the projected cash cannot cover. */
function firstShortfall(state: MonthState): { label: string; day: number; short: number } | null {
  const d0 = state.profile.day;
  const burn = blendedBurn(state);
  let bal = state.balance;
  for (let d = d0; d <= MONTH_DAYS; d++) {
    for (const i of state.incomes) if (i.enabled && !i.received && i.day === d) bal += i.amount;
    const dues: { label: string; amount: number }[] = [];
    for (const c of state.commitments) {
      if ((c.status === "late" && d === d0) || (c.status === "pending" && c.dueDay === d))
        dues.push(c);
    }
    for (const s of state.subscriptions)
      if (s.active && !s.charged && s.renewDay === d && d >= d0) dues.push(s);
    for (const due of dues) {
      if (bal < due.amount) return { label: due.label, day: d, short: due.amount - bal };
      bal -= due.amount;
    }
    bal -= burn;
  }
  return null;
}

export function riskScore(state: MonthState): RiskResult {
  const dl = daysLeft(state.profile.day);
  const burn = blendedBurn(state);
  const sts = safeToSpend(state);
  const bills = upcomingBills(state);
  const perDayOut = burn + bills / dl;
  const runwayDays = perDayOut > 0 ? Math.max(0, state.balance) / perDayOut : dl;

  const factors: Factor[] = [];

  factors.push({
    weight: 30,
    bad: clamp(1 - runwayDays / dl, 0, 1),
    reason:
      runwayDays >= dl
        ? `Your cash covers all ${dl} days left at today's pace.`
        : `At today's pace your cash lasts about ${Math.floor(runwayDays)} of the ${dl} days left.`,
  });

  const bufferRatio = state.balance > 0 ? sts / state.balance : -1;
  factors.push({
    weight: 20,
    bad: clamp(1 - bufferRatio / 0.3, 0, 1),
    reason:
      sts < 0
        ? `You're ${formatINR(-sts)} below your ${formatINR(state.profile.bufferFloor)} safety buffer.`
        : `Only ${Math.max(0, round(bufferRatio * 100))}% of your balance is free after bills and goals.`,
  });

  const shortfall = firstShortfall(state);
  factors.push({
    weight: 25,
    bad: shortfall
      ? clamp(0.5 + shortfall.short / Math.max(1, state.profile.bufferFloor), 0, 1)
      : 0,
    reason: shortfall
      ? `${shortfall.label} on day ${shortfall.day} leaves you ${formatINR(shortfall.short)} short.`
      : "Every bill left this month is covered by projected cash.",
  });

  const byDay = manualSpendByDay(state);
  const from = Math.max(1, state.profile.day - 6);
  const daily: number[] = [];
  for (let d = from; d <= state.profile.day; d++) daily.push(byDay.get(d) ?? 0);
  const mean = daily.reduce((a, b) => a + b, 0) / Math.max(1, daily.length);
  const sd = Math.sqrt(daily.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, daily.length));
  const cv = mean > 0 ? sd / mean : 0;
  const lumpy = state.profile.persona === "freelancer" ? 0.35 : 0;
  factors.push({
    weight: 10,
    bad: clamp(cv / 2 + lumpy, 0, 1),
    reason:
      lumpy > 0
        ? "Client payments arrive in lumps, so cash swings more than usual."
        : cv > 1
          ? "Your daily spending swings a lot, which makes the month harder to predict."
          : "Your daily spending is fairly steady.",
  });

  const avgShock =
    SHOCK_DECK.filter((e) => e.cost > 0).reduce((a, e) => a + e.cost, 0) / SHOCK_DECK.length;
  const expected = avgShock * SHOCK_CHANCE * dl;
  factors.push({
    weight: 15,
    bad: clamp(expected / Math.max(1, sts + state.profile.bufferFloor), 0, 1),
    reason: `A surprise expense of around ${formatINR(avgShock)} would eat ${
      sts > 0 ? `${round(clamp(avgShock / sts, 0, 9.99) * 100)}% of` : "into"
    } your free cash.`,
  });

  const score = round(
    clamp(
      factors.reduce((a, f) => a + f.weight * f.bad, 0),
      0,
      100,
    ),
  );
  const label: RiskResult["label"] = score < 35 ? "Low" : score < 65 ? "Medium" : "High";
  const reasons = [...factors]
    .sort((a, b) => b.weight * b.bad - a.weight * a.bad)
    .slice(0, 3)
    .map((f) => f.reason);
  return { score, label, reasons };
}
