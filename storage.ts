import type { PaceState } from "@/engine";

export const STORAGE_KEY = "pace:v1";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Structural check so corrupted or tampered storage never reaches the UI. */
export function isValidState(v: unknown): v is PaceState {
  if (!isObj(v) || v["version"] !== 1 || typeof v["started"] !== "boolean") return false;
  const p = v["profile"];
  if (
    !isObj(p) ||
    !isNum(p["day"]) ||
    p["day"] < 1 ||
    p["day"] > 30 ||
    !isNum(p["seed"]) ||
    !isNum(p["bufferFloor"]) ||
    typeof p["name"] !== "string"
  )
    return false;
  if (!isNum(v["balance"])) return false;
  for (const k of [
    "incomes",
    "commitments",
    "subscriptions",
    "goals",
    "transactions",
    "eventLog",
    "balanceHistory",
    "decisions",
    "savedScenarios",
    "undoStack",
  ]) {
    if (!Array.isArray(v[k])) return false;
  }
  return true;
}

export function loadState(): PaceState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveState(state: PaceState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or disabled: progress stays in memory for this session.
  }
}

export function clearState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
