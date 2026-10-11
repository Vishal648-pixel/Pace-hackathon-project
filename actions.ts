import type { Category, Goal, MonthState, Transaction } from "./types";
import { uid } from "./rng";
import { healthScore } from "./health";

/** Pure helper: returns a new state with a transaction applied to balance and history. */
export function postTransaction<T extends MonthState>(state: T, tx: Omit<Transaction, "id">): T {
  const t: Transaction = { ...tx, id: uid("tx") };
  return { ...state, balance: state.balance + t.amount, transactions: [t, ...state.transactions] };
}

export function addManualTransaction<T extends MonthState>(
  state: T,
  input: { amount: number; category: Category; type: "need" | "want"; label?: string },
): T {
  const amount = Math.abs(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return state;
  return postTransaction(state, {
    day: state.profile.day,
    amount: -amount,
    label: input.label?.trim() || input.category,
    category: input.category,
    type: input.type,
    source: "manual",
  });
}

export function deleteTransaction<T extends MonthState>(state: T, id: string): T {
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) return state;
  return {
    ...state,
    balance: state.balance - tx.amount,
    transactions: state.transactions.filter((t) => t.id !== id),
  };
}

/** Moves money from balance to a goal, capped at what the goal still needs and what you have. */
export function moveToGoal<T extends MonthState>(
  state: T,
  goalId: string,
  amount: number,
): { state: T; moved: number; reached: boolean } {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal || !Number.isFinite(amount) || amount <= 0) return { state, moved: 0, reached: false };
  const moved = Math.max(0, Math.min(amount, goal.target - goal.saved, Math.max(0, state.balance)));
  if (moved === 0) return { state, moved: 0, reached: goal.saved >= goal.target };
  const goals: Goal[] = state.goals.map((g) =>
    g.id === goalId ? { ...g, saved: g.saved + moved } : g,
  );
  const next = postTransaction(
    { ...state, goals },
    {
      day: state.profile.day,
      amount: -moved,
      label: `${goal.label} goal`,
      category: "goals",
      type: "need",
      source: "goal",
    },
  );
  return { state: next, moved, reached: goal.saved + moved >= goal.target };
}

export function recordDecision<T extends MonthState>(
  before: MonthState,
  after: T,
  label: string,
): T {
  const decision = {
    id: uid("dec"),
    day: before.profile.day,
    label,
    moneyImpact: after.balance - before.balance,
    healthImpact: healthScore(after).score - healthScore(before).score,
  };
  return { ...after, decisions: [...after.decisions, decision] };
}
