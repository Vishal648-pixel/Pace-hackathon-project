import { describe, expect, it } from "vitest";
import {
  addManualTransaction,
  deleteTransaction,
  freshSeed,
  goalEta,
  gradeMonth,
  healthScore,
  moveToGoal,
  riskScore,
  PERSONAS,
  buildState,
} from "./index";

describe("grading", () => {
  it("maps health score to letter grades", () => {
    expect(gradeMonth(80, 100)).toBe("A");
    expect(gradeMonth(60, 100)).toBe("B");
    expect(gradeMonth(40, 100)).toBe("C");
    expect(gradeMonth(10, 100)).toBe("D");
  });
  it("a negative balance is always a D", () => {
    expect(gradeMonth(99, -1)).toBe("D");
  });
});

describe("transactions", () => {
  it("rejects invalid amounts", () => {
    const s = freshSeed();
    expect(addManualTransaction(s, { amount: NaN, category: "food", type: "want" })).toBe(s);
    expect(addManualTransaction(s, { amount: 0, category: "food", type: "want" })).toBe(s);
  });
  it("add then delete restores the balance", () => {
    const s = freshSeed();
    const a = addManualTransaction(s, { amount: 250, category: "food", type: "want" });
    expect(a.balance).toBe(s.balance - 250);
    expect(deleteTransaction(a, a.transactions[0]!.id).balance).toBe(s.balance);
  });
});

describe("goals", () => {
  it("never moves more than the goal still needs", () => {
    const s = freshSeed();
    const g = s.goals[0]!;
    const r = moveToGoal(s, g.id, 1_000_000);
    expect(r.moved).toBeLessThanOrEqual(g.target - g.saved);
    expect(r.state.balance).toBe(s.balance - r.moved);
  });
  it("produces an ETA text for every goal", () => {
    const s = freshSeed();
    for (const g of s.goals) expect(goalEta(s, g).text.length).toBeGreaterThan(0);
  });
});

describe("scores", () => {
  it("every persona starts with ₹10,000 and bounded scores", () => {
    for (const p of Object.values(PERSONAS)) {
      const s = buildState(p, "T", 1);
      expect(s.balance).toBe(10000);
      const h = healthScore(s).score;
      const r = riskScore(s).score;
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(100);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(100);
    }
  });
});
