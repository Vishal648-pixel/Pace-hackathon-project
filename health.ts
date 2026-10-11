import type { HealthComponent, HealthResult, MonthState } from "./types";
import { recentAvgSpend } from "./forecast";
import {
  dailyAllowance,
  goalContributionRemaining,
  isCommitmentRemaining,
  isSubscriptionRemaining,
  safeToSpend,
} from "./safeToSpend";
import { clamp, round, sum } from "./util";

function healthLabel(score: number): HealthResult["label"] {
  if (score >= 80) return "Great";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs attention";
}

export function healthScore(state: MonthState): HealthResult {
  const d = state.profile.day;
  const allowance = dailyAllowance(state);
  const avg = recentAvgSpend(state);
  const comps: HealthComponent[] = [];

  const adherence =
    allowance <= 0 ? 0 : avg === null || avg === 0 ? 1 : clamp(allowance / avg, 0, 1);
  comps.push({
    key: "budget",
    label: "Budget adherence",
    earned: round(25 * adherence),
    max: 25,
    suggestion:
      adherence < 0.8
        ? "Keep daily spending under your allowance for a few days to rebuild."
        : null,
  });

  const targets = sum(state.goals.map((g) => g.target));
  const progress = sum(state.goals.map((g) => g.saved + goalContributionRemaining(g, d)));
  const savings = targets > 0 ? clamp(progress / (targets * 0.5), 0, 1) : 1;
  comps.push({
    key: "savings",
    label: "Savings progress",
    earned: round(25 * savings),
    max: 25,
    suggestion: savings < 0.8 ? "Nudge a goal contribution up, even by ₹100." : null,
  });

  const buffer = clamp(
    (safeToSpend(state) + state.profile.bufferFloor) / (2 * Math.max(1, state.profile.bufferFloor)),
    0,
    1,
  );
  comps.push({
    key: "buffer",
    label: "Safety buffer",
    earned: round(20 * buffer),
    max: 20,
    suggestion:
      buffer < 0.8 ? "Hold back on wants until your buffer is back above the floor." : null,
  });

  const owed =
    sum(state.commitments.filter((c) => isCommitmentRemaining(c, d)).map((c) => c.amount)) +
    sum(state.subscriptions.filter((s) => isSubscriptionRemaining(s, d)).map((s) => s.amount));
  const lateCount = state.commitments.filter((c) => c.status === "late").length;
  const coverage = owed === 0 ? 1 : clamp(state.balance / owed, 0, 1);
  const covered = clamp(15 * coverage - 5 * lateCount, 0, 15);
  comps.push({
    key: "commitments",
    label: "Commitments covered",
    earned: round(covered),
    max: 15,
    suggestion: covered < 12 ? "Clear late bills first, they add a ₹100 fee each." : null,
  });

  const monthlyIn =
    state.profile.openingBalance + sum(state.incomes.filter((i) => i.enabled).map((i) => i.amount));
  const subTotal = sum(state.subscriptions.filter((s) => s.active).map((s) => s.amount));
  const load = monthlyIn > 0 ? subTotal / monthlyIn : 1;
  const subScore = clamp(1 - (load - 0.05) / 0.15, 0, 1);
  comps.push({
    key: "subscriptions",
    label: "Subscription load",
    earned: round(10 * subScore),
    max: 10,
    suggestion: subScore < 0.8 ? "Cancel one subscription you haven't opened this week." : null,
  });

  const manual = state.transactions.filter((t) => t.source === "manual" && t.amount < 0);
  const totalManual = sum(manual.map((t) => -t.amount));
  const wants = sum(manual.filter((t) => t.type === "want").map((t) => -t.amount));
  const wantRatio = totalManual > 0 ? wants / totalManual : 0;
  const nw = clamp(1 - (wantRatio - 0.3) / 0.4, 0, 1);
  comps.push({
    key: "needWant",
    label: "Need/want balance",
    earned: round(5 * nw),
    max: 5,
    suggestion: nw < 0.8 ? "Swap one want this week for a no-spend day." : null,
  });

  const score = round(clamp(sum(comps.map((c) => c.earned)), 0, 100));
  return {
    score,
    label: healthLabel(score),
    components: comps,
    suggestions: comps.map((c) => c.suggestion).filter((s): s is string => s !== null),
  };
}
