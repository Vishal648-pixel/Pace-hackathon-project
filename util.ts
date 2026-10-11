export const MONTH_DAYS = 30;

export const clamp = (n: number, min: number, max: number): number =>
  Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;

export const round = (n: number, dp = 0): number => {
  const f = 10 ** dp;
  return Number.isFinite(n) ? Math.round(n * f) / f : 0;
};

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

export function daysLeft(day: number): number {
  return Math.max(1, MONTH_DAYS - day + 1);
}

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Formats a number as ₹ with Indian grouping. Never returns NaN. */
export function formatINR(n: number, opts: { sign?: boolean } = {}): string {
  const v = Number.isFinite(n) ? Math.round(n) : 0;
  const s = `₹${inr.format(Math.abs(v))}`;
  if (v < 0) return `−${s}`;
  if (opts.sign && v > 0) return `+${s}`;
  return s;
}
