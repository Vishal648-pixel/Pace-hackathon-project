import type { Goal, MonthState, ShockEvent } from "./types";
import { postTransaction, recordDecision } from "./actions";
import { maybeEvent } from "./events";
import { uid } from "./rng";
import { MONTH_DAYS } from "./util";

export const LATE_FEE = 100;

export interface AdvanceResult<T> {
  state: T;
  notes: string[];
}

/** Posts everything due today (income → bills → subscriptions → goals), then moves to tomorrow. */
export function advanceDay<T extends MonthState>(input: T): AdvanceResult<T> {
  if (input.pendingEvent || input.monthFinished) return { state: input, notes: [] };
  const d = input.profile.day;
  const notes: string[] = [];
  let s: T = { ...input };

  for (const inc of s.incomes) {
    if (inc.enabled && !inc.received && inc.day === d) {
      s = postTransaction(s, {
        day: d,
        amount: inc.amount,
        label: inc.label,
        category: "income",
        type: "need",
        source: "income",
      });
      s = { ...s, incomes: s.incomes.map((i) => (i.id === inc.id ? { ...i, received: true } : i)) };
      notes.push(`${inc.label} arrived.`);
    }
  }

  for (const c of s.commitments) {
    const due = (c.status === "pending" && c.dueDay === d) || c.status === "late";
    if (!due) continue;
    if (s.balance >= c.amount) {
      s = postTransaction(s, {
        day: d,
        amount: -c.amount,
        label: c.label,
        category: "bills",
        type: "need",
        source: "bill",
      });
      s = {
        ...s,
        commitments: s.commitments.map((x) =>
          x.id === c.id ? { ...x, status: "paid" as const } : x,
        ),
      };
    } else if (c.status === "pending") {
      s = postTransaction(s, {
        day: d,
        amount: -LATE_FEE,
        label: `Late fee: ${c.label}`,
        category: "bills",
        type: "need",
        source: "bill",
      });
      s = {
        ...s,
        commitments: s.commitments.map((x) =>
          x.id === c.id ? { ...x, status: "late" as const } : x,
        ),
      };
      notes.push(`${c.label} is late. A ₹${LATE_FEE} fee was charged; it will retry tomorrow.`);
    }
  }

  for (const sub of s.subscriptions) {
    if (sub.active && !sub.charged && sub.renewDay === d) {
      s = postTransaction(s, {
        day: d,
        amount: -sub.amount,
        label: sub.label,
        category: "subscriptions",
        type: "want",
        source: "subscription",
      });
      s = {
        ...s,
        subscriptions: s.subscriptions.map((x) => (x.id === sub.id ? { ...x, charged: true } : x)),
      };
    }
  }

  for (const g of s.goals) {
    if (g.contributed || g.contributionDay !== d) continue;
    const amt = Math.max(
      0,
      Math.min(g.plannedThisMonth, g.target - g.saved, Math.max(0, s.balance)),
    );
    const goals: Goal[] = s.goals.map((x) =>
      x.id === g.id ? { ...x, saved: x.saved + amt, contributed: true } : x,
    );
    s = { ...s, goals };
    if (amt > 0) {
      s = postTransaction(s, {
        day: d,
        amount: -amt,
        label: `${g.label} goal`,
        category: "goals",
        type: "need",
        source: "goal",
      });
      if (g.saved + amt >= g.target) notes.push(`${g.label} goal reached! 🎉`);
    }
  }

  const spentWant = s.transactions.some(
    (t) => t.day === d && t.source === "manual" && t.type === "want",
  );
  const history = [...s.balanceHistory];
  history[d] = s.balance;
  s = { ...s, streak: spentWant ? 0 : s.streak + 1, balanceHistory: history };

  if (d >= MONTH_DAYS) {
    s = { ...s, monthFinished: true };
    notes.push("Month complete. Your report is ready.");
    return { state: s, notes };
  }

  const next = d + 1;
  const ev: ShockEvent | null = maybeEvent(s.profile.seed, next);
  s = { ...s, profile: { ...s.profile, day: next }, pendingEvent: ev };
  return { state: s, notes };
}

/** Applies a shock-event response. */
export function resolveEvent<T extends MonthState>(
  input: T,
  responseId: "pay" | "goal" | "borrow",
): T {
  const ev = input.pendingEvent;
  if (!ev) return input;
  const d = input.profile.day;
  let s: T = { ...input, pendingEvent: null };

  if (ev.cost < 0) {
    const gift = -ev.cost;
    if (responseId === "pay") {
      s = postTransaction(s, {
        day: d,
        amount: gift,
        label: ev.title,
        category: "events",
        type: "need",
        source: "event",
      });
    } else if (responseId === "goal") {
      const goal = s.goals.find((g) => g.saved < g.target);
      if (goal) {
        const take = Math.min(gift, goal.target - goal.saved);
        s = {
          ...s,
          goals: s.goals.map((g) => (g.id === goal.id ? { ...g, saved: g.saved + take } : g)),
        };
        if (gift - take > 0)
          s = postTransaction(s, {
            day: d,
            amount: gift - take,
            label: ev.title,
            category: "events",
            type: "need",
            source: "event",
          });
      } else {
        s = postTransaction(s, {
          day: d,
          amount: gift,
          label: ev.title,
          category: "events",
          type: "need",
          source: "event",
        });
      }
    } else {
      s = postTransaction(s, {
        day: d,
        amount: gift,
        label: ev.title,
        category: "events",
        type: "need",
        source: "event",
      });
      const nextBill = [...s.commitments]
        .filter((c) => c.status === "pending" || c.status === "late")
        .sort((a, b) => a.dueDay - b.dueDay)[0];
      if (nextBill && s.balance >= nextBill.amount) {
        s = postTransaction(s, {
          day: d,
          amount: -nextBill.amount,
          label: nextBill.label,
          category: "bills",
          type: "need",
          source: "bill",
        });
        s = {
          ...s,
          commitments: s.commitments.map((c) =>
            c.id === nextBill.id ? { ...c, status: "paid" as const } : c,
          ),
        };
      }
    }
  } else if (responseId === "pay") {
    s = postTransaction(s, {
      day: d,
      amount: -ev.cost,
      label: ev.title,
      category: "events",
      type: "need",
      source: "event",
    });
  } else if (responseId === "goal") {
    let remaining = ev.cost;
    const goals = [...s.goals]
      .sort((a, b) => b.saved - a.saved)
      .map((g) => {
        const take = Math.min(remaining, g.saved);
        remaining -= take;
        return { ...g, saved: g.saved - take };
      });
    s = { ...s, goals: s.goals.map((g) => goals.find((x) => x.id === g.id) ?? g) };
    if (remaining > 0)
      s = postTransaction(s, {
        day: d,
        amount: -remaining,
        label: `${ev.title} (rest)`,
        category: "events",
        type: "need",
        source: "event",
      });
  } else {
    s = {
      ...s,
      commitments: [
        ...s.commitments,
        {
          id: uid("c"),
          label: `Repay: ${ev.title}`,
          amount: ev.cost,
          dueDay: Math.min(MONTH_DAYS, d + 7),
          status: "pending" as const,
        },
      ],
    };
  }

  s = {
    ...s,
    eventLog: [
      ...s.eventLog,
      { eventId: ev.id, title: ev.title, responseId, day: d, cost: ev.cost },
    ],
  };
  const label = ev.responses.find((r) => r.id === responseId)?.label ?? responseId;
  return recordDecision(input, s, `${ev.title}: ${label.toLowerCase()}`);
}
