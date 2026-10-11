import type { ShockEvent, ShockResponse } from "./types";
import { dayRandom } from "./rng";

export const SHOCK_CHANCE = 0.15;

export const SHOCK_DECK: { key: string; title: string; cost: number }[] = [
  { key: "screen", title: "Cracked phone screen", cost: 1800 },
  { key: "birthday", title: "Friend's birthday", cost: 600 },
  { key: "travel", title: "Sudden trip home", cost: 900 },
  { key: "medical", title: "Medical visit", cost: 700 },
  { key: "gift", title: "Cash gift from family", cost: -500 },
];

const COST_RESPONSES: ShockResponse[] = [
  { id: "pay", label: "Pay from balance", description: "Covers it now from your spending money." },
  {
    id: "goal",
    label: "Dip into a goal",
    description: "Takes it from your savings, goals slow down.",
  },
  {
    id: "borrow",
    label: "Borrow or delay",
    description: "Pay it back in 7 days, adds a commitment.",
  },
];

const GIFT_RESPONSES: ShockResponse[] = [
  { id: "pay", label: "Keep in balance", description: "Adds the gift to your spending money." },
  { id: "goal", label: "Send to a goal", description: "Moves it straight into your savings." },
  { id: "borrow", label: "Repay early", description: "Uses it to pay your next bill sooner." },
];

/** Deterministic: the same seed and day always give the same event (or none). */
export function maybeEvent(seed: number, day: number): ShockEvent | null {
  const r = dayRandom(seed, day);
  if (r() >= SHOCK_CHANCE) return null;
  const pick = SHOCK_DECK[Math.floor(r() * SHOCK_DECK.length)];
  if (!pick) return null;
  return {
    id: `ev_${pick.key}_${day}`,
    day,
    title: pick.title,
    cost: pick.cost,
    responses: pick.cost > 0 ? COST_RESPONSES : GIFT_RESPONSES,
  };
}
