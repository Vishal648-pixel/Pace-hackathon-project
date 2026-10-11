import type { Commitment, Goal, MonthState, Subscription } from "./types";
import { daysLeft, sum } from "./util";

export const isCommitmentRemaining = (c: Commitment, day: number): boolean =>
  c.status === "late" || (c.status === "pending" && c.dueDay >= day);

export const isSubscriptionRemaining = (s: Subscription, day: number): boolean =>
  s.active && !s.charged && s.renewDay >= day;

export const goalContributionRemaining = (g: Goal, day: number): number =>
  !g.contributed && g.contributionDay >= day
    ? Math.max(0, Math.min(g.plannedThisMonth, g.target - g.saved))
    : 0;

function reservedRemaining(state: MonthState): {
  commitments: number;
  subscriptions: number;
  goals: number;
  total: number;
} {
  const d = state.profile.day;
  const commitments = sum(
    state.commitments.filter((c) => isCommitmentRemaining(c, d)).map((c) => c.amount),
  );
  const subscriptions = sum(
    state.subscriptions.filter((s) => isSubscriptionRemaining(s, d)).map((s) => s.amount),
  );
  const goals = sum(state.goals.map((g) => goalContributionRemaining(g, d)));
  return { commitments, subscriptions, goals, total: commitments + subscriptions + goals };
}

export function safeToSpend(state: MonthState): number {
  return state.balance - reservedRemaining(state).total - state.profile.bufferFloor;
}

export function dailyAllowance(state: MonthState): number {
  return safeToSpend(state) / daysLeft(state.profile.day);
}
