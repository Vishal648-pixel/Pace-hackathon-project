import { describe, expect, it } from "vitest";
import {
  advanceDay,
  applyScenario,
  buildState,
  dailyAllowance,
  freshSeed,
  maybeEvent,
  PERSONAS,
  safeToSpend,
  computeMetrics,
  compareScenario,
} from "./index";

describe("engine", () => {
  it("day 1 starter data without gig gives safe-to-spend 2634 and ≈88/day", () => {
    const s = freshSeed();
    expect(safeToSpend(s)).toBe(2634);
    expect(dailyAllowance(s)).toBeCloseTo(87.8, 1);
  });

  it("same seed gives the same events", () => {
    const a = Array.from({ length: 30 }, (_, i) => maybeEvent(42, i + 1)?.title ?? null);
    const b = Array.from({ length: 30 }, (_, i) => maybeEvent(42, i + 1)?.title ?? null);
    expect(a).toEqual(b);
  });

  it("simulating a ₹500 purchase changes only the clone", () => {
    const s = freshSeed();
    const { state: after } = applyScenario(s, {
      kind: "purchase",
      amount: 500,
      day: 1,
      label: "Shoes",
    });
    expect(after.balance).toBe(s.balance - 500);
    expect(s.balance).toBe(10000);
    expect(s.transactions).toHaveLength(0);
  });

  it("cancelling Netflix raises forecast and health", () => {
    const s = freshSeed();
    const c = compareScenario(s, { kind: "cancelSubscription", subscriptionId: "s_netflix" });
    expect(c.after.forecast).toBeGreaterThan(c.before.forecast);
    expect(c.after.health.score).toBeGreaterThan(c.before.health.score);
  });

  it("advance day posts gym and never produces NaN", () => {
    let s = buildState(PERSONAS.student, "Test", 7);
    for (let i = 0; i < 40; i++) {
      if (s.pendingEvent) s = { ...s, pendingEvent: null };
      s = advanceDay(s).state;
    }
    expect(s.monthFinished).toBe(true);
    const m = computeMetrics(s);
    expect(Number.isFinite(m.forecast)).toBe(true);
    expect(Number.isFinite(m.risk.score)).toBe(true);
  });
});
