import type { Category, SpendCategory } from "@/engine";

export const CATEGORY_META: Record<Category, { label: string; emoji: string; color: string }> = {
  food: { label: "Food", emoji: "🍜", color: "var(--chart-4)" },
  transport: { label: "Transport", emoji: "🚌", color: "var(--chart-5)" },
  fun: { label: "Fun", emoji: "🎮", color: "var(--chart-1)" },
  shopping: { label: "Shopping", emoji: "🛍️", color: "var(--chart-3)" },
  health: { label: "Health", emoji: "💊", color: "var(--chart-2)" },
  other: { label: "Other", emoji: "✨", color: "var(--chart-6)" },
  bills: { label: "Bills", emoji: "🧾", color: "var(--chart-5)" },
  subscriptions: { label: "Subscriptions", emoji: "🔁", color: "var(--chart-1)" },
  goals: { label: "Goals", emoji: "🎯", color: "var(--chart-2)" },
  events: { label: "Surprises", emoji: "⚡", color: "var(--chart-3)" },
  income: { label: "Income", emoji: "💸", color: "var(--chart-2)" },
};

export const QUICK_ADD: { category: SpendCategory; amount: number; type: "need" | "want" }[] = [
  { category: "food", amount: 120, type: "need" },
  { category: "transport", amount: 40, type: "need" },
  { category: "fun", amount: 200, type: "want" },
  { category: "shopping", amount: 350, type: "want" },
  { category: "health", amount: 150, type: "need" },
  { category: "other", amount: 100, type: "want" },
];
