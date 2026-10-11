import type { GoalEta, Metrics, MonthState, Scenario } from "./types";
import { postTransaction } from "./actions";
import { computeMetrics } from "./metrics";
import { goalEta } from "./goals";
import { uid } from "./rng";
import { LATE_FEE } from "./advanceDay";
import { formatINR, MONTH_DAYS, round } from "./util";

export interface ApplyResult<T> {
  state: T;
  notes: string[];
}

const clone = <T>(s: T): T => structuredClone(s);

/** Applies a scenario to a deep clone. The input state is never mutated. */
export function applyScenario<T extends MonthState>(input: T, sc: Scenario): ApplyResult<T> {
  let s = clone(input);
  const d = s.profile.day;
  const notes: string[] = [];
  switch (sc.kind) {
    case "purchase": {
      const amount = Math.abs(sc.amount);
      if (sc.day <= d) {
        s = postTransaction(s, {
          day: d,
          amount: -amount,
          label: sc.label || "One-off purchase",
          category: "shopping",
          type: "want",
          source: "manual",
        });
      } else {
        s.commitments.push({
          id: uid("c"),
          label: sc.label || "Planned purchase",
          amount,
          dueDay: Math.min(MONTH_DAYS, sc.day),
          status: "pending",
        });
      }
      break;
    }
    case "addSubscription":
      s.subscriptions.push({
        id: uid("s"),
        label: sc.label || "New subscription",
        amount: Math.abs(sc.amount),
        renewDay: Math.max(d, Math.min(MONTH_DAYS, sc.renewDay)),
        active: true,
        charged: false,
      });
      break;
    case "cancelSubscription": {
      const sub = s.subscriptions.find((x) => x.id === sc.subscriptionId);
      if (sub) {
        if (sub.charged || sub.renewDay < d)
          notes.push(
            `${sub.label} already renewed this month, so cancelling saves nothing until next month.`,
          );
        sub.active = false;
      }
      break;
    }
    case "skipCommitment": {
      const c = s.commitments.find((x) => x.id === sc.commitmentId);
      if (c && (c.status === "pending" || c.status === "late")) {
        if (sc.mode === "skip") {
          c.status = "skipped";
          notes.push(`Skipping ${c.label} keeps ${formatINR(c.amount)} now, but you still owe it.`);
        } else {
          const newDay = Math.min(
            MONTH_DAYS,
            Math.max(d, c.dueDay) + Math.max(1, Math.round(sc.delayDays)),
          );
          c.dueDay = newDay;
          c.status = "pending";
          s.commitments.push({
            id: uid("c"),
            label: `Late fee: ${c.label}`,
            amount: LATE_FEE,
            dueDay: newDay,
            status: "pending",
          });
          notes.push(
            `Delaying ${c.label} to day ${newDay} adds a ${formatINR(LATE_FEE)} late fee.`,
          );
        }
      }
      break;
    }
    case "goalContribution": {
      const g = s.goals.find((x) => x.id === sc.goalId);
      if (g) {
        const cap = Math.max(0, g.target - g.saved);
        g.plannedThisMonth = Math.min(Math.max(0, sc.amount), cap);
        if (sc.amount > cap)
          notes.push(
            `${g.label} only needs ${formatINR(cap)} more, so the contribution is capped.`,
          );
      }
      break;
    }
    case "extraIncome":
      s.incomes.push({
        id: uid("inc"),
        day: Math.max(d, Math.min(MONTH_DAYS, sc.day)),
        amount: Math.abs(sc.amount),
        label: sc.label || "Extra income",
        enabled: true,
        received: false,
      });
      break;
    case "habit": {
      const remainingDays = MONTH_DAYS - d + 1;
      const total = round((Math.max(0, sc.timesPerWeek) / 7) * remainingDays * Math.abs(sc.cost));
      if (total > 0) {
        if (sc.mode === "add") {
          s.commitments.push({
            id: uid("c"),
            label: `Habit: ${sc.label || "new habit"}`,
            amount: total,
            dueDay: MONTH_DAYS,
            status: "pending",
          });
        } else {
          s.incomes.push({
            id: uid("inc"),
            day: MONTH_DAYS,
            amount: total,
            label: `Habit savings: ${sc.label || "habit"}`,
            enabled: true,
            received: false,
          });
        }
      }
      break;
    }
  }
  return { state: s, notes };
}

export type Verdict = "Safe" | "Tight" | "Risky";

export interface Comparison {
  before: Metrics;
  after: Metrics;
  etaBefore: Record<string, GoalEta>;
  etaAfter: Record<string, GoalEta>;
  translators: string[];
  breach: string | null;
  verdict: Verdict;
  verdictReason: string;
  notes: string[];
}

export function describeScenario(sc: Scenario, state: MonthState): string {
  switch (sc.kind) {
    case "purchase":
      return `Buy ${sc.label || "something"} for ${formatINR(sc.amount)}`;
    case "addSubscription":
      return `Add ${sc.label || "subscription"} (${formatINR(sc.amount)}/mo)`;
    case "cancelSubscription":
      return `Cancel ${state.subscriptions.find((s) => s.id === sc.subscriptionId)?.label ?? "subscription"}`;
    case "skipCommitment": {
      const c = state.commitments.find((x) => x.id === sc.commitmentId)?.label ?? "commitment";
      return sc.mode === "skip" ? `Skip ${c}` : `Delay ${c} by ${sc.delayDays} days`;
    }
    case "goalContribution":
      return `Set ${state.goals.find((g) => g.id === sc.goalId)?.label ?? "goal"} to ${formatINR(sc.amount)}`;
    case "extraIncome":
      return `Extra income ${formatINR(sc.amount)}`;
    case "habit":
      return `${sc.mode === "add" ? "Start" : "Cut"} ${sc.label || "habit"} ${sc.timesPerWeek}×/week`;
  }
}

export function compareScenario(state: MonthState, sc: Scenario): Comparison {
  const { state: after, notes } = applyScenario(state, sc);
  const before = computeMetrics(state);
  const afterM = computeMetrics(after);
  const etaBefore: Record<string, GoalEta> = {};
  const etaAfter: Record<string, GoalEta> = {};
  for (const g of state.goals) etaBefore[g.id] = goalEta(state, g);
  for (const g of after.goals) etaAfter[g.id] = goalEta(after, g);

  const translators: string[] = [];
  const balanceDelta = afterM.balance - before.balance;
  const stsDelta = afterM.safeToSpend - before.safeToSpend;
  const moneyDelta = balanceDelta !== 0 ? balanceDelta : stsDelta;
  if (moneyDelta < 0 && before.dailyAllowance > 0) {
    translators.push(`That is ${round(-moneyDelta / before.dailyAllowance, 1)} days of allowance.`);
  } else if (moneyDelta > 0 && before.dailyAllowance > 0) {
    translators.push(
      `That frees up ${round(moneyDelta / before.dailyAllowance, 1)} days of allowance.`,
    );
  }
  for (const g of state.goals) {
    const a = etaBefore[g.id]?.rawDay;
    const b = etaAfter[g.id]?.rawDay;
    if (a != null && b != null && a !== b) {
      translators.push(
        b > a
          ? `${g.label} goal slips by ${b - a} days.`
          : `${g.label} goal arrives ${a - b} days sooner.`,
      );
    } else if (a != null && b == null) {
      translators.push(`${g.label} goal is no longer reachable at this pace.`);
    }
  }
  const forecastDelta = afterM.forecast - before.forecast;
  if (Math.abs(forecastDelta) >= 1) {
    translators.push(
      `Your day-30 balance ${forecastDelta > 0 ? "rises" : "drops"} by ${formatINR(Math.abs(forecastDelta))}.`,
    );
  }

  let breach: string | null = null;
  if (afterM.balance < 0) breach = "This takes your balance below zero.";
  else if (afterM.safeToSpend < 0)
    breach = `This dips ${formatINR(-afterM.safeToSpend)} into your ${formatINR(state.profile.bufferFloor)} safety buffer.`;

  let verdict: Verdict = "Safe";
  let verdictReason = "You stay above your buffer with room to spare.";
  if (afterM.safeToSpend < 0 || afterM.risk.score >= 65) {
    verdict = "Risky";
    verdictReason =
      afterM.safeToSpend < 0
        ? "It breaks your safety buffer."
        : `Risk climbs to ${afterM.risk.score}/100.`;
  } else if (afterM.dailyAllowance < before.dailyAllowance * 0.75 || afterM.risk.score >= 35) {
    verdict = "Tight";
    verdictReason = `Your daily allowance falls to ${formatINR(afterM.dailyAllowance)}.`;
  }

  return {
    before,
    after: afterM,
    etaBefore,
    etaAfter,
    translators,
    breach,
    verdict,
    verdictReason,
    notes,
  };
}
