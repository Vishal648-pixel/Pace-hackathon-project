import type { Goal, GoalEta, MonthState } from "./types";
import { forecastDay30 } from "./forecast";
import { daysLeft, MONTH_DAYS } from "./util";

/**
 * ETA at the current pace. Pace = this month's planned contribution spread over the month,
 * plus an even share of any projected surplus above the buffer floor.
 */
export function goalEta(state: MonthState, goal: Goal): GoalEta {
  const d = state.profile.day;
  const left = goal.target - goal.saved;
  if (left <= 0) return { reachable: true, rawDay: d, text: "Reached 🎉" };
  const activeGoals = Math.max(1, state.goals.filter((g) => g.saved < g.target).length);
  const surplus = Math.max(0, forecastDay30(state) - state.profile.bufferFloor) / activeGoals;
  const remainingPlanned = goal.contributed ? 0 : goal.plannedThisMonth;
  const perDay = (remainingPlanned + surplus) / daysLeft(d);
  if (perDay <= 0) return { reachable: false, rawDay: null, text: "Not reachable this month" };
  const rawDay = Math.ceil(d - 1 + left / perDay);
  if (rawDay > MONTH_DAYS) return { reachable: false, rawDay, text: "Not reachable this month" };
  return { reachable: true, rawDay, text: `Day ${Math.max(d, rawDay)}` };
}
